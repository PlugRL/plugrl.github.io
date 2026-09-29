# 自定义算法

把一个新算法接入 `plugrl-server`，让它能被 `plugrl-run-server` 通过 UID 选择。

## 快速开始

1. 在 `plugrl-server/src/plugrl_server/algorithm/<algo_uid>/` 下新建包。
2. 注册一个配置 dataclass 和一个算法类。
3. 确保 server 启动时这两个模块都会被 import，Tyro 才能发现它们。

参考实现：`plugrl-server/examples/sac/sac.py`，一个 off-policy 的 SAC，配套策略在
`sac_policy.py`。在 `plugrl-server` 目录下用
`python examples/sac/sac.py sac_policy default sac default` 运行。

## 文件结构 {#file-layout}

下面两种组织方式都可以。

### 直接放进 `plugrl-server`

- `plugrl_server/algorithm/<algo_uid>/<algo_uid>_config.py`：配置 dataclass，用
  `@register_algo_config` 注册
- `plugrl_server/algorithm/<algo_uid>/<algo_uid>.py`：算法类，用 `@register_algo` 注册
- `plugrl_server/algorithm/__init__.py`：把这两个模块都 import 进来

两个都要 import。只 import 配置模块的话，UID 会出现在 CLI 里，但运行时打印完配置
就报 `KeyError: 'Algorithm <algo_uid> is not registered.'`。像
`examples/sac/sac.py` 那样把两个装饰器放在同一个模块里也可以。

### 放在你自己的包里

- 算法代码放进你自己的 Python 包。
- 进入 `plugrl_server.cli:main` 之前先 import，配置和类都要。

## Server 调用契约

WebSocket server loop 会调用这些方法。

- `infer(obs) -> (action, runtime_state)`：每批环境调用一次。
- `derive_train_state(runtime_state) -> train_state`：每次 `infer` 之后紧接着调用，
  默认返回 `None`。结果按环境切开，再作为 `feedback(train_state=...)` 传回来。
  `example_train_state(n)` 会拿 `policy.fake_runtime_state(n)` 调它，内置算法就是
  这样确定 buffer 大小的。
- `feedback(...) -> (prev_node, global_step, log_dict)`：只对要存下来的帧调用。
- `discard_feedback(*, info, next_terminated, next_truncated)`：其余每一帧都走这里。
  默认实现只记录已结束 episode 的指标。覆写时要调用
  `super().discard_feedback(...)`，否则这些 episode 不会出现在 `rollout/*` 里。
- `learn() -> (global_step, log_dict)`：前面调 `pre_learn()`，后面调
  `post_learn()`。基类的 `post_learn` 会清空 episode 指标，覆写时应调用
  `super().post_learn()`。
- 调度与保存：`should_learn`、`should_save`、`should_stop`、`create_checkpoint`

另外两个由 CLI 在 server 启动前调用。

- `init_optimizers()`：算法构建完立刻调用，默认什么也不做。`dppo` 在这里构建优化器。
- `load_checkpoint(checkpoint)`：带 `--resume` 启动时调用。

还有一个类属性。

- `on_policy: bool = True`。只有动作出自当前策略、并且 `should_learn()` 为假的帧，
  server 才会交给 `feedback`，其余都交给 `discard_feedback`。从 replay buffer
  学习的算法把 `on_policy` 设为 `False`，就能拿到每一个带 step state 的帧，SAC
  示例就是这样。见[训练循环](ppo.zh.md#what-happens-on-the-server)。

这个循环对各个钩子意味着什么。

- `should_learn()` 为真时 server 不做推理。如果 `learn()` 之后它仍然为真，server
  会接着再 learn 一次，中间不推理。所以 `learn()` 或 `post_learn()` 必须清空
  buffer，或者推进 `should_learn` 所依据的计数。
- `should_save()` 和 `should_stop()` 在循环每转一圈时都会检查，而不是每次 learn
  才查一次。`create_checkpoint()` 执行之后 `should_save()` 必须变回假。内置算法都在
  `create_checkpoint` 里记下已保存的轮数。

准确签名见 `plugrl_server/algorithm/base_algorithm.py`。server 调用的是
`learn()`，但 `learn()` 在 `BaseAlgorithm` 上已经实现了：它调用 `learn_impl()`
再用 `build_train_info` 包一层结果，`rollout/*` 指标就是在这里加上的。抽象方法是
`learn_impl`，要覆写的是它。覆写 `learn` 会让 `learn_impl` 悬空、类仍然是抽象的，
`make_algo` 会直接抛 `TypeError`。

`infer` 与 `feedback` 收发的是 `plugrl_server.policy.state` 里的
`PolicyRuntimeState`，`feedback` 还要接 `train_state: PolicyTrainState = None`。
旧模板里用过 `InternalState` 和 `get_action_and_internal_state`，这两个都不存在。
`feedback` 的每个参数都是 keyword-only，所以名字对不上会在 server 第一次调用时
直接 `TypeError`，不会被悄悄当成改名放过。

## 最小模板

```py
import dataclasses

import numpy as np

from plugrl_server.algorithm.base_algorithm import BaseAlgoConfig, BaseAlgorithm
from plugrl_server.algorithm.registration import register_algo, register_algo_config
from plugrl_server.common.checkpoint_manager import Checkpoint
from plugrl_server.policy.base_torch_policy import BaseTorchPolicy
from plugrl_server.policy.state import PolicyRuntimeState, PolicyTrainState

UID = "your-algo"


@register_algo_config(UID)
@dataclasses.dataclass
class YourAlgoConfig(BaseAlgoConfig):
    # The run length is BaseAlgoConfig's field, set with --algo.global-steps.
    global_steps: int | None = 100_000


@register_algo(UID)
class YourAlgorithm(BaseAlgorithm):
    # Set to False if the algorithm learns from a replay buffer.
    on_policy = True

    def __init__(self, config: YourAlgoConfig, policy: BaseTorchPolicy):
        super().__init__(config=config, policy=policy)
        self.global_step = 0

    def infer(self, obs: dict) -> tuple[np.ndarray, PolicyRuntimeState]:
        action, runtime_state = self.policy.get_action_and_runtime_state(obs)
        return action, runtime_state

    def feedback(
        self,
        *,
        obs: dict,
        runtime_state: PolicyRuntimeState,
        train_state: PolicyTrainState = None,
        terminated: bool,
        truncated: bool,
        next_obs: dict,
        reward: float,
        info: dict,
        next_terminated: bool,
        next_truncated: bool,
        prev_node: tuple,
    ) -> tuple[tuple, int, dict]:
        # Store the frame here.
        if (next_terminated or next_truncated) and "episode" in info:
            if bool(info["episode"].get("mask", True)):
                # Without this, rollout/success, reward and length stay 0.
                self.record_episode_metrics(info["episode"])
        self.global_step += 1
        return prev_node, self.global_step, {}

    def learn_impl(self) -> tuple[int, dict]:
        return self.global_step, {}

    def should_learn(self) -> bool:
        return False

    def should_stop(self) -> bool:
        return self.global_step >= self.config.global_steps

    def should_save(self) -> bool:
        return False

    def create_checkpoint(self) -> Checkpoint:
        # state_dict() exists because a BaseTorchPolicy is a torch.nn.Module.
        return Checkpoint(step=self.global_step, model=self.policy.state_dict(), optimizer=None, meta={})

    def load_checkpoint(self, checkpoint: Checkpoint) -> None:
        self.global_step = checkpoint.step
        if checkpoint.model is not None:
            self.policy.load_state_dict(checkpoint.model)
```

## 设计规则

- 模型结构与动作生成参数放在 policy config。
- 运行长度用 `BaseAlgoConfig.global_steps`，不要另起一个字段。进度显示读的就是它。
- `learn()` 用外部数据时，显式维护环境步数与更新步数。
- 训练调度相关计数写进 `Checkpoint.meta`，并在 `load_checkpoint` 恢复。
- 不写分布式钩子就用 `BaseAlgorithm`，不要直接上 `DDPAlgorithm`。

## 验证

先跑一个 smoke test。

```bash
plugrl-run-server dummy-policy default your-algo default
plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 1
```

如果算法在外部包里，先 import 再进入 CLI。

```bash
python -c "import my_pkg.plugrl_algorithms; from plugrl_server.cli import main; main()" \
  dummy-policy default your-algo default
```

## 常见问题

- `plugrl-run-server <policy> <variant> --help` 里找不到 UID：模块没有被 import。
- 打印完配置后报 `KeyError: 'Algorithm your-algo is not registered.'`：只 import 了配置模块，类所在的模块没 import。
- `rollout/*` 一直是 0：`feedback` 没调用 `record_episode_metrics`。如果只是少了一部分 episode，是覆写的 `discard_feedback` 没调用 `super()`。
- server 反复 learn、不再推理：`learn()` 之后 `should_learn()` 仍然为真。
- 循环每转一圈都写一次 checkpoint：`create_checkpoint()` 之后 `should_save()` 还是真。
- `--algo.*` 和 `--policy.*` 出现重复语义参数：保留一侧即可。
- resume 后学习频率或保存周期漂移：从 `Checkpoint.meta` 恢复所有计数。
- `DDPAlgorithm` 运行时报错：改用 `BaseAlgorithm`，或补齐分布式钩子。

## 下一步

- [算法概览](index.zh.md)
- [训练循环](ppo.zh.md)
- [自定义策略](../policy/custom_policy.zh.md)
- [自定义环境](../env/custom_env.zh.md)
