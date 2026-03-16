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

Env client creates envs via Gymnasium.

```py
env = gym.make(env_id, config=config_dataclass, max_episode_steps=max_episode_steps)
```

## Built-in environment IDs

- `dummy-v1`
- `classic-v1`
- `atari-v1`
- `robomimic-v1`
- `d4rl-*` when optional deps are installed
- `libero-*` when optional deps are installed

## Common env client flags

- `--num-workers`: run multiple env client processes
- `--server-host`, `--server-port`: server address
- `--use-remote-viewer`: stream observations to the viewer
- `--use-real-time`, `--fps`: fixed FPS for debugging

## Troubleshooting

- Env ID not found in CLI: registration module was not imported.
- Multi process init conflicts: try `--use-env-lock` if your env is heavy.

## Next steps

- [Custom environment](custom_env.md)
- [Get Started](../user_guide/get_started.md)
