# DPPO 策略

在 server 侧运行 diffusion 风格策略，并与 DPPO 算法配合。

本页包含：

- 内置 `dppo-policy`
- 内置 `pi0-policy`（OpenPI PI0）
- 用 `BasePolicyGradientDiffusionPolicy` 实现自定义 diffusion policy

## 快速开始

DPPO 策略。

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

OpenPI PI0 策略（需要 checkpoint 目录）。

```bash
plugrl-run-server pi0-policy default dppo hopper \
  --policy.checkpoint_path /path/to/pi0_checkpoint \
  --policy.name pi05_tiny_libero
```

## 验证

查看注册到 CLI 的策略与变体。

```bash
plugrl-run-server --help
```

外部包策略先 import 再进入 CLI。

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
  my-dppo-policy default dummy default
```

## 内置：`dppo-policy`

- UID：`dppo-policy`
- 代码：`plugrl-server/src/plugrl_server/policy/dppo/dppo_policy.py`
- 依赖：运行 `plugrl-run-server` 的环境里需要安装 `dppo`。
    - uv：在 `plugrl-server` 执行 `uv sync --extra dppo`。
- 加载：
  - `plugrl_server/meta/dppo/cfg/<env_type>/<env_name>.yaml`
  - `plugrl_server/meta/dppo/asset/<env_type>/<env_name>/normalization.npz`
- 观测：期望 worker 观测包含 `states`，并按 `low_dim_keys` 拼接。

常用参数。

- `--policy.env_type gym`
- `--policy.env_name hopper-medium-v2`
- `--policy.checkpoint_path /path/to/checkpoint.pt`
- `--policy.critic.*`

## 内置：`pi0-policy`（OpenPI）

- UID：`pi0-policy`
- 代码：`plugrl-server/src/plugrl_server/policy/openpi/openpi_policy.py`
- `--policy.checkpoint_path` 必填，目录内需要：
  - `model.safetensors`
  - `assets/`（归一化统计）
- 本地安装/替换步骤见：`plugrl-server/src/plugrl_server/policy/openpi/README.md`。

常用参数。

- `--policy.name pi05_tiny_libero`
- `--policy.denoising_steps 5`
- `--policy.train_expert_only true`
- `--policy.default_prompt "..."`

## 自定义 diffusion policy

继承 `BasePolicyGradientDiffusionPolicy`：
`plugrl-server/src/plugrl_server/policy/base_policy_gradient_diffusion_policy.py`。

基类负责 denoising 循环并填充 `InternalState`：

- 每步写入：`action`、`logprob`、`entropy`，以及 `obs["x"]`、`obs["t"]`。
- 最终调用 `_postprocess_action`，并把 `value` 写入 `internal_state.value`。

你需要实现。

- `_get_timesteps`、`_initialize_x`、`_denoising_step`、`_iterative_process_action`、`_postprocess_action`
- `fake_diffusion_cond`（用于 buffer 预分配）
- 可选 `preprocess_observation`（缓存昂贵的条件编码）

关键形状（来自 `fake_internal_state`）。

- `action/logprob/entropy/obs["x"]`：`(B, S, H, D)`
- `obs["t"]`：`(B, S)`
- `value`：`(B,)`

最小模板。

```py
import dataclasses
import torch
from tensordict import TensorDict

from plugrl_server.policy.base_policy_gradient_diffusion_policy import (
    BasePolicyGradientDiffusionPolicy,
    BasePolicyGradientDiffusionPolicyConfig,
)
from plugrl_server.policy.registration import register_policy, register_policy_config

UID = "my-dppo-policy"


@register_policy_config(UID)
@dataclasses.dataclass
class MyDPPOPolicyConfig(BasePolicyGradientDiffusionPolicyConfig):
    checkpoint_path: str | None = None


@register_policy(UID)
class MyDPPOPolicy(BasePolicyGradientDiffusionPolicy):
    def __init__(self, config: MyDPPOPolicyConfig):
        super().__init__(config)
        ...

    def prepare_observation(self, obs: dict) -> TensorDict:
        ...

    def _get_timesteps(self) -> torch.Tensor:
        ...

    def _initialize_x(self, obs: TensorDict) -> torch.Tensor:
        ...

    def _denoising_step(
        self,
        x: torch.Tensor,
        t: torch.Tensor,
        cond: TensorDict,
        x_next: torch.Tensor | None = None,
        *,
        processed_cond=None,
        sampling_noise_level: float | None = None,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        ...

    def _iterative_process_action(self, action: torch.Tensor) -> torch.Tensor:
        return action

    def _postprocess_action(self, action: torch.Tensor, obs: TensorDict):
        ...

    def fake_diffusion_cond(self, batch_size: int) -> TensorDict:
        ...
```

## LeRobot 示例

参考 `plugrl-server/examples/lerobot/lerobot_diffusion.py`（`UID = "lerobot-diffusion-policy"`）。

可复用模式。

- 把多步观测打包成 batched `TensorDict`。
- 在 `preprocess_observation` 缓存 encoder 输出。
- 用 `repeat_interleave` 支持 `B * num_denoising_steps` 的扩展 batch。
- 确定性采样可像 `Pi0Policy` 一样返回全 0 的 `logprob`。
- 随机采样按分布计算 `logprob/entropy`，与 `DPPOPolicy` 对齐。

## 常见问题

- `dppo-policy` import 失败：在运行 `plugrl-run-server` 的环境里安装 `dppo`。
- `pi0-policy` 启动失败：按 OpenPI README 完成本地设置。
- 训练 shape 对不上：动作形状要稳定，`InternalState` 字段要与 buffer 对齐。
- CLI 找不到 UID：注册模块没有被 import。

## 下一步

- [策略](index.zh.md)
- [自定义策略](custom_policy.zh.md)
- [自定义算法](../algorithm/custom_algorithm.zh.md)
