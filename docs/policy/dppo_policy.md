## DPPO Policies

This page covers three related topics:

1. Built-in DPPO policy (`dppo-policy`)
2. OpenPI $\pi$ Series policy (`pi0-policy`)
3. How to implement your own DPPO-style diffusion policy

### Base class: `BasePolicyGradientDiffusionPolicy`

Both `DPPOPolicy` and diffusion-style custom policies build on `BasePolicyGradientDiffusionPolicy`.

What the base class does:

- Runs a fixed denoising loop driven by `_get_timesteps`.
- Calls `_initialize_x` to create the initial action latent `x`.
- For each timestep `t`, calls `_denoising_step` and expects **three outputs**: `x_next`, `logprob`, `entropy`.
- Writes per-step information into `InternalState` so the algorithm can train:
    - `internal_state.action[:, i] = x_next`
    - `internal_state.logprob[:, i] = logprob`
    - `internal_state.entropy[:, i] = entropy`
    - `internal_state.obs["x"][:, i] = x` and `internal_state.obs["t"][:, i] = t`
- Applies `_iterative_process_action` between steps, then `_postprocess_action` once at the end.
- Computes `value` via `_get_value` if a critic is present, and stores it in `internal_state.value`.

Key shapes (from `fake_internal_state()`):

- `internal_state.action`: `[B, S, H, D]` where `S=num_denoising_steps`, `H=action_horizon`, `D=action_dim`
- `internal_state.obs["x"]`: `[B, S, H, D]`
- `internal_state.obs["t"]`: `[B, S]`
- `internal_state.value`: `[B]`

What you implement in a subclass:

- `_get_timesteps`, `_initialize_x`, `_denoising_step`, `_iterative_process_action`, `_postprocess_action`
- `fake_diffusion_cond()` so buffers can be preallocated
- Optional `preprocess_observation()` to cache expensive conditioning once per inference call

### DPPO policy (`dppo-policy`)

**UID**: `dppo-policy`

**Implementation**: `plugrl-server/src/plugrl_server/policy/dppo/dppo_policy.py`

**What it is**

`DPPOPolicy` is a diffusion policy implementation built on `BasePolicyGradientDiffusionPolicy`.

- It loads an environment-specific Hydra config from `plugrl_server/meta/dppo/cfg/<env_type>/<env_name>.yaml`.
- It also loads normalization stats from `plugrl_server/meta/dppo/asset/<env_type>/<env_name>/normalization.npz`.
- It expects the worker observation to contain a `states` dict, and will concatenate a subset of keys (`low_dim_keys` from the YAML config).

**Config fields**

The policy config is `DPPOPolicyConfig`:

- `policy.env_type` (default: `gym`)
- `policy.env_name` (default: `hopper-medium-v2`)
- `policy.checkpoint_path` (optional): loads `checkpoint["model"]` into the actor
- `policy.critic` (optional): config for `CriticObs`

**How to run**

A typical server command looks like:

```bash
plugrl-run-server dppo hopper dppo-policy default \
  --policy.env_type gym \
  --policy.env_name hopper-medium-v2
```

If you have a checkpoint:

```bash
plugrl-run-server dppo hopper dppo-policy default \
  --policy.checkpoint_path /path/to/checkpoint.pt
```

**Dependency note**

The policy imports the optional `dppo` package. If it is missing, it raises an error that mentions installing `"plugrl-worker[dppo]"`.

### OpenPI $\pi$ Series Policy (`pi0-policy`)

**UID**: `pi0-policy`

**Implementation**: `plugrl-server/src/plugrl_server/policy/openpi/openpi_policy.py`

**What it is**

`Pi0Policy` wraps an OpenPI PI0 model and exposes it as a diffusion policy for PlugRL.

- It builds a transform pipeline (`input_transform` and `output_transform`) from OpenPI configs.
- It expects a `policy.checkpoint_path` directory that contains `model.safetensors` and an `assets/` folder with normalization stats.
- It converts the worker observation dict into a batched `TensorDict` (using `unbatch_aggregate`/`batch_aggregate`), then runs the model.

**Config fields**

The policy config is `Pi0PolicyConfig`:

- `policy.name` (default: `pi05_tiny_libero`)
- `policy.checkpoint_path` (**required**)
- `policy.default_prompt` (optional)
- `policy.denoising_steps` (default: `5`)
- `policy.train_expert_only` (default: `True`): freezes VLM parameters

**How to run**

```bash
plugrl-run-server dppo hopper pi0-policy default \
  --policy.checkpoint_path /path/to/pi0_checkpoint \
  --policy.name pi05_tiny_libero
```

**Dependency note**

This policy depends on the OpenPI code under `plugrl-server/third_party/openpi` and related Python packages. See `plugrl-server/src/plugrl_server/policy/openpi/README.md` for the local setup steps that the project currently uses.

### Custom DPPO policy (plug-in diffusion-style policy)

The policies above are **built-in**: they ship inside `plugrl-server` and are imported automatically.

A **custom** DPPO-style policy can be truly plug-in:

- You implement it in your own Python package (no need to place files under `plugrl-server/src/...`).
- The only requirement is: your module must be imported before the server CLI is built, so the decorators can register your policy/config.

If you want “a DPPO-like policy” (diffusion rollout + internal state with per-step logprob/entropy/value), the easiest path is:

1. Subclass `BasePolicyGradientDiffusionPolicy`
2. Register it with `@register_policy_config` and `@register_policy`
3. Make sure it gets imported before `plugrl_server.cli:main` runs

This base class drives the denoising loop and expects you to implement the diffusion-specific pieces.

#### Minimal template

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
    # Put your env/model identifiers here
    checkpoint_path: str | None = None


@register_policy(UID)
class MyDPPOPolicy(BasePolicyGradientDiffusionPolicy):
    def __init__(self, config: MyDPPOPolicyConfig):
        super().__init__(config)
        # 1) create/load actor
        # 2) optionally create critic
        # 3) set: self.action_dim, self.action_horizon, self.num_denoising_steps

    def prepare_observation(self, _obs: dict) -> TensorDict:
        # Convert worker obs dict -> TensorDict
        ...

    def preprocess_observation(self, obs: TensorDict):
        # Optional: expensive preprocessing cached across denoising steps.
        # See Pi0Policy.preprocess_observation for a concrete pattern.
        ...

    def _get_timesteps(self) -> torch.Tensor:
        # Return 1D tensor of length num_denoising_steps
        ...

    def _initialize_x(self, obs: TensorDict) -> torch.Tensor:
        # Return (B, action_horizon, action_dim)
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
        # Must return: (x_next, logprob, entropy)
        # Shapes typically match DPPOPolicy:
        # - x_next: (B, H, A)
        # - logprob: (B, H, A)
        # - entropy: (B, H, A)
        ...

    def _iterative_process_action(self, action: torch.Tensor) -> torch.Tensor:
        # Optional post-denoise transform before next step
        return action

    def _postprocess_action(self, action: torch.Tensor, obs: TensorDict):
        # Convert final diffusion action -> numpy action for worker env
        ...

    def fake_diffusion_cond(self, batch_size: int) -> TensorDict:
        # Used by BasePolicyGradientDiffusionPolicy.fake_internal_state
        ...
```

#### Walkthrough (LeRobot diffusion example)

See:

- `plugrl-server/examples/lerobot/lerobot_diffusion.py` (`UID = "lerobot-diffusion-policy"`)

The LeRobot adapter is longer because it avoids modifying LeRobot’s model code/config and instead adds a small compatibility layer.

LeRobot diffusion is also not built for PlugRL-style **batched / parallel inference** by default, so the example adds a few practical pieces:

- compute per-step `logprob/entropy` by explicitly carrying out the step-wise sampling math (e.g. `mean/std/variance`)
- handle the `B * num_denoising_steps` “expanded batch” case (via `repeat_interleave`)

Key patterns you can reuse:

1) **Load a pretrained diffusion policy and expose shapes**

- In `__init__`, load the pretrained policy, then set:
    - `self.action_dim`
    - `self.action_horizon`
    - `self.num_denoising_steps`
- Optionally add a critic head (LeRobot uses a simple MLP `ValueHead`).

2) **Pack worker observations into a `TensorDict`**

LeRobot expects the worker to send a multi-step observation (length `n_obs_steps`), and packs it like this:

- `prepare_observation()` reads `_obs["states"][f"<key>_{t}"]` and `_obs["images"][f"<key>_{t}"]` for `t in range(n_obs_steps)`
- stacks them into `B x T x ...`
- for images: permutes to `B, T, C, H, W` and scales to `[0, 1]`
- normalizes with `actor.normalize_inputs(...)`
- merges multiple cameras into a single `OBS_IMAGES` tensor and returns a `TensorDict`

3) **Cache expensive conditioning once per rollout**

LeRobot does heavy preprocessing once in `preprocess_observation()`:

- `processed_cond = actor.diffusion._prepare_global_conditioning(obs)`

Then `_denoising_step()` reuses `processed_cond` for every denoising iteration.

4) **Handle “expanded batch” inside `_denoising_step()`**

Some algorithms may expand the batch as `B * num_denoising_steps`. LeRobot supports this by:

- detecting `b_cond * self.num_denoising_steps == b`
- repeating `processed_cond` with `torch.repeat_interleave(..., self.num_denoising_steps, dim=0)`

5) **Return `logprob/entropy` per denoising step**

LeRobot samples from a Normal distribution `Normal(mean, std)` at each step and returns:

- `logprob = dist.log_prob(x_next)`
- `entropy = dist.entropy()`

This aligns with PlugRL’s `InternalState` layout in `BasePolicyGradientDiffusionPolicy`.

6) **Post-process and unnormalize actions**

LeRobot slices the action chunk and unnormalizes:

- `action = action[:, start:end]` (where `start = n_obs_steps - 1`)
- `actions = actor.unnormalize_outputs({ACTION: action})[ACTION]`
- returns `actions.cpu().numpy()` to the worker env.

#### Practical notes (from built-ins)

- DPPO uses env-specific normalization and concatenates `states[low_dim_keys]` into a single low-dim vector.
- Pi0 caches expensive preprocessing in `preprocess_observation()` and passes it into `_denoising_step()` as `processed_cond`.
- If your sampling is deterministic (ODE-style), you can set `logprob` to zeros like Pi0 does; if it is stochastic, compute `logprob/entropy` from your distribution like DPPO does.

#### Verify

Start with a smoke test to ensure the server CLI can discover your policy.

If you publish it as a package, a minimal pattern is “import first, then delegate to the real entrypoint”:

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
    dummy default my-dppo-policy default
```

Then you can switch back to your normal command shape (algo/env/policy/variant) as needed.

If you prefer a nicer UX, expose your own console script (e.g. `my-plugrl-run-server`) that does the import and calls `plugrl_server.cli.main()`.

Then run the usual smoke test:

```bash
plugrl-run-server dummy default my-dppo-policy default
```

Then switch to your target algorithm/env and iterate on observation/action alignment.
