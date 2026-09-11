# PlugRL

PlugRL is an RL infrastructure for distributed experiments with a clean split between training and environment execution.

> Note: PlugRL is a suite of Python packages. You can keep envs, policies, and algorithms in your own packages and import them on the side that uses them.

## Quickstart

Two processes: a training server that holds the policy, and an env client
that runs environments and asks it for actions. This pair actually learns -
FPO on HalfCheetah-v5, CPU only, no GPU and no assets to download.

```bash
# Terminal 1 - the training server
plugrl-run-server fpo-policy default fpo default \
    --port 8000 --policy.device cpu \
    --algo.global-steps 500000 --algo.buffer-size 4096

# Terminal 2 - the environment
plugrl-run-env-client mujoco-v1 \
    --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

Episode return climbs out of the -300s within a few minutes. `HalfCheetah-v5`
has a 17-dimensional observation and a 6-dimensional action, which are
exactly `fpo-policy`'s defaults, so nothing needs configuring. The
environment needs `plugrl-env-client[mujoco]`.

!!! warning "`--algo.buffer-size` is not decoration"

    FPO learns when its rollout buffer fills, or when the run reaches its
    last step. At the default `buffer_size=983040`, a run shorter than about
    a million steps therefore learns **exactly once, at the very end** -
    which gives you a single point instead of a curve.

### Just checking connectivity?

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

The dummy algorithm's `learn` is a sleep - it moves no weights. Use it to
confirm the two sides talk to each other, not to train anything.

## Verify

- The server prints a WebSocket listening address.
- The env client prints the server's metadata - policy name, action shape -
  and starts stepping episodes.
- With `fpo`, the server prints a metrics table whose `rollout/reward` rises.

## Components

- `plugrl-server`: training server, runs algorithm, policy, checkpoints, tracking
- `plugrl-env-client`: environment runner, collects rollouts
- `plugrl-protocol`: transport, message types, and serialization (WebSocket + msgpack)

The boundary between the first two is [the protocol](protocol/index.md), and
it is specified rather than implied: an env client does not have to be
Python, or be this codebase.

## Common options

- The env client connects to the server via `--server-host` and `--server-port`.
- `--num-procs` runs several env client processes against one server.

!!! note "On `plugrl-run-server-ray`"

    There is a Ray-based launcher, but it is **not a supported path today**.
    It requires the `dppo` extra, builds its worker list from the *local*
    GPU count so a multi-node cluster still only sees the head node, and its
    server speaks an older dialect of the protocol than the WebSocket one -
    see [SPEC.md section 5.3](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md).
    Use `plugrl-run-server` unless you are working on the Ray path itself.

## Next steps

- [User Guide](user_guide/index.md)
- [Get Started](user_guide/get_started.md)
- [Protocol](protocol/index.md)
- [Algorithms](algorithm/index.md)
- [Environments](env/index.md)
- [Policies](policy/index.md)
- [Contributing](contributing/index.md)
