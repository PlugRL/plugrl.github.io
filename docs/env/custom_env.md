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
    def __init__(
        self,
        config: CustomConfig,
        num_envs: int = 1,
        process_id: int | None = None,
        total_processes: int | None = None,
    ):
        super().__init__(
            config=config,
            num_envs=num_envs,
            process_id=process_id,
            total_processes=total_processes,
        )

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
- `__init__` takes `config, num_envs, process_id, total_processes`, the same
  four as `BaseEnv.__init__` and as the shipped `MuJoCoEnv`. `EnvSpec.make`
  always passes `num_envs`, and `gym.make_vec` forwards `process_id` and
  `total_processes`. An earlier version of this page used `worker_id` and
  `total_workers`; those names appear nowhere in `plugrl-env-client`, and a
  class with that signature raises `TypeError` on the unexpected `num_envs`.

## Registration

- `register_env_config` registers the config dataclass.
- `register_env` registers the env class.
- `register_env` supports optional parameters such as `max_episode_steps`.

## Troubleshooting

- Env ID not listed: module import did not run.
- Multi process init conflicts: try `--runner.use-env-lock`.

## Next steps

- [Environments](index.md)
- [Get Started](../user_guide/get_started.md)