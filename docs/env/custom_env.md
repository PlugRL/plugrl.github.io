# Custom environment

Add an env-client-side environment so `plugrl-run-env-client <env_id>` can discover and run it.

## Quickstart

Create an env class and a config dataclass, then register both.

```py
import dataclasses
import numpy as np

from plugrl_env_client.envs.base_env import Action, BaseEnv, BaseEnvConfig, Observation
from plugrl_env_client.utils.registration import register_env, register_env_config

UID = "custom-v1"


@register_env_config(UID)
@dataclasses.dataclass
class CustomConfig(BaseEnvConfig):
    ...


@register_env(UID)
class CustomEnv(BaseEnv):
    def __init__(self, config: CustomConfig, worker_id: int | None = None, total_workers: int | None = None):
        super().__init__(config=config)
        self.worker_id = worker_id
        self.total_workers = total_workers

    def prepare_obs(self, obs: np.ndarray) -> Observation:
        return Observation(images={}, states={}, text="")

    def reset(self, *, seed: int | None = None, options: dict | None = None) -> tuple[Observation | None, dict]:
        ...

    def step(self, action: Action) -> tuple[Observation | None, float, bool, bool, dict]:
        ...
```

## Verify

Env should appear as a CLI subcommand.

```bash
plugrl-run-env-client custom-v1 --help
```

Run one episode against a dummy server.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client custom-v1 --num-episodes 1
```

## Contract

- Env inherits `BaseEnv`.
- Config inherits `BaseEnvConfig`.
- Implement `reset` and `step`.
- Convert raw env outputs into `Observation` in `prepare_obs`.

## Registration

- `register_env_config` registers the config dataclass.
- `register_env` registers the env class.
- `register_env` supports optional parameters such as `max_episode_steps`.

## Troubleshooting

- Env ID not listed: module import did not run.
- Multi process init conflicts: try `--use-env-lock`.

## Next steps

- [Environments](index.md)
- [Remote viewer](../user_guide/get_started.md)