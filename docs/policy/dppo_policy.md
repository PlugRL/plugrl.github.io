# DPPO policies

Use diffusion-style server policies with the DPPO algorithm.

This page covers:

- Built-in `dppo-policy`
- Built-in `pi0-policy` (OpenPI PI0)
- Implementing a diffusion-style policy with `BasePolicyGradientDiffusionPolicy`

## Quickstart

DPPO policy.

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

OpenPI PI0 policy (requires a checkpoint directory).

```bash
plugrl-run-server pi0-policy default dppo hopper \
  --policy.checkpoint_path /path/to/pi0_checkpoint \
  --policy.name pi05_tiny_libero
```

## Verify

List registered policies and variants.

```bash
plugrl-run-server --help
```

Smoke-test a plug-in policy UID.

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
  my-dppo-policy default dummy default
```

## Built-in: `dppo-policy`

- UID: `dppo-policy`
- Code: `plugrl-server/src/plugrl_server/policy/dppo/dppo_policy.py`
- Dependency: `dppo` must be installed in the server environment.
    - uv: in `plugrl-server`, run `uv sync --extra dppo`.
- Loads:
  - `plugrl_server/meta/dppo/cfg/<env_type>/<env_name>.yaml`
  - `plugrl_server/meta/dppo/asset/<env_type>/<env_name>/normalization.npz`
- Expects worker obs to contain `states` and concatenates `low_dim_keys`.

Common flags.

- `--policy.env_type gym`
- `--policy.env_name hopper-medium-v2`
- `--policy.checkpoint_path /path/to/checkpoint.pt`
- `--policy.critic.*`

## Built-in: `pi0-policy` (OpenPI)

- UID: `pi0-policy`
- Code: `plugrl-server/src/plugrl_server/policy/openpi/openpi_policy.py`
- `--policy.checkpoint_path` is required and must point to a directory with:
  - `model.safetensors`
  - `assets/` with normalization stats
- Setup notes: `plugrl-server/src/plugrl_server/policy/openpi/README.md`.

Common flags.

- `--policy.name pi05_tiny_libero`
- `--policy.denoising_steps 5`
- `--policy.train_expert_only true`
- `--policy.default_prompt "..."`

## Implement a diffusion-style policy

Subclass `BasePolicyGradientDiffusionPolicy` in
`plugrl-server/src/plugrl_server/policy/base_policy_gradient_diffusion_policy.py`.

The base class drives the denoising loop and fills `InternalState`:

- Per-step: `action`, `logprob`, `entropy`, plus `obs["x"]` and `obs["t"]`.
- Final: calls `_postprocess_action` and stores `value` into `internal_state.value`.

What you implement.

- `_get_timesteps`, `_initialize_x`, `_denoising_step`, `_iterative_process_action`, `_postprocess_action`
- `fake_diffusion_cond` for buffer preallocation
- Optional `preprocess_observation` to cache expensive conditioning

Key shapes (from `fake_internal_state`).

- `action/logprob/entropy/obs["x"]`: `(B, S, H, D)`
- `obs["t"]`: `(B, S)`
- `value`: `(B,)`

Minimal template.

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

## Example: LeRobot diffusion adapter

See `plugrl-server/examples/lerobot/lerobot_diffusion.py` (`UID = "lerobot-diffusion-policy"`).

Patterns to copy.

- Pack multi-step observations into a batched `TensorDict`.
- Cache encoder outputs in `preprocess_observation`.
- Support expanded batch `B * num_denoising_steps` with `repeat_interleave`.
- Deterministic sampling can return zero `logprob` like `Pi0Policy`.
- Stochastic sampling should compute `logprob/entropy` like `DPPOPolicy`.

## Troubleshooting

- `dppo-policy` import fails: install `dppo` in the environment that runs `plugrl-run-server`.
- `pi0-policy` import/setup fails: follow the OpenPI setup in the server repo.
- Shape mismatch in training: keep action shapes stable and align `InternalState` with your buffers.
- Policy UID not listed: your registration module was not imported.

## Next steps

- [Policies](index.md)
- [Custom policy](custom_policy.md)
- [Custom algorithm](../algorithm/custom_algorithm.md)
