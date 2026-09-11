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
    def prepare_observation(self, obs: dict):
        ...

    def get_action_and_runtime_state(self, obs: dict):
        ...

    def fake_runtime_state(self, batch_size: int) -> PolicyRuntimeState:
        ...
```

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

## 约定

- `prepare_observation` 把 worker 观测 dict 转成 `NumpyState`，也就是 `np.ndarray`
  或它们的嵌套 mapping；转张量由 `BaseTorchPolicy.extract_model_obs_tensor` 负责
- `get_action_and_runtime_state` 返回动作与 `PolicyRuntimeState`
- `fake_runtime_state` 返回能用于 buffer 预分配的形状与 dtype
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
