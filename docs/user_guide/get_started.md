# Get Started

From nothing to a policy that is learning, in two terminals.

## Install

Neither package is on PyPI. Clone both and install each with `uv`:

```bash
git clone git@github.com:PlugRL/plugrl-server.git
git clone git@github.com:PlugRL/plugrl-env-client.git

cd plugrl-server     && uv sync && cd ..
cd plugrl-env-client && uv sync --extra mujoco && cd ..
```

`--extra mujoco` is what the quickstart below needs. The env client has one
extra per environment family; install only the ones you use.

They can also live in one environment - the two dependency sets do coexist,
which is measured in `plugrl-server/experiments/e1-dependency-conflict/`.
Separate environments are simply the point of the split.

## Quickstart

Terminal A, the training server:

```bash
plugrl-run-server fpo-policy default fpo default \
    --port 8000 --policy.device cpu \
    --algo.global-steps 500000 --algo.buffer-size 4096
```

Terminal B, the environment:

```bash
plugrl-run-env-client mujoco-v1 \
    --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

`HalfCheetah-v5` is 17 observation dimensions and 6 action dimensions, which
are `fpo-policy`'s defaults, so nothing needs configuring.

!!! warning "Two settings that are not decoration"

    `--policy.device cpu` - the default is `cuda`, and without a GPU the
    server fails on startup with `Torch not compiled with CUDA enabled`.

    `--algo.buffer-size 4096` - FPO learns when its rollout buffer fills or
    when the run reaches its last step. At the default `983040`, a run
    shorter than about a million steps learns **once, at the very end**,
    giving a single point instead of a curve.

## Verify

- The server prints a WebSocket listening address.
- The env client prints the server's metadata, including `action_dim` and
  `action_horizon`, and starts stepping episodes.
- The server's metrics show `rollout/reward` rising. On HalfCheetah it
  starts near -300 and climbs out within a few minutes.

`plugrl-server/experiments/e6-first-learning-curve/` holds a three-seed run
of exactly this, with the script that produced it.

## Just checking connectivity

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

The dummy algorithm's `learn` is a sleep and moves no weights. Use it to
confirm the two sides talk, not to train.

## Other policies

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

DPPO needs `plugrl-server[dppo]` and a pretrained checkpoint. `pi0-policy`
needs a checkpoint too, and a GPU.

!!! note "The Ray launcher is not a supported path today"

    `plugrl-run-server-ray` exists, but it requires the `dppo` extra, builds
    its worker list from the *local* GPU count - so a multi-node cluster
    still only sees the head node - and its server speaks an older dialect of
    the protocol than the WebSocket one. Use `plugrl-run-server` unless you
    are working on the Ray path itself.

## Common options

- Set the server address with `--host` and `--port`.
- Control the episode count with `--num-episodes`.
- `--num-procs` runs several env client processes against one server.
- `--resume` requires an existing experiment directory under
  `--checkpoint-base-dir`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Env client keeps retrying | The server is not listening yet, or the address or firewall is wrong |
| `Torch not compiled with CUDA enabled` | Pass `--policy.device cpu` |
| Only one metrics row, at the very end | `--algo.buffer-size` is larger than the run |
| `--resume` raises `FileNotFoundError` | There are no checkpoints in that directory yet |
| An environment reports a missing extra | Install it, e.g. `uv sync --extra mujoco` |

## Next steps

- [User Guide](index.md)
- [Protocol](../protocol/index.md)
- [Algorithms](../algorithm/index.md)
- [Environments](../env/index.md)
- [Policies](../policy/index.md)
