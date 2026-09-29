# DPPO policies

Use diffusion-style server policies with the DPPO algorithm, and flow
policies with DPPO or FPO.

This page covers:

- Built-in `dppo-policy`
- Built-in `pi0-policy` (OpenPI PI0)
- Implementing a diffusion-style policy with `BasePolicyGradientDiffusionPolicy`,
  or a flow policy with `BasePolicyGradientFlowPolicy`

## Quickstart

DPPO policy.

```bash
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp
```

OpenPI PI0 policy (requires a checkpoint directory). It is a flow policy and
runs with `eval`, `fpo` and `dppo`. The first two commands are the ones
[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)
ran, without its port, logging and output-directory flags. The third has the
algorithm settings of
[E25](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e25-pi0-dppo),
which ran it end to end.

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

## Verify

List registered policies, then the variants of one.

```bash
plugrl-run-server --help
plugrl-run-server dppo-policy --help
```

Smoke-test a plug-in policy UID.

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
  my-dppo-policy default dummy default
```

## Built-in: `dppo-policy`

- UID: `dppo-policy`
- Code: `plugrl-server/src/plugrl_server/policy/dppo/dppo_policy.py`
- Dependency: the `dppo` extra must be installed in the server environment.
  Without it, `dppo-policy` is missing from the CLI.
    - uv: in `plugrl-server`, run `uv sync --extra dppo`.
- Variants, each meant for the `dppo` variant of the same name:
    - `default` and `hopper`: gym `hopper-medium-v2`
    - `walker`: gym `walker2d-medium-v2`
    - `cheetah`: gym `halfcheetah-medium-v2`
    - `square`: robomimic `square`, fine-tuning the last 10 of its 20
      denoising steps
- Loads:
  - `plugrl_server/meta/dppo/cfg/<env_type>/<env_name>.yaml`
  - `plugrl_server/meta/dppo/asset/<env_type>/<env_name>/normalization.npz`
- `--policy.checkpoint-path` loads a DPPO pretraining checkpoint (`.pt`),
  its `ema` weights when it has them. Without it the network starts from
  random initialization.
- Expects worker obs to contain `states` and concatenates `low_dim_keys`.

Common flags.

- `--policy.env-type gym`
- `--policy.env-name hopper-medium-v2`
- `--policy.checkpoint-path /path/to/checkpoint.pt`
- `--policy.ft-denoising-steps 10`: fine-tune only the chain's last 10
  denoising steps. The earlier steps run a frozen copy of the loaded network,
  and only the last 10 are recorded for training. Unset, every step is
  fine-tuned. `square` sets 10.
- `--policy.critic.*`

## Built-in: `pi0-policy` (OpenPI)

- UID: `pi0-policy`
- Code: `plugrl-server/src/plugrl_server/policy/openpi/openpi_policy.py`
- A flow policy (`BasePolicyGradientFlowPolicy`). Runs with `eval`, `fpo`,
  and `dppo` through the `libero` variant.
- `--policy.checkpoint-path` is required and must point to a directory with:
  - `model.safetensors`
  - `assets/` with normalization stats
- Setup notes: `plugrl-server/src/plugrl_server/policy/openpi/README.md`.
  Without OpenPI installed, `pi0-policy` is missing from the CLI.

Common flags.

- `--policy.name pi05_libero`
- `--policy.denoising-steps 5`
- `--policy.train-expert-only`: train only the action expert, with the
  vision-language model frozen. This is the default;
  `--policy.no-train-expert-only` trains both.
- `--policy.default-prompt "..."`

## Implement a diffusion-style policy

Subclass `BasePolicyGradientDiffusionPolicy` in
`plugrl-server/src/plugrl_server/policy/base_policy_gradient_diffusion_policy.py`.

The base class drives the denoising loop and fills a `DiffusionRuntimeState`:

- `runtime_state.obs` is a `DiffusionObs` dataclass with fields `x`, `t` and `cond`.
- Per recorded step: `action`, `logprob`, `entropy`, plus `obs.x` and `obs.t`.
  Only the last `num_recorded_denoising_steps` steps are recorded. That is
  every step, unless the policy overrides the property, as `dppo-policy` does
  for `--policy.ft-denoising-steps`.
- Final: calls `_postprocess_action`, stores the model observation in
  `obs.cond` and the value in `runtime_state.value`.

What you implement.

- In `__init__`, set `action_dim`, `action_horizon` and `num_denoising_steps`.
  `fake_runtime_state` builds its shapes from them, and the server sends the
  first two to clients in its metadata message.
- An `actor` module and a `critic` module (the value head). `dppo` raises
  `DPPO requires a critic.` without one, and it builds its optimizers from
  `policy.actor` and `policy.critic`. `fpo` optimizes the same two.
- `prepare_observation`, which turns the worker obs into arrays
- `_get_timesteps`, `_initialize_x`, `_denoising_step`, `_iterative_process_action`, `_postprocess_action`
- `fake_diffusion_cond` for buffer preallocation
- `_get_value`. It is not abstract, but the base assigns its result into
  `runtime_state.value`, so a subclass that leaves it out fails mid-rollout with
  `TypeError: can't assign a NoneType to a torch.FloatTensor`.
- Optional `build_obs_cache` to cache expensive conditioning. The base calls it
  once per inference and passes the result to `_denoising_step` as the
  keyword-only `cond_cache=` and to `_get_value` as `obs_cache=`.

At training time `dppo` calls `_denoising_step` again, with `x` of batch
`B * S` (one entry per recorded step), `cond` of batch `B`, and no
`cond_cache`. Expand `cond` with `repeat_interleave` when the two differ, as
`dppo-policy` does.

Key shapes (from `fake_runtime_state`), with `S = num_recorded_denoising_steps`,
`H = action_horizon`, `D = action_dim`.

- `action`, `logprob`, `entropy`, `obs.x`: `(B, S, H, D)`
- `obs.t`: `(B, S)`
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

### Flow policies

`BasePolicyGradientFlowPolicy`, in `base_policy_gradient_flow_policy.py`,
subclasses the diffusion base and implements `_denoising_step` for you as an
Euler step along a predicted velocity. `fpo` requires a policy built on it.
A subclass:

- implements `_predict_v(x, t, cond, *, cond_cache=None)`, returning the
  velocity, instead of `_denoising_step`;
- sets `dt` in `__init__`. The built-ins run from `t = 1` to `t = 0` with
  `dt = -1.0 / num_denoising_steps`;
- implements the rest of the list above.

Without a sampling noise level the step is deterministic and its
log-probability is zero. `dppo` passes one, which makes the step stochastic,
and that is how `dppo` trains a flow policy. `fpo-policy` and `pi0-policy` are
the examples to read.

## Example: LeRobot diffusion adapter

See `plugrl-server/examples/lerobot/lerobot_diffusion.py` (`UID = "lerobot-diffusion-policy"`).

Patterns to copy.

- Pack multi-step observations into one batched nested `dict` of arrays - that is
  what `TorchTree` is; the base converts it to tensors for you.
- Cache encoder outputs in `build_obs_cache`.
- Support the expanded batch `B * S` with `repeat_interleave`, as described above.
- Deterministic sampling can return zero `logprob` like `Pi0Policy`.
- Stochastic sampling should compute `logprob/entropy` like `DPPOPolicy`.

## Troubleshooting

- `dppo-policy` missing from the CLI: install the `dppo` extra in the environment that runs `plugrl-run-server`.
- `pi0-policy` missing from the CLI, or failing at startup: follow the OpenPI setup in the server repo.
- `DPPO requires a critic.`: set `self.critic` in `__init__`.
- Shape mismatch in training: keep action shapes stable and align the runtime state with your buffers.
- Policy UID not listed: your registration module was not imported.

## Next steps

- [Policies](index.md)
- [Custom policy](custom_policy.md)
- [Custom algorithm](../algorithm/custom_algorithm.md)
