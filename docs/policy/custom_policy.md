## Custom Policy

Policies are discovered via **import-time registration**: when a module is imported, decorators add the policy/config into the registry, and the server CLI can then see it.

This naturally creates two cases:

- **Built-in policies** ship inside `plugrl-server` and are imported automatically.
- **Custom policies** can be plug-in: you implement them in your own package and import them before launching the server.

To add a new policy, you typically:

1. Define a policy config (dataclass) for Tyro CLI.
2. Implement a `BasePolicy` subclass.
3. Register both, and make sure the module is imported so the CLI can discover it.

This is exactly how the SAC example does it in `plugrl-server/examples/sac/sac_policy.py`.

### Where to put the code

You have two equally valid options.

#### Option A: contribute it to `plugrl-server`

In `plugrl-server/src/plugrl_server/policy/<your_policy>/...`:

- Implementation: `plugrl_server/policy/<your_policy>/<your_policy>_policy.py`
- Registration (side-effect import): `plugrl_server/policy/<your_policy>/__init__.py`
- Ensure it is imported from `plugrl_server/policy/__init__.py` (so `import plugrl_server` loads it)

#### Option B: keep it as a plug-in (no need to edit `plugrl-server`)

- Put the policy module in your own package (e.g. `my_pkg/plugrl_policies.py`).
- Ensure your package gets imported before the server CLI is built.

The only “integration step” is the import itself.

### Template

```python
import dataclasses

from plugrl_server.policy.base_policy import BasePolicy, BasePolicyConfig, InternalState
from plugrl_server.policy.registration import register_policy, register_policy_config

UID = "your-policy"


@register_policy_config(UID)
@dataclasses.dataclass
class YourPolicyConfig(BasePolicyConfig):
	# Add fields needed by your policy
	...


@register_policy(UID)
class YourPolicy(BasePolicy):
	def prepare_observation(self, _obs: dict):
		# Convert worker observation dict -> tensor / tensordict
		...

	def get_action_and_internal_state(self, _obs: dict):
		# Return an action (numpy or tensor) + InternalState
		...

	def fake_internal_state(self, batch_size: int) -> InternalState:
		# Create an InternalState with correct shapes/dtypes for buffers
		...
```

### Notes

- A policy alone is not “run”: it is used by an algorithm. The algorithm decides what fields it needs in `InternalState`.
- For a concrete reference, see SAC policy registration and action sampling logic in `plugrl-server/examples/sac/sac_policy.py`.

### Walkthrough: SAC

SAC is a compact policy reference. It shows:

- **Registration**: `SACPolicyConfig` is registered as `"sac_policy"`. `SACPolicy` is registered with the same UID.
- **Observation contract**: `prepare_observation()` reads `obs["states"]["obs"]`, converts it to a `torch.Tensor`, and places it on the policy device.
- **Action shape**: `get_action_and_internal_state()` returns actions shaped like `[B, 1, action_dim]`. The implementation adds the middle dimension via `action_numpy[:, None]`.
- **Warmup random actions**: the algorithm requests random actions before `learning_starts` using the `random_sample` flag.
- **InternalState usage**: SAC stores `internal_state.obs` and `internal_state.action` for replay buffer insertion. `logprob/entropy/value` are kept for a consistent `InternalState` schema, even though SAC does not use them.

### Verify

Use `dummy` as a smoke test to verify that the policy is visible in the server CLI and that the server/worker loop runs.

If your policy lives in an external package, a minimal pattern is “import first, then delegate to the real entrypoint”:

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
	dummy default <your-policy> default
```

Then run the worker:

```bash
plugrl-run-worker dummy-v1 --num-episodes 1
```

If this works, replace `dummy` with your target algorithm/env and iterate on shapes and performance.
