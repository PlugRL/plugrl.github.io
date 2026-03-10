## Custom Environment

To add a new environment that can run under `plugrl-worker`, you typically need:

1. A Gymnasium-compatible env (or wrapper) implementation.
2. A dataclass config that the CLI can expose.
3. Registration so `plugrl-run-worker <env>` can discover it.

### Recommended approach

- Implement your env in `plugrl_worker/envs/<your_env>/...`.
- Define a config dataclass that extends the worker's base config.
- Register the env ID and config in the worker registry.

### Verify

After registration, the env should appear as a subcommand:

```bash
plugrl-run-worker <your-env-id> --help
```

Then run it against a server (dummy is fine) to validate the protocol:

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-worker <your-env-id> --num-episodes 1
```

### Implementing a custom environment

PlugRL expects an environment class that inherits `plugrl_worker.envs.base_env.BaseEnv`, and a dataclass config that inherits `plugrl_worker.envs.base_env.BaseEnvConfig`.

In practice, you implement two classes (env + config) and register them. The implementation can live in `plugrl-worker`, or in your own package (as long as the worker runtime imports it so registration code runs).

#### Template

Create a module (e.g. `custom_env.py`) with:

```python
import dataclasses
import numpy as np

from plugrl_worker.envs.base_env import Action, BaseEnv, BaseEnvConfig, Observation
from plugrl_worker.utils.registration import register_env, register_env_config

UID = "custom-v1"


@register_env_config(UID)
@dataclasses.dataclass
class CustomConfig(BaseEnvConfig):
    # Add fields needed to construct your env, e.g. env_name/task_id/paths.
    ...


@register_env(UID)
class CustomEnv(BaseEnv):
    def __init__(
        self,
        config: CustomConfig,
        worker_id: int | None = None,
        total_workers: int | None = None,
    ):
        super().__init__(config=config)
        self.worker_id = worker_id
        self.total_workers = total_workers

    def prepare_obs(self, obs: np.ndarray) -> Observation:
        return Observation(
            images={...},
            states={...},
            text="...",
        )

    def reset(
        self,
        *,
        seed: int | None = None,
        options: dict | None = None,
    ) -> tuple[Observation | None, dict]:
        ...

    def step(self, action: Action) -> tuple[Observation | None, float, bool, bool, dict]:
        ...
```

#### Notes

- `Observation` / `Action` are standardized I/O types used by the worker.
- The leading `b` dimension in the type annotations represents a batch dimension. If your env is not vectorized, treat it as `b=1`.
- `register_env(...)` can take optional parameters such as `max_episode_steps` and `best_reward_threshold_for_success`.

### Using your environment

Once the module is imported and registration has run, your env should appear as a CLI subcommand:

```bash
plugrl-run-worker <your-env-id> --help
```

### Debugging tips

- Use `dummy` as a smoke test to validate connectivity first (host/port/protocol/options), then swap in your real algorithm/policy.
- If your env has images, try `--use-remote-viewer` to inspect observations quickly.