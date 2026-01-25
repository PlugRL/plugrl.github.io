## Overview

Environments run in **plugrl-worker** and are created via Gymnasium:

```python
env = gym.make(<env_id>, config=<dataclass_config>, max_episode_steps=...)
```

The worker exposes a single CLI entrypoint:

```bash
plugrl-run-worker <env> [OPTIONS]
```

## Built-in environment types

From the worker package, commonly available IDs include:

- `dummy-v1` (smoke tests)
- `classic-v1` (classic control)
- `atari-v1`
- `robomimic-v1`
- `d4rl-*` (if optional deps installed)
- `libero-*` (if optional deps installed)

Use `--help` to see all flags for a specific env:

```bash
plugrl-run-worker dummy-v1 --help
```

## Useful worker flags

- `--num-workers`: spawn multiple worker processes
- `--server-host/--server-port`: server address
- `--use-remote-viewer`: stream observations to the viewer
- `--use-real-time` / `--fps`: run at a fixed FPS for debugging
