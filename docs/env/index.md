# Environments

Environments run on the env client and are created via Gymnasium.

## Quickstart

List the options for one environment, from inside `plugrl-env-client`.

```bash
uv run plugrl-run-env-client dummy-v1 --help
```

Run a few short episodes against a dummy server.

```bash
# Terminal A, in plugrl-server
uv run plugrl-run-server dummy-policy default dummy default

# Terminal B, in plugrl-env-client
uv run plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

## Verify

- The env client prints `Server metadata: {...}`.
- It resets and steps the environment, and exits 0 after the episodes.

## How environments are created

Env client creates envs with `gym.make_vec`. This is the call in
`plugrl_env_client/runner/run.py`.

```py
env = gym.make_vec(
    env_id,
    num_envs=num_envs,
    vectorization_mode="vector_entry_point",
    config=config_dataclass,
    max_episode_steps=max_episode_steps,
    process_id=process_id,
    total_processes=total_processes,
)
```

`register_env` registers each env with `entry_point=None` and only a
`vector_entry_point`, so plain `gym.make(env_id, ...)` fails with
`<env_id> registered but entry_point is not specified`. This page previously
showed the `gym.make` form; that form never worked.

The CLI finds an environment only if its module was imported before the CLI
was built. It imports every `*_env.py` file under `plugrl_env_client/envs/`
itself; code anywhere else has to import itself first. Both ways are in
[Custom environment](custom_env.md).

## Built-in environment IDs

Only `dummy-v1` works on a plain `uv sync`. Every other family needs its
extra, e.g. `uv sync --extra classic`; without it the ID is missing from the
CLI and startup prints a `Skip loading env module ...` warning naming the
extra.

| Env ID | Extra | What it runs |
|---|---|---|
| `dummy-v1` | none | Random images, states and rewards. For connectivity checks |
| `mujoco-v1` | `mujoco` | Gymnasium's MuJoCo tasks, `HalfCheetah-v5` by default (`--env.name`). The quickstart env |
| `classic-v1` | `classic` | Gymnasium's classic control, `CartPole-v1` by default |
| `atari-v1` | `atari` | ALE Atari games, `BreakoutNoFrameskip-v4` by default |
| `d4rl-v1` | `d4rl` | D4RL's MuJoCo tasks, `hopper-medium-v2` by default |
| `robomimic-v1` | `robomimic` | robomimic's robosuite tasks; see below |
| `libero-v1` | `libero` | LIBERO task suites; see [Libero environment](libero_env.md) |

`robomimic-v1` takes `--env.name` from `lift`, `can`, `square` and
`transport`, each also as an `-img` variant (default `can-img`). The `-img`
variants add the wrist cameras' images to the observation; the others carry
only the rendered `agentview` frame beside the states. An episode
ends as terminated on the step the task succeeds (turn that off with
`--env.no-terminate-on-success`), and is truncated at `--env.horizon`, which
defaults to robomimic's own rollout horizon: 400 steps for lift, can and
square, 700 for transport. It runs one env per process, and it refuses
`--runner.seed`, because the robosuite simulation underneath is not seeded.
The `robomimic` extra pins MuJoCo 2.3.7 and robosuite 1.4.1, so it needs an
environment of its own, apart from the `mujoco` extra; see
[Libero environment](libero_env.md#install). It also builds `egl-probe` with
CMake, so install `cmake` first.

## Common env client flags

- `--num-envs`: environments per client process
- `--num-procs`: run multiple env client processes
- `--server-host`, `--server-port`: server address. Always pass
  `--server-host`; its default, `0.0.0.0`, is not connectable on Windows
- `--runner.seed`: base seed; without it episodes differ between runs
- `--exp-name`: names the output directory, `runs/<exp-name>/`

Recording is off by default. `--recorder.episode-freq N` records every Nth
finished episode: its first and last observation go under
`runs/<exp-name>/rollout/proc_000/sampled/`. Add `--recorder.record-video` to
also write an mp4 per image key when the recorded episode is env 0's;
`--recorder.video-fps` sets its frame rate. Videos need ffmpeg, which the
base install leaves out: add the `video` extra (`uv sync --extra video`,
alongside the others). Only process 0 records unless you pass
`--recorder.no-thread0-only`.

There is no flag for running an env at a fixed wall-clock FPS. `--use-real-time`
and `--fps` were listed here and do not exist on this CLI.

## Troubleshooting

- Env ID not found in CLI: its extra is not installed, or its module was not imported.
- Multi process init conflicts: try `--runner.use-env-lock` if your env is heavy.

## Next steps

- [Custom environment](custom_env.md)
- [Get Started](../user_guide/get_started.md)
