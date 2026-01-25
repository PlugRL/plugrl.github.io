## 自定义策略

PlugRL 的策略发现机制是“**import 时注册**”：模块被 import 时，注册装饰器会把策略/配置写入 registry，随后 server CLI 才能看到它。

因此会自然分成两类：

- **内置策略**：随 `plugrl-server` 提供，并会被自动 import。
- **自定义策略**：可以做到即插即用——代码写在你自己的包里，只要在启动 server 前 import 一次即可。

实现一个新策略一般需要：

1. 写一个策略配置（dataclass，供 Tyro CLI 暴露参数）。
2. 实现一个 `BasePolicy` 子类。
3. 完成注册，并确保模块会被 import（这样 CLI 才能发现它）。

SAC 的示例写法可以直接参考 `plugrl-server/examples/sac/sac_policy.py`。

### 代码放哪里

你可以按需求选择两种方式。

#### 方式 A：贡献到 `plugrl-server`

在 `plugrl-server/src/plugrl_server/policy/<your_policy>/...`：

- 实现：`plugrl_server/policy/<your_policy>/<your_policy>_policy.py`
- 注册（import 时完成注册）：`plugrl_server/policy/<your_policy>/__init__.py`
- 记得从 `plugrl_server/policy/__init__.py` 导入你的模块（保证 `import plugrl_server` 会加载它）

#### 方式 B：作为外部插件包（不需要改 `plugrl-server`）

- 把策略代码放在你自己的 Python 包里（例如 `my_pkg/plugrl_policies.py`）。
- 确保在构建 server CLI 之前先 import 你的模块。

本质上，“接入动作”就是这一句 import。

### 最小模板

```python
import dataclasses

from plugrl_server.policy.base_policy import BasePolicy, BasePolicyConfig, InternalState
from plugrl_server.policy.registration import register_policy, register_policy_config

UID = "your-policy"


@register_policy_config(UID)
@dataclasses.dataclass
class YourPolicyConfig(BasePolicyConfig):
	# 填你策略需要的参数
	...


@register_policy(UID)
class YourPolicy(BasePolicy):
	def prepare_observation(self, _obs: dict):
		# 把 worker 发送的观测 dict 转为 tensor / tensordict
		...

	def get_action_and_internal_state(self, _obs: dict):
		# 返回动作（numpy 或 tensor）+ InternalState
		...

	def fake_internal_state(self, batch_size: int) -> InternalState:
		# 构造形状/类型正确的 InternalState（用于 buffer/训练）
		...
```

### 说明

- policy 本身不会“单独运行”，它会被算法调用；需要往 `InternalState` 里放什么字段，取决于你的算法。
- 想看一个完整、最小可跑的策略实现，SAC policy 是最直接的参考。

### 配合 SAC 示例对齐接口

SAC 的 policy 侧实现很紧凑，主要看这些点：

- **注册方式**：`SACPolicyConfig` 用 UID `"sac_policy"` 注册，`SACPolicy` 也用同一个 UID 注册。
- **观测约定**：`prepare_observation()` 读取 `obs["states"]["obs"]`，转成 `torch.Tensor`，并放到 policy 的 device 上。
- **动作形状**：`get_action_and_internal_state()` 返回动作的形状是 `[B, 1, action_dim]`。实现里用 `action_numpy[:, None]` 补出中间这一维。
- **warmup 随机动作**：算法在 `learning_starts` 之前会要求策略走随机采样，通过传 `random_sample` 标志位实现。
- **InternalState 怎么用**：SAC 只会把 `internal_state.obs` 和 `internal_state.action` 写进 replay buffer。`logprob/entropy/value` 在 SAC 里不参与更新，但保留字段能让 `InternalState` 结构稳定，便于复用 buffer 和接口。

### 验证方式

把 `dummy` 当作联通性 smoke test：先确认你的 policy 能出现在 server CLI 里、并且 server/worker 闭环能跑起来。

如果你的策略在外部包里，一个最小可用的方式是“先 import，再把参数交给官方入口”：

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
	dummy default <your-policy> default
```

然后启动 worker：

```bash
plugrl-run-worker dummy-v1 --num-episodes 1
```

跑通后再替换成你的目标算法/环境，逐步对齐动作形状、性能与训练逻辑。
