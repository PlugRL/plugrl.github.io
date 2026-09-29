# DPPO 策略

在 server 侧运行 diffusion 风格策略并与 DPPO 算法配合；流策略则可以配 DPPO 或 FPO。

本页包含：

- 内置 `dppo-policy`
- 内置 `pi0-policy`（OpenPI PI0）
- 用 `BasePolicyGradientDiffusionPolicy` 实现自定义 diffusion policy，或用
  `BasePolicyGradientFlowPolicy` 实现流策略

## 快速开始

DPPO 策略。

```bash
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp
```

OpenPI PI0 策略（需要 checkpoint 目录）。它是流策略，可以配 `eval`、`fpo` 和
`dppo`。前两条是
[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)
实际跑的命令，去掉了端口、日志和输出目录相关的参数。第三条用的是
[E25](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e25-pi0-dppo)
的算法设置，E25 用它完整跑通过。

```bash
# evaluation - no learning
plugrl-run-server pi0-policy default eval default \
  --policy.name pi05_libero \
  --policy.checkpoint-path /path/to/pi0_checkpoint \
  --policy.device cuda

# FPO fine-tuning
plugrl-run-server pi0-policy default fpo default \
  --policy.name pi05_libero \
  --policy.checkpoint-path /path/to/pi0_checkpoint \
  --policy.device cuda \
  --algo.learning-rate 1e-5 --algo.batch-size 8 \
  --algo.num-updates-per-batch 4 --algo.n-samples-per-action 4 \
  --algo.buffer-size 4096 --algo.clipping-epsilon 0.05 \
  --algo.global-steps 40960 --algo.save-interval 1

# DPPO fine-tuning
plugrl-run-server pi0-policy default dppo libero \
  --policy.name pi05_libero \
  --policy.checkpoint-path /path/to/pi0_checkpoint \
  --policy.device cuda \
  --algo.buffer-size 4096 --algo.batch-size 8 \
  --algo.train-itrs 2 --algo.save-interval 1
```

## 验证

先列出已注册的策略，再看某个策略有哪些变体。

```bash
plugrl-run-server --help
plugrl-run-server dppo-policy --help
```

外部包策略先 import 再进入 CLI。

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
  my-dppo-policy default dummy default
```

## 内置：`dppo-policy`

- UID：`dppo-policy`
- 代码：`plugrl-server/src/plugrl_server/policy/dppo/dppo_policy.py`
- 依赖：server 环境里要装 `dppo` 可选依赖。没装的话 CLI 里就没有 `dppo-policy`。
    - uv：在 `plugrl-server` 执行 `uv sync --extra dppo`。
- 变体，各自配同名的 `dppo` 变体：
    - `default` 和 `hopper`：gym `hopper-medium-v2`
    - `walker`：gym `walker2d-medium-v2`
    - `cheetah`：gym `halfcheetah-medium-v2`
    - `square`：robomimic `square`，只微调 20 个去噪步里的最后 10 个
- 加载：
  - `plugrl_server/meta/dppo/cfg/<env_type>/<env_name>.yaml`
  - `plugrl_server/meta/dppo/asset/<env_type>/<env_name>/normalization.npz`
- `--policy.checkpoint-path` 加载 DPPO 预训练 checkpoint（`.pt`），有 `ema` 权重时用
  `ema`。不给的话网络从随机初始化开始。
- 观测：期望 worker 观测包含 `states`，并按 `low_dim_keys` 拼接。

常用参数。

- `--policy.env-type gym`
- `--policy.env-name hopper-medium-v2`
- `--policy.checkpoint-path /path/to/checkpoint.pt`
- `--policy.ft-denoising-steps 10`：只微调去噪链最后 10 步。前面的步骤用加载进来的
  网络的冻结副本跑，只有最后 10 步会被记录下来用于训练。不设则每一步都微调。
  `square` 设的就是 10。
- `--policy.critic.*`

## 内置：`pi0-policy`（OpenPI）

- UID：`pi0-policy`
- 代码：`plugrl-server/src/plugrl_server/policy/openpi/openpi_policy.py`
- 是流策略（`BasePolicyGradientFlowPolicy`），可以配 `eval`、`fpo`，也可以通过
  `libero` 变体配 `dppo`。
- `--policy.checkpoint-path` 必填，目录内需要：
  - `model.safetensors`
  - `assets/`（归一化统计）
- 本地安装/替换步骤见：`plugrl-server/src/plugrl_server/policy/openpi/README.md`。
  没装 OpenPI 时 CLI 里没有 `pi0-policy`。

常用参数。

- `--policy.name pi05_libero`
- `--policy.denoising-steps 5`
- `--policy.train-expert-only`：只训练 action expert，视觉语言模型冻结。这是默认值；
  `--policy.no-train-expert-only` 两者一起训练。
- `--policy.default-prompt "..."`

## 自定义 diffusion policy

继承 `BasePolicyGradientDiffusionPolicy`：
`plugrl-server/src/plugrl_server/policy/base_policy_gradient_diffusion_policy.py`。

基类负责 denoising 循环并填充 `DiffusionRuntimeState`：

- `runtime_state.obs` 是一个 `DiffusionObs` dataclass，字段为 `x`、`t`、`cond`。
- 每个被记录的步骤写入：`action`、`logprob`、`entropy`，以及 `obs.x`、`obs.t`。
  只记录最后 `num_recorded_denoising_steps` 步。默认就是全部步骤，除非策略覆写这个
  属性，`dppo-policy` 为了 `--policy.ft-denoising-steps` 就覆写了它。
- 最终调用 `_postprocess_action`，把模型观测存进 `obs.cond`，把 value 写入
  `runtime_state.value`。

你需要实现。

- 在 `__init__` 里设置 `action_dim`、`action_horizon` 和 `num_denoising_steps`。
  `fake_runtime_state` 按它们构造形状，server 也会把前两个放进 metadata 消息发给
  client。
- 一个 `actor` 模块和一个 `critic` 模块（value head）。没有 critic 时 `dppo` 会报
  `DPPO requires a critic.`，它的优化器也是从 `policy.actor` 和 `policy.critic`
  建的。`fpo` 优化的也是这两个。
- `prepare_observation`，把 worker 观测转成数组
- `_get_timesteps`、`_initialize_x`、`_denoising_step`、`_iterative_process_action`、`_postprocess_action`
- `fake_diffusion_cond`（用于 buffer 预分配）
- `_get_value`。它不是 abstract，但基类会把它的返回值写进 `runtime_state.value`，
  所以不实现它会在 rollout 中途报
  `TypeError: can't assign a NoneType to a torch.FloatTensor`。
- 可选 `build_obs_cache`（缓存昂贵的条件编码）。基类每次推理调用它一次，
  结果以 keyword-only 的 `cond_cache=` 传给 `_denoising_step`，
  以 `obs_cache=` 传给 `_get_value`。

训练时 `dppo` 会再调用 `_denoising_step`，这时 `x` 的 batch 是 `B * S`（每个被记录
的步骤一条），`cond` 的 batch 是 `B`，而且不传 `cond_cache`。两者不一致时用
`repeat_interleave` 扩展 `cond`，`dppo-policy` 就是这么做的。

关键形状（来自 `fake_runtime_state`），其中 `S = num_recorded_denoising_steps`、
`H = action_horizon`、`D = action_dim`。

- `action`、`logprob`、`entropy`、`obs.x`：`(B, S, H, D)`
- `obs.t`：`(B, S)`
- `value`：`(B,)`

最小模板。

```py
import dataclasses
from typing import Any

import numpy as np
import torch

from plugrl_server.policy.base_policy_gradient_diffusion_policy import (
    BasePolicyGradientDiffusionPolicy,
    BasePolicyGradientDiffusionPolicyConfig,
    TorchTree,
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
        self.actor = ...  # torch.nn.Module
        self.critic = ...  # torch.nn.Module, the value head
        self.action_dim = ...
        self.action_horizon = ...
        self.num_denoising_steps = ...

    def prepare_observation(self, _obs: dict) -> dict[str, np.ndarray]:
        ...

    def _get_timesteps(self) -> torch.Tensor:
        ...

    def _initialize_x(self, batch_size: int) -> torch.Tensor:
        ...

    def _denoising_step(
        self,
        x: torch.Tensor,
        t: torch.Tensor,
        cond: TorchTree,
        x_next: torch.Tensor | None = None,
        *,
        cond_cache: Any = None,
        sampling_noise_level: float | None = None,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        ...

    def _iterative_process_action(self, action: torch.Tensor) -> torch.Tensor:
        return action

    def _postprocess_action(self, action: torch.Tensor, obs: TorchTree) -> Any:
        ...

    def _get_value(self, obs: TorchTree, obs_cache: Any = None) -> torch.Tensor:
        ...

    def fake_diffusion_cond(self, batch_size: int) -> TorchTree:
        ...
```

### 流策略

`base_policy_gradient_flow_policy.py` 里的 `BasePolicyGradientFlowPolicy` 继承自
diffusion 基类，并替你实现了 `_denoising_step`：沿预测的速度场走一个 Euler 步。
`fpo` 要求策略基于它。子类需要：

- 实现 `_predict_v(x, t, cond, *, cond_cache=None)`，返回速度，代替 `_denoising_step`；
- 在 `__init__` 里设置 `dt`。内置策略从 `t = 1` 走到 `t = 0`，用
  `dt = -1.0 / num_denoising_steps`；
- 实现上面清单里的其余部分。

不给采样噪声时这一步是确定性的，log-probability 为 0。`dppo` 会传入噪声，让这一步
变成随机的，`dppo` 正是这样训练流策略的。可以参考 `fpo-policy` 和 `pi0-policy`。

## LeRobot 示例

参考 `plugrl-server/examples/lerobot/lerobot_diffusion.py`（`UID = "lerobot-diffusion-policy"`）。

可复用模式。

- 把多步观测打包成一个 batched 的嵌套 `dict`（这就是 `TorchTree`），基类会替你转成张量。
- 在 `build_obs_cache` 缓存 encoder 输出。
- 用 `repeat_interleave` 支持上面说的 `B * S` 扩展 batch。
- 确定性采样可像 `Pi0Policy` 一样返回全 0 的 `logprob`。
- 随机采样按分布计算 `logprob/entropy`，与 `DPPOPolicy` 对齐。

## 常见问题

- CLI 里没有 `dppo-policy`：在运行 `plugrl-run-server` 的环境里安装 `dppo` 可选依赖。
- CLI 里没有 `pi0-policy`，或它启动失败：按 OpenPI README 完成本地设置。
- 报 `DPPO requires a critic.`：在 `__init__` 里设置 `self.critic`。
- 训练 shape 对不上：动作形状要稳定，runtime state 字段要与 buffer 对齐。
- CLI 找不到 UID：注册模块没有被 import。

## 下一步

- [策略](index.zh.md)
- [自定义策略](custom_policy.zh.md)
- [自定义算法](../algorithm/custom_algorithm.zh.md)
