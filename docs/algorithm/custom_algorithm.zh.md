# 自定义算法

把一个新算法接入 `plugrl-server`，让它能被 `plugrl-run-server` 通过 UID 选择。

## 快速开始

1. 在 `plugrl-server/src/plugrl_server/algorithm/<algo_uid>/` 下新建包。
2. 注册一个配置 dataclass 和一个算法类。
3. 确保 server 启动时会 import 该模块，Tyro 才能发现它。

参考实现：`plugrl-server/examples/sac/sac.py`。

## 文件结构

下面两种组织方式都可以。

### 直接放进 `plugrl-server`

- `plugrl_server/algorithm/<algo_uid>/<algo_uid>.py` 实现
- `plugrl_server/algorithm/<algo_uid>/__init__.py` 注册导入
- `plugrl_server/algorithm/__init__.py` 导入你的包

### 放在你自己的包里

- 算法代码放进你自己的 Python 包。
- 进入 `plugrl_server.cli:main` 之前先 import 一次。

## Server 调用契约

WebSocket server loop 会调用这些方法。

- `infer(obs) -> (action, internal_state)`
- `feedback(...) -> (prev_node, global_step, log_dict)`
- `learn() -> (global_step, log_dict)`
- 调度与保存：`should_learn`、`should_save`、`should_stop`、`create_checkpoint`、`load_checkpoint`

准确签名见 `plugrl_server/algorithm/base_algorithm.py`。

## 最小模板

```py
import dataclasses

import numpy as np

from plugrl_server.algorithm.base_algorithm import BaseAlgoConfig, BaseAlgorithm
from plugrl_server.algorithm.registration import register_algo, register_algo_config
from plugrl_server.common.checkpoint_manager import Checkpoint
from plugrl_server.policy.base_policy import BasePolicy, InternalState

UID = "your-algo"


@register_algo_config(UID)
@dataclasses.dataclass
class YourAlgoConfig(BaseAlgoConfig):
    total_timesteps: int = 100_000


@register_algo(UID)
class YourAlgorithm(BaseAlgorithm):
    def __init__(self, config: YourAlgoConfig, policy: BasePolicy):
        super().__init__(config=config, policy=policy)
        self.global_step = 0

    def infer(self, obs: dict) -> tuple[np.ndarray, InternalState]:
        action, internal_state = self.policy.get_action_and_internal_state(obs)
        return action, internal_state

    def feedback(
        self,
        *,
        obs: dict,
        internal_state: InternalState | None,
        terminated: bool,
        truncated: bool,
        next_obs: dict,
        reward: float,
        info: dict,
        next_terminated: bool,
        next_truncated: bool,
        prev_node: tuple,
    ) -> tuple[tuple, int, dict]:
        self.global_step += 1
        return prev_node, self.global_step, {}

    def learn(self) -> tuple[int, dict]:
        return self.global_step, {}

    def should_learn(self) -> bool:
        return False

    def should_stop(self) -> bool:
        return self.global_step >= self.config.total_timesteps

    def should_save(self) -> bool:
        return False

    def create_checkpoint(self) -> Checkpoint:
        return Checkpoint(step=self.global_step, model=self.policy.state_dict(), optimizer=None, meta={})

    def load_checkpoint(self, checkpoint: Checkpoint) -> None:
        self.global_step = checkpoint.step
        if checkpoint.model is not None:
            self.policy.load_state_dict(checkpoint.model)
```

## 设计规则

- 模型结构与动作生成参数放在 policy config。
- `learn()` 用外部数据时，显式维护环境步数与更新步数。
- 训练调度相关计数写进 `Checkpoint.meta`，并在 `load_checkpoint` 恢复。
- 不写分布式钩子就用 `BaseAlgorithm`，不要直接上 `DDPAlgorithm`。

## 验证

先跑一个 smoke test。

```bash
plugrl-run-server dummy-policy default your-algo default
plugrl-run-env-client dummy-v1 --num-episodes 1
```

如果算法在外部包里，先 import 再进入 CLI。

```bash
python -c "import my_pkg.plugrl_algorithms; from plugrl_server.cli import main; main()" \
  dummy-policy default your-algo default
```

## 常见问题

- `plugrl-run-server --help` 里找不到 UID：模块没有被 import。
- `--algo.*` 和 `--policy.*` 出现重复语义参数：保留一侧即可。
- resume 后学习频率或保存周期漂移：从 `Checkpoint.meta` 恢复所有计数。
- `DDPAlgorithm` 运行时报错：改用 `BaseAlgorithm`，或补齐分布式钩子。

## 下一步

- [算法概览](index.zh.md)
- [训练循环](ppo.zh.md)
- [自定义策略](../policy/custom_policy.zh.md)
- [自定义环境](../env/custom_env.zh.md)
