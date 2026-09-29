# User Guide

Run PlugRL end to end: start a server, then start one or more env clients.

## Quickstart

After the install in [Get Started](get_started.md), run each command from
inside its own repository, in its own terminal:

```bash
# in plugrl-server
uv run plugrl-run-server fpo-policy default fpo default \
    --policy.device cpu --algo.global-steps 500000 --algo.buffer-size 4096

# in plugrl-env-client
uv run plugrl-run-env-client mujoco-v1 --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

That pair learns. [Get Started](get_started.md) explains the two server flags
that are not optional, and has the dummy connectivity check.

## Verify

- The server prints `Agent Server is listening on 0.0.0.0:8000`.
- The env client prints `Server metadata: {...}` and steps episodes.

## Workflow

1. Start a training server with `uv run plugrl-run-server` in `plugrl-server`.
   (There is also `plugrl-run-server-ray`, but it is not a supported path
   today - see [Get Started](get_started.md).)
2. Start one or more env clients with `uv run plugrl-run-env-client <env_id>`
   in `plugrl-env-client`.

## Components

- `plugrl-server`: batches inference across connected clients, runs learning and checkpointing
- `plugrl-env-client`: creates Gymnasium envs, sends `infer`, receives `action`, sends `feedback`
- `plugrl-protocol`: WebSocket transport, message types, and msgpack serialization

## Common options

- The server listens on `0.0.0.0:8000` by default, which means every
  interface. Set it with `--host` and `--port`.
- The env client connects to `--server-host` and `--server-port`. Always pass
  `--server-host`: its default is `0.0.0.0`, which a client on Windows cannot
  connect to. On the server's own machine use `127.0.0.1`.

## Troubleshooting

- Env client keeps retrying: the server is not listening yet, or
  `--server-host` / `--server-port` is wrong.
- An env ID or policy is missing from the CLI: its extra is not installed, or
  (for your own code) its module was never imported. The env client prints a
  `Skip loading env module ...` warning that names the missing extra; the
  server leaves the policy out without a message.

## Next steps

- [Get Started](get_started.md)
- [Algorithms](../algorithm/index.md)
- [Environments](../env/index.md)
- [Policies](../policy/index.md)
