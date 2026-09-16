# DPPO policies

Use diffusion-style server policies with the DPPO algorithm.

This page covers:

- Built-in `dppo-policy`
- Built-in `pi0-policy` (OpenPI PI0)
- Implementing a diffusion-style policy with `BasePolicyGradientDiffusionPolicy`

## Quickstart

DPPO policy.

```bash
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp
```

OpenPI PI0 policy (requires a checkpoint directory). It is a flow policy: it
pairs with `fpo` or `eval`, never with `dppo`. These are the two invocations
[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero) ran.

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
  --algo.n-samples-per-action 4 --algo.buffer-size 4096 \
  --algo.global-steps 40960
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

- `--policy.env-type gym`
- `--policy.env-name hopper-medium-v2`
- `--policy.checkpoint-path /path/to/checkpoint.pt`
- `--policy.critic.*`

## Built-in: `pi0-policy` (OpenPI)

- UID: `pi0-policy`
- Code: `plugrl-server/src/plugrl_server/policy/openpi/openpi_policy.py`
- `--policy.checkpoint-path` is required and must point to a directory with:
  - `model.safetensors`
  - `assets/` with normalization stats
- Setup notes: `plugrl-server/src/plugrl_server/policy/openpi/README.md`.

Common flags.

- `--policy.name pi05_libero`
- `--policy.denoising-steps 5`
- `--policy.train-expert-only true`
- `--policy.default-prompt "..."`

## Implement a diffusion-style policy

Subclass `BasePolicyGradientDiffusionPolicy` in
`plugrl-server/src/plugrl_server/policy/base_policy_gradient_diffusion_policy.py`.

The base class drives the denoising loop and fills a `DiffusionRuntimeState`:

- Per-step: `action`, `logprob`, `entropy`, plus `obs["x"]` and `obs["t"]`.
- Final: calls `_postprocess_action` and stores `value` into `runtime_state.value`.

What you implement.

- `_get_timesteps`, `_initialize_x`, `_denoising_step`, `_iterative_process_action`, `_postprocess_action`
- `fake_diffusion_cond` for buffer preallocation
- `_get_value`. It is not abstract, but the base assigns its result into
  `runtime_state.value`, so a subclass that leaves it out fails mid-rollout with
  `TypeError: can't assign a NoneType to a torch.FloatTensor`.
- Optional `build_obs_cache` to cache expensive conditioning. The base calls it
  once per inference and passes the result to `_denoising_step` as the
  keyword-only `cond_cache=` and to `_get_value` as `obs_cache=`.

Key shapes (from `fake_runtime_state`).

- `action/logprob/entropy/obs["x"]`: `(B, S, H, D)`
- `obs["t"]`: `(B, S)`
- `value`: `(B,)`

Minimal template.

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
        ...

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

## Example: LeRobot diffusion adapter

See `plugrl-server/examples/lerobot/lerobot_diffusion.py` (`UID = "lerobot-diffusion-policy"`).

Patterns to copy.

- Pack multi-step observations into one batched nested `dict` of arrays - that is
  what `TorchTree` is; the base converts it to tensors for you.
- Cache encoder outputs in `build_obs_cache`.
- Support expanded batch `B * num_denoising_steps` with `repeat_interleave`.
- Deterministic sampling can return zero `logprob` like `Pi0Policy`.
- Stochastic sampling should compute `logprob/entropy` like `DPPOPolicy`.

## Troubleshooting

- `dppo-policy` import fails: install `dppo` in the environment that runs `plugrl-run-server`.
- `pi0-policy` import/setup fails: follow the OpenPI setup in the server repo.
- Shape mismatch in training: keep action shapes stable and align the runtime state with your buffers.
- Policy UID not listed: your registration module was not imported.

## Next steps

- [Policies](index.md)
- [Custom policy](custom_policy.md)
- [Custom algorithm](../algorithm/custom_algorithm.md)
