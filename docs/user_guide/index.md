# User Guide

Run PlugRL end to end: start a server, then start one or more env clients.

## Quickstart

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

## Verify

- Server prints a WebSocket listening address.
- Env client prints server metadata and steps episodes.

## Workflow

1. Start a training server with `plugrl-run-server` or `plugrl-run-server-ray`.
2. Start one or more env clients with `plugrl-run-env-client <env_id>`.

## Components

- `plugrl-server`: batches inference across connected workers, runs learning and checkpointing
- `plugrl-env-client`: creates Gymnasium envs, sends `infer`, receives `action`, sends `feedback`
- `plugrl-protocol`: WebSocket transport, message types, and msgpack serialization

## Common options

- Server default address is `0.0.0.0:8000`.
- Env client connects via `--server-host` and `--server-port`.

## Troubleshooting

- Env client keeps retrying: confirm the server is listening and the address is reachable.
- Policy or algorithm not found in CLI: ensure the registration module is imported before the CLI is built.

## Next steps

- [Get Started](get_started.md)
- [Algorithms](../algorithm/index.md)
- [Environments](../env/index.md)
- [Policies](../policy/index.md)
