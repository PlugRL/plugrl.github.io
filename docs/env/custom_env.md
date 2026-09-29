# Custom environment

Add an env-client-side environment so `plugrl-run-env-client <env_id>` can discover and run it.

## Quickstart

Create an env class and a config dataclass, then register both. This one is
complete and runs as written: a point on a plane moves toward a goal, with a
2-dimensional continuous action.

```py
import dataclasses

import gymnasium as gym
import numpy as np

from plugrl_env_client.envs.base_env import (
    Action,
    BaseEnv,
    BaseEnvConfig,
    BoolArray,
    Observation,
    RewardArray,
)
from plugrl_env_client.utils.registration import register_env, register_env_config

UID = "Point-v1"  # the CLI subcommand is the lowercase form, point-v1


@register_env_config(UID)
@dataclasses.dataclass
class PointConfig(BaseEnvConfig):
    """Every field needs a default: register_env_config calls PointConfig()
    at import time. Each field becomes a flag, e.g. --env.step-size."""

    step_size: float = 0.1  # distance moved per step at full action
    goal_radius: float = 0.1  # how close counts as reaching the goal


@register_env(UID, max_episode_steps=100, best_reward_threshold_for_success=1.0)
class PointEnv(BaseEnv):
    """A point on a plane moves toward a goal. Reward 1.0 on reaching it."""

    def __init__(
        self,
        config: PointConfig,
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
        self.step_size = config.step_size
        self.goal_radius = config.goal_radius
        # The env client sizes its action buffer from single_action_space
        # (the action of ONE env) before the first step.
        self.single_action_space = gym.spaces.Box(-1.0, 1.0, (2,), np.float32)
        self.action_space = gym.spaces.Box(-1.0, 1.0, (num_envs, 2), np.float32)
        self.pos = np.zeros((num_envs, 2), dtype=np.float32)
        self.goal = np.zeros((num_envs, 2), dtype=np.float32)

    def _obs(self) -> Observation:
        # Every array has the env batch as its leading axis.
        return Observation(
            images={},
            states={"pos": self.pos.copy(), "goal": self.goal.copy()},
            text="move to the goal",
        )

    def reset(
        self, *, seed: int | None = None, options: dict | None = None
    ) -> tuple[Observation, dict]:
        self.seed_rngs(seed)  # first, so that --runner.seed has an effect
        idx = np.arange(self.num_envs)
        if options is not None and options.get("reset_indices") is not None:
            # After an episode ends the client resets only the finished envs.
            idx = np.asarray(options["reset_indices"], dtype=np.int64)
        # Draw from self.np_random, not np.random, or the seed does nothing.
        self.pos[idx] = self.np_random.uniform(-1.0, 1.0, (len(idx), 2))
        self.goal[idx] = self.np_random.uniform(-1.0, 1.0, (len(idx), 2))
        return self._obs(), {}  # the whole batch, not only the reset envs

    def step(
        self, actions: Action
    ) -> tuple[Observation, RewardArray, BoolArray, BoolArray, dict]:
        a = np.clip(np.asarray(actions, dtype=np.float32), -1.0, 1.0)  # (num_envs, 2)
        self.pos = np.clip(self.pos + self.step_size * a, -1.0, 1.0)
        dist = np.linalg.norm(self.pos - self.goal, axis=1)
        reached = dist < self.goal_radius
        reward = np.where(reached, 1.0, -dist).astype(np.float32)  # (num_envs,)
        terminated = reached  # bool, (num_envs,)
        truncated = np.zeros(self.num_envs, dtype=np.bool_)  # the time limit is added for you
        # Do not reset here. The client sends this terminal observation and
        # then calls reset(options={"reset_indices": ...}) itself.
        return self._obs(), reward, terminated, truncated, {}


if __name__ == "__main__":
    from plugrl_env_client.cli import main

    main()
```

## Where the file goes

The CLI can only offer an env whose module was imported before the CLI was
built. There are two ways to get there.

**Inside the env client.** Save the file as
`src/plugrl_env_client/envs/point/point_env.py` in your `plugrl-env-client`
checkout, with an empty `__init__.py` beside it like the shipped families.
At startup the CLI imports every file named `*_env.py` under
`plugrl_env_client/envs/`, so `uv run plugrl-run-env-client point-v1` finds
it. If that import fails, the CLI only prints a `Skip loading env module ...`
warning and the ID is missing.

**Anywhere else.** Keep the `if __name__ == "__main__":` block and run the
file itself with the env client's Python, for example from inside
`plugrl-env-client`:

```bash
uv run python /path/to/point_env.py point-v1 --help
```

Importing the file registers the env, and `plugrl_env_client.cli.main()` then
builds the CLI with it included. `plugrl-run-env-client` on its own never
imports your file, so it will not list the env. The CLI module builds its
list of envs when it is first imported, so if you write your own launcher,
import your env module before `plugrl_env_client.cli`.
`examples/pusht/pusht_env.py` in `plugrl-env-client` is built this way.

## Verify

The env should appear as a CLI subcommand (in-tree placement shown; for the
other, replace `plugrl-run-env-client` with `python /path/to/point_env.py`):

```bash
uv run plugrl-run-env-client point-v1 --help
```

Run it against a dummy server. The dummy policy's action is 7-dimensional by
default, for `dummy-v1`, so match this env's 2 dimensions:

```bash
# Terminal A, in plugrl-server
uv run plugrl-run-server dummy-policy default dummy default --policy.action-dim 2

# Terminal B, in plugrl-env-client
uv run plugrl-run-env-client point-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

The client exits 0. `runs/<exp-name>/rollout/proc_000/summary.json` has the
episode count and mean return.

## Contract

- Env inherits `BaseEnv`. Config inherits `BaseEnvConfig` and is a dataclass
  whose every field has a default.
- `__init__` takes `config, num_envs, process_id, total_processes`, the same
  four as `BaseEnv.__init__` and as the shipped `MuJoCoEnv`. `EnvSpec.make`
  always passes `num_envs`, and `gym.make_vec` forwards `process_id` and
  `total_processes`. Both are `None` unless the client runs with
  `--runner.pass-proc-id`. An earlier version of this page used `worker_id`
  and `total_workers`; those names appear nowhere in `plugrl-env-client`, and
  a class with that signature raises `TypeError` on the unexpected `num_envs`.
- `__init__` sets `single_action_space`, the space of one env's action. The
  client reads its shape and dtype before the first step; `action_space` is
  only a fallback.
- Everything is batched over `num_envs`. `step` receives actions of shape
  `(num_envs, *action_shape)` and returns `(Observation, reward, terminated,
  truncated, info)`: reward a float32 array of shape `(num_envs,)`,
  terminated and truncated bool arrays of shape `(num_envs,)`, info a dict.
  Every image and state array in the `Observation` has `num_envs` as its
  leading axis; `text` may be a single string.
- `reset(*, seed=None, options=None)` returns `(Observation, info)` for the
  whole batch. When episodes end, the client calls
  `reset(options={"reset_indices": ...})`: reset only those envs, and still
  return the observation of all of them. The option arrives with
  `num_envs=1` too, so do not pass it on to a wrapped Gymnasium env.
- `reset` calls `self.seed_rngs(seed)` first and draws all randomness from
  `self.np_random`. Otherwise `--runner.seed` does nothing. The client passes
  the seed on the first reset only.
- `step` must not reset the env itself. The step that reports terminated or
  truncated returns that episode's last observation; the client sends it as
  the terminal observation and resets the env afterwards
  ([SPEC.md §5.4](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md)).
  An env that resets inside `step` sends the next episode's first
  observation instead, and nothing raises.
- info can be `{}`. The client adds the `episode` statistics the server
  reads; the server reads nothing else from info.

## Registration

- `register_env_config(uid)` registers the config dataclass. It calls the
  class with no arguments at import time, which is why every field needs a
  default.
- `register_env(uid, ...)` registers the env class. The CLI subcommand is
  `uid` in lowercase.
- `max_episode_steps` adds a time limit that sets `truncated`.
  `--runner.max-episode-steps` overrides it at run time.
- `best_reward_threshold_for_success`: an episode counts as a success if any
  of its step rewards reaches this value. That decides the `s` the server
  averages into `rollout/success`. Without it, success is always false and
  `rollout/success` stays 0.
- Any other keyword argument is passed to the env's `__init__`, and must be
  JSON-serializable, or `register_env` raises `RuntimeError`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Env ID not listed | Its module was not imported. In-tree: the file name must end in `_env.py`; look for a `Skip loading env module` warning. Elsewhere: run the file itself, not `plugrl-run-env-client` |
| `Env must expose action space via single_action_space/action_space` | `__init__` did not set `single_action_space` |
| `Expected action shape tail (2,), got (7,)` | The server policy's action dimension differs from the env's; set `--policy.action-dim` on the server |
| `Expected reward shape (1,), got ()` | `step` returned a plain float; return an array of shape `(num_envs,)` |
| Multi process init conflicts | Try `--runner.use-env-lock` |

## Next steps

- [Environments](index.md)
- [Get Started](../user_guide/get_started.md)
