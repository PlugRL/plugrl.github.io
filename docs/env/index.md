# Environments

Environments run on the env client and are created via Gymnasium.

## Quickstart

List options for one environment.

```bash
plugrl-run-env-client dummy-v1 --help
```

Run one short episode.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## Verify

- Env client prints server metadata.
- Env client resets and steps the environment.

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

## Built-in environment IDs

- `dummy-v1`
- `mujoco-v1` - needs the `mujoco` extra; this is the env the quickstart uses
- `classic-v1`
- `atari-v1`
- `robomimic-v1`
- `d4rl-*` when optional deps are installed
- `libero-*` when optional deps are installed

## Common env client flags

- `--num-procs`: run multiple env client processes
- `--server-host`, `--server-port`: server address
- `--recorder.video-fps`: output fps for recorded mp4 artifacts

There is no flag for running an env at a fixed wall-clock FPS. `--use-real-time`
and `--fps` were listed here and do not exist on this CLI.

## Troubleshooting

- Env ID not found in CLI: registration module was not imported.
- Multi process init conflicts: try `--runner.use-env-lock` if your env is heavy.

## Next steps

- [Custom environment](custom_env.md)
- [Get Started](../user_guide/get_started.md)
