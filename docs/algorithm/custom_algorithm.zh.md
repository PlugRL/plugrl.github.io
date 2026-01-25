## 自定义算法

要把一个新算法接入 `plugrl-server`，通常需要：

1. 写一个算法配置（dataclass，供 Tyro CLI 暴露参数）。
2. 实现一个 `BaseAlgorithm` 子类（infer / feedback / learn / checkpoint 等钩子）。
3. 完成注册，并确保模块会被 import（这样 CLI 才能发现它）。

一个最小、完整且能跑通训练闭环的参考实现是 SAC：`plugrl-server/examples/sac/sac.py`。

### 代码放哪里

在 `plugrl-server/src/plugrl_server/algorithm/<your_algo>/...`：

- 实现：`plugrl_server/algorithm/<your_algo>/<your_algo>.py`
- 注册（import 时完成注册）：`plugrl_server/algorithm/<your_algo>/__init__.py`
- 记得从 `plugrl_server/algorithm/__init__.py` 导入你的模块（保证 `import plugrl_server` 会加载它）

### Server 侧会调用什么

WebSocket server loop 会调用算法的这些方法：

- `infer(obs) -> (action, internal_state)`
- `feedback(...) -> (prev_node, global_step, log_dict)`
- `learn() -> (global_step, log_dict)`
- 以及调度/保存相关：`should_learn/should_save/should_stop`、`create_checkpoint/load_checkpoint`

你可以在 `plugrl_server/algorithm/base_algorithm.py` 看到抽象签名。

### 最小模板

```python
import dataclasses
import numpy as np

from plugrl_server.algorithm.base_algorithm import BaseAlgorithm, BaseAlgoConfig
from plugrl_server.algorithm.registration import register_algo, register_algo_config
from plugrl_server.common.checkpoint_manager import Checkpoint
from plugrl_server.policy.base_policy import BasePolicy, InternalState

UID = "your-algo"


@register_algo_config(UID)
@dataclasses.dataclass
class YourAlgoConfig(BaseAlgoConfig):
    # 训练调度
    total_timesteps: int = 100_000
    # 填你算法需要的超参
    ...


@register_algo(UID)
class YourAlgorithm(BaseAlgorithm):
    def __init__(self, config: YourAlgoConfig, policy: BasePolicy):
        super().__init__(config=config, policy=policy)
        self.global_step = 0

    def infer(self, obs: dict) -> tuple[np.ndarray, InternalState]:
        # 调用 policy 生成动作，并返回 InternalState 给 feedback/learn 使用
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
        # 消费 transition：写入 buffer、更新计数器、返回日志
        self.global_step += 1
        return prev_node, self.global_step, {}

    def learn(self) -> tuple[int, dict]:
        # 做更新并返回日志
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

### 说明（结合 SAC）

- SAC 把 replay buffer 放在算法内部；`infer()` 返回的 `InternalState` 会在 `feedback()` 里用来写入 buffer。
- SAC 在算法 `__init__` 里创建优化器，并在 `create_checkpoint()` 里保存 optimizer state dict。
- 如果你需要返回动作序列（action chunk），可以关注 `BaseAlgorithm.break_action_chunk` 的约定。

### 配合 SAC 示例对齐接口

`plugrl-server/examples/sac/sac.py` 适合用来对齐 server 侧的调用边界：

- **`infer()`**：调用 `policy.get_action_and_internal_state(obs, random_sample=...)`，同时返回动作和 `InternalState`。SAC 在 `learning_starts` 之前会走随机动作。
- **`feedback()`**：要求 `internal_state` 一定存在，然后把 transition 写入 replay buffer。SAC 的分工很明确：
    - 当前 `obs` 直接用 `internal_state.obs`。这部分已经由 policy 处理过。
    - `next_obs` 在算法里调用 `policy.prepare_observation(next_obs)` 处理。
- **训练调度**：
    - `should_learn()` 用 `learning_starts` 和 `update_every` 控制更新频率。
    - `learn()` 每次会做 `update_to_data_ratio * update_every` 次梯度更新。
    - `should_save()` 用 `save_interval` 控制 checkpoint 周期。
- **Checkpoint**：`create_checkpoint()` 保存 `policy.state_dict()`、优化器 state dict，再加一个 `meta`。SAC 在 `meta` 里保存 `last_*_step` 和 `update_counter`，用来继续跑时对齐内部计数。

buffer 和 loss 的实现完全取决于你的算法；但方法边界建议和这个例子一致。

### 验证方式

把 `dummy` 当作 smoke test：先确认你的算法能出现在 server CLI 里、并且 server/worker 闭环能跑起来。

```bash
plugrl-run-server <your-algo> default dummy-policy default
plugrl-run-worker dummy-v1 --num-episodes 1
```

跑通后再替换成你的目标环境/策略，完善 buffer、loss 与训练调度。
