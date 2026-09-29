# 自定义策略

把一个新策略接入 `plugrl-server`，让它能被 `plugrl-run-server` 通过 UID 选择。

策略通过 import 时注册被发现。

## 快速开始

实现一个 config dataclass 与一个 `BasePolicy` 子类，并注册它们。

```py
import dataclasses

from plugrl_server.policy.base_policy import (
    BasePolicy,
    BasePolicyConfig,
    PolicyRuntimeState,
)
from plugrl_server.policy.registration import register_policy, register_policy_config

UID = "your-policy"


@register_policy_config(UID)
@dataclasses.dataclass
class YourPolicyConfig(BasePolicyConfig):
    ...


@register_policy(UID)
class YourPolicy(BasePolicy):
    def __init__(self, config: YourPolicyConfig):
        super().__init__(config)
        self.action_dim = ...
        self.action_horizon = ...

    def prepare_observation(self, obs: dict):
        ...

    def get_action_and_runtime_state(self, obs: dict):
        ...

    def fake_runtime_state(self, batch_size: int) -> PolicyRuntimeState:
        ...
```

如果是 torch 模型，改为继承 `plugrl_server.policy.base_torch_policy` 里的
`BaseTorchPolicy` 和 `BaseTorchPolicyConfig`。这样策略本身就是 `torch.nn.Module`，
有保存 checkpoint 需要的 `state_dict()`，还会多一个 `--policy.device` 参数。

参考实现：`plugrl-server/examples/sac/sac_policy.py`。

## 代码放哪里

直接放进 `plugrl-server`。

- `plugrl_server/policy/<policy_uid>/...`
- 在 `plugrl_server/policy/__init__.py` 里 import

放在你自己的包里。

- 策略代码放进你的 Python 包
- 进入 `plugrl_server.cli:main` 前先 import

## 验证

先看 CLI。

```bash
plugrl-run-server --help
```

外部包策略用 import 启动。

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
  your-policy default dummy default
```

## 约定 {#contract}

- `prepare_observation` 把 worker 观测 dict 转成 `NumpyState`，也就是 `np.ndarray`
  或它们的嵌套 mapping；转张量由 `BaseTorchPolicy.extract_model_obs_tensor` 负责
- `get_action_and_runtime_state` 返回动作与 `PolicyRuntimeState`
- 动作是 batch 在前、带 horizon 轴的 `(B, H, ...)`。server 发给 client 之前会交换前
  两个轴。一次只出一步动作的策略返回 `(B, 1, D)`，`gaussian-policy` 就是用
  `action[:, None, :]` 做到的
- 在 `__init__` 里设置 `action_dim` 和 `action_horizon`。server 会把这两个值放进
  metadata 消息发给 client。不设也能跑，但消息里就没有这两项，每个 client 都得
  手工告诉它动作形状
- runtime state 必须能按 batch 切片。server 会按环境把它切开：dataclass 和 dict
  逐字段切，其他类型按 `state[i:i+1]` 切。数组、张量和 `None` 都可以
- `fake_runtime_state` 返回能用于 buffer 预分配的形状与 dtype，算法通过
  `example_train_state` 调用它来确定 buffer 大小
- `PolicyRuntimeState` 是类型别名而不是基类：dict、dataclass 或 `None` 都可以，
  按算法需要返回

## 常见问题

- CLI 找不到 UID：模块没有被 import。
- 训练时 shape 对不上：infer 与训练路径的动作形状必须一致。
- runtime state 字段缺失：与算法写入 buffer 的字段对齐。
- device 与 dtype 漂移：观测张量放到 `self.device` 并统一 dtype。

## 下一步

- [策略](index.zh.md)
- [自定义算法](../algorithm/custom_algorithm.zh.md)
