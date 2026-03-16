# PlugRL

PlugRL is an RL infrastructure for distributed experiments with a clean split between training and environment execution.

> Note: PlugRL is a suite of Python packages. You can keep envs, policies, and algorithms in your own packages and import them on the side that uses them.

## Quickstart

Run a connectivity smoke test.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

## Verify

- Server prints a WebSocket listening address.
- Env client prints server metadata and starts stepping episodes.

## Components

- `plugrl-server`: training server, runs algorithm, policy, checkpoints, tracking
- `plugrl-env-client`: environment runner, collects rollouts
- `plugrl-protocol`: transport, message types, and serialization (WebSocket + msgpack)
- `plugrl-monitor`: optional remote viewer for observations

## Common options

- Env client connects to server via `--server-host` and `--server-port`.
- Stream observations with `--use-remote-viewer`, `--viewer-host`, `--viewer-port`.
- Use `plugrl-run-server-ray` for Ray-based distributed launch.

## Next steps

- [User Guide](user_guide/index.md)
- [Get Started](user_guide/get_started.md)
- [Algorithms](algorithm/index.md)
- [Environments](env/index.md)
- [Policies](policy/index.md)
- [Contributing](contributing/index.md)
