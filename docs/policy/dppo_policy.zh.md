## DPPO 策略

本页包含三个子部分：

- 内置 DPPO 策略（`dppo-policy`）
- OpenPI $\pi$ 系列策略（`pi0-policy`）
- 如何打包一个 DPPO 所需要的 diffusion policy

### 基类：`BasePolicyGradientDiffusionPolicy`

`DPPOPolicy` 和 diffusion 风格的自定义策略都基于 `BasePolicyGradientDiffusionPolicy`。

基类负责的事情很固定：

- 用 `_get_timesteps` 给出的时间步跑一段 denoising 循环。
- 用 `_initialize_x` 初始化动作 latent `x`。
- 每个时间步 `t` 调用 `_denoising_step`，并要求返回三个值：`x_next`、`logprob`、`entropy`。
- 把每步信息写进 `InternalState`，供算法侧训练使用：
    - `internal_state.action[:, i] = x_next`
    - `internal_state.logprob[:, i] = logprob`
    - `internal_state.entropy[:, i] = entropy`
    - `internal_state.obs["x"][:, i] = x`，`internal_state.obs["t"][:, i] = t`
- 步间用 `_iterative_process_action` 处理一次，循环结束后用 `_postprocess_action` 做最终输出变换。
- 如果有 critic，基类会通过 `_get_value` 得到 `value`，写入 `internal_state.value`。

关键张量形状（来自 `fake_internal_state()`）：

- `internal_state.action`：`[B, S, H, D]`，其中 `S=num_denoising_steps`、`H=action_horizon`、`D=action_dim`
- `internal_state.obs["x"]`：`[B, S, H, D]`
- `internal_state.obs["t"]`：`[B, S]`
- `internal_state.value`：`[B]`

你在子类里需要实现：

- `_get_timesteps`、`_initialize_x`、`_denoising_step`、`_iterative_process_action`、`_postprocess_action`
- `fake_diffusion_cond()`，用于提前分配 buffer
- 可选 `preprocess_observation()`，把昂贵的 conditioning 预处理缓存到 `processed_cond`，在每个 denoising step 复用

### DPPO 模型（`dppo-policy`）

**UID**：`dppo-policy`

**实现位置**：`plugrl-server/src/plugrl_server/policy/dppo/dppo_policy.py`

**它做什么**

`DPPOPolicy` 基于 `BasePolicyGradientDiffusionPolicy`，用 diffusion 的方式生成动作序列。

- 会从 `plugrl_server/meta/dppo/cfg/<env_type>/<env_name>.yaml` 加载与环境对应的 Hydra 配置。
- 会从 `plugrl_server/meta/dppo/asset/<env_type>/<env_name>/normalization.npz` 加载归一化统计。
- 期望 worker 发来的观测中包含 `states` 字典，并按 YAML 中的 `low_dim_keys` 抽取并拼接成一个低维向量。

**配置字段**

策略配置为 `DPPOPolicyConfig`：

- `policy.env_type`（默认：`gym`）
- `policy.env_name`（默认：`hopper-medium-v2`）
- `policy.checkpoint_path`（可选）：会从 checkpoint 中读取 `checkpoint["model"]` 并加载到 actor
- `policy.critic`（可选）：`CriticObs` 的结构/激活函数等

**怎么运行**

典型 server 命令：

```bash
plugrl-run-server dppo-policy default dppo hopper \
  --policy.env_type gym \
  --policy.env_name hopper-medium-v2
```

如果有权重：

```bash
plugrl-run-server dppo-policy default dppo hopper \
  --policy.checkpoint_path /path/to/checkpoint.pt
```

**依赖说明**

该策略依赖可选的 `dppo` 包；缺失时会报错，错误信息里会提示安装 `"plugrl-worker[dppo]"`。

### OpenPI $\pi$ 系列模型（`pi0-policy`）

**UID**：`pi0-policy`

**实现位置**：`plugrl-server/src/plugrl_server/policy/openpi/openpi_policy.py`

**它做什么**

`Pi0Policy` 把 OpenPI 的 PI0 模型封装成 PlugRL 的 diffusion policy：

- 会根据 OpenPI 的配置构建输入/输出变换链（`input_transform` / `output_transform`）。
- 需要你提供 `policy.checkpoint_path`（目录），其中应包含 `model.safetensors` 以及带 normalization stats 的 `assets/`。
- 会把 worker 的观测 dict 先拆成样本列表再 batch 回来，最终构成 `TensorDict`。

**配置字段**

策略配置为 `Pi0PolicyConfig`：

- `policy.name`（默认：`pi05_tiny_libero`）
- `policy.checkpoint_path`（必填）
- `policy.default_prompt`（可选）
- `policy.denoising_steps`（默认：`5`）
- `policy.train_expert_only`（默认：`True`）：会冻结 VLM 部分参数

**怎么运行**

```bash
plugrl-run-server pi0-policy default dppo hopper \
  --policy.checkpoint_path /path/to/pi0_checkpoint \
  --policy.name pi05_tiny_libero
```

**依赖说明**

该策略依赖 `plugrl-server/third_party/openpi` 及相关 Python 包。项目目前使用的本地安装/替换步骤见 `plugrl-server/src/plugrl_server/policy/openpi/README.md`。

### 自定义 DPPO 策略（即插即用 diffusion 风格）

上面两类策略属于**内置策略**：它们随 `plugrl-server` 一起提供，并会被 `plugrl_server` 包自动 import，因此天然可用。

而**自定义**的 DPPO 风格策略可以做到真正“即插即用”：

- 你把代码写在自己的 Python 包里（不需要把文件放进 `plugrl-server/src/...`）。
- 唯一要求是：启动 server 之前，你的模块要先被 import 一次，这样注册装饰器才能把策略/配置写入 registry，CLI 才能看见它。

如果你想实现“DPPO 风格”的策略（diffusion rollout + 每步 logprob/entropy/value 的 internal state），推荐做法是：

1) 继承 `BasePolicyGradientDiffusionPolicy`
2) 使用 `@register_policy_config` 与 `@register_policy` 完成注册
3) 确保在 `plugrl_server.cli:main` 运行前先 import 你的模块

基类会驱动 denoising 循环，你只需要实现 diffusion 相关的细节。

#### 最小模板

```python
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
        # 1) 创建/加载 actor
        # 2) 可选：创建 critic
        # 3) 设置：self.action_dim, self.action_horizon, self.num_denoising_steps

    def prepare_observation(self, _obs: dict) -> TensorDict:
        # 把 worker 的观测 dict 转为 TensorDict
        ...

    def preprocess_observation(self, obs: TensorDict):
        # 可选：把昂贵的预处理缓存下来，在每个 denoising step 复用。
        # 参考 Pi0Policy.preprocess_observation 的写法。
        ...

    def _get_timesteps(self) -> torch.Tensor:
        # 返回长度为 num_denoising_steps 的 1D tensor
        ...

    def _initialize_x(self, obs: TensorDict) -> torch.Tensor:
        # 返回 (B, action_horizon, action_dim)
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
        # 必须返回：(x_next, logprob, entropy)
        # 形状通常与 DPPOPolicy 一致：
        # - x_next: (B, H, A)
        # - logprob: (B, H, A)
        # - entropy: (B, H, A)
        ...

    def _iterative_process_action(self, action: torch.Tensor) -> torch.Tensor:
        return action

    def _postprocess_action(self, action: torch.Tensor, obs: TensorDict):
        # 将最终 diffusion action 转为 worker 环境可接受的 numpy action
        ...

    def fake_diffusion_cond(self, batch_size: int) -> TensorDict:
        # BasePolicyGradientDiffusionPolicy.fake_internal_state 会用到
        ...
```

#### 配合 LeRobot diffusion 的具体讲解

如果你想看一个“完整可跑、形状/接口都对齐”的 diffusion policy 参考实现，可以直接读：

- `plugrl-server/examples/lerobot/lerobot_diffusion.py`（`UID = "lerobot-diffusion-policy"`）

LeRobot 的接入示例代码量相对更大，但目标很明确：尽量不改动 LeRobot 的模型代码与配置，只在外层做适配。

LeRobot diffusion 的原实现也不是按 PlugRL 的 **批量/并行推理** 场景写的，所以示例里补了几处兼容处理：

- 为了拿到每个 denoising step 的 `logprob/entropy`，把一步采样里用于计算 `mean/std/variance` 的逻辑显式展开
- 支持 `B * num_denoising_steps` 这类“扩展 batch”形态（用 `repeat_interleave` 对齐 batch 维度）

实现要点（同样适用于自定义 DPPO policy）：

1) **加载预训练 diffusion policy，并显式暴露动作相关形状**

- 在 `__init__` 里加载预训练策略后，设置：
    - `self.action_dim`
    - `self.action_horizon`
    - `self.num_denoising_steps`
- 同时可以按需加 critic（LeRobot 用一个简单的 MLP `ValueHead` 预测 value）。

2) **把 worker 的观测打包成 `TensorDict`（重点：多步观测）**

LeRobot 的 `prepare_observation()` 预期 worker 发送的是一个“多步观测”（长度为 `n_obs_steps`），并用如下方式打包：

- 从 `_obs["states"][f"<key>_{t}"]`、`_obs["images"][f"<key>_{t}"]` 读取 `t in range(n_obs_steps)` 的多步数据
- `np.stack(..., axis=1)` 形成 `B x T x ...`
- 图像会 permute 成 `B, T, C, H, W` 并缩放到 `[0, 1]`
- 调用 `actor.normalize_inputs(...)` 做输入归一化
- 将多相机图像合并成统一的 `OBS_IMAGES` 张量，再返回 `TensorDict`

如果你的自定义 DPPO policy 也需要 history / 多相机 / 多模态观测，推荐直接沿用这个“先堆叠成时间维、再统一归一化、最后封装 TensorDict”的结构。

3) **把昂贵的条件编码缓存下来（每次 rollout 只算一次）**

LeRobot 在 `preprocess_observation()` 里做一次较重的预处理：

- `processed_cond = actor.diffusion._prepare_global_conditioning(obs)`

然后在每个 denoising step 的 `_denoising_step()` 中复用 `processed_cond`，避免重复跑 encoder。

4) **支持“扩展 batch”（`B * num_denoising_steps`）**

有些算法会把 batch 展开成 `B * num_denoising_steps`。LeRobot 的处理方式是：

- 检测 `b_cond * self.num_denoising_steps == b`
- 用 `torch.repeat_interleave(processed_cond, self.num_denoising_steps, dim=0)` 把条件重复到匹配的 batch

这和 `Pi0Policy`/`DPPOPolicy` 里处理 `repeat_interleave` 的思路一致。

5) **每个 denoising step 返回 `logprob/entropy`**

LeRobot 在每步里构造 `Normal(mean, std)` 并返回：

- `logprob = dist.log_prob(x_next)`
- `entropy = dist.entropy()`

这样就能对齐 PlugRL 的 `BasePolicyGradientDiffusionPolicy` 里 `InternalState` 的 `logprob/entropy` 结构。

6) **动作后处理：切片 + 反归一化 + numpy 输出**

LeRobot 的 `_postprocess_action()` 会：

- 根据 `n_obs_steps` / `n_action_steps` 把 action chunk 做切片（`start = n_obs_steps - 1`）
- 用 `actor.unnormalize_outputs({ACTION: action})` 反归一化
- `actions.cpu().numpy()` 返回给 worker 环境

这个模式也很适合自定义 DPPO：最终输出尽量是 env 能直接 `step()` 的 numpy action。

#### 实战要点（来自内置实现）

- DPPO 会做 env-specific 的归一化，并将 `states[low_dim_keys]` 拼成一个低维向量。
- Pi0 把昂贵的预处理放在 `preprocess_observation()`，并通过 `_denoising_step(..., processed_cond=...)` 复用。
- 如果你的采样是确定性的（ODE 风格），可以像 Pi0 那样让 `logprob` 为全 0；如果是随机采样，则像 DPPO 那样根据分布计算 `logprob/entropy`。

#### 验证

先做一次 smoke test，确认 server CLI 能发现你的策略。

如果你的策略在外部包里，一个最小可用的方式是“先 import，再把参数交给官方入口”：

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
    my-dppo-policy default dummy default
```

如果你希望命令更顺手，建议在你的包里提供一个自己的 console script（比如 `my-plugrl-run-server`），内部做 import 后再调用 `plugrl_server.cli.main()`。

如果你仍使用官方命令形态（并且你的模块已确保会被自动 import），也可以直接跑：

```bash
plugrl-run-server my-dppo-policy default dummy default
```

随后切到你的目标算法/环境，逐步对齐观测字段、动作形状与训练逻辑。
