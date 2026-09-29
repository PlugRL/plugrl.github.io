# Get Started

From nothing to a policy that is learning, in two terminals.

## Install

Neither package is on PyPI. Clone both and install each with `uv`:

```bash
git clone https://github.com/PlugRL/plugrl-server.git
git clone https://github.com/PlugRL/plugrl-env-client.git

cd plugrl-server     && uv sync && cd ..
cd plugrl-env-client && uv sync --extra mujoco && cd ..
```

`uv sync` puts each package, and its `plugrl-run-*` command, in that
repository's own `.venv`. So every command on these pages is run from inside
the repository it belongs to, with `uv run`, which uses that `.venv`.

`--extra mujoco` is what the quickstart below needs. The env client has one
extra per environment family; install only the ones you use. `uv sync`
removes whatever it was not asked for, so pass the same `--extra` flags every
time you run it. `uv run` leaves them alone.

The two packages can also live in one environment - the two dependency sets
do coexist, which is measured in `plugrl-server/experiments/e1-dependency-conflict/`.
Separate environments are simply the point of the split.

## Quickstart

Terminal A, the training server, in `plugrl-server`:

```bash
uv run plugrl-run-server fpo-policy default fpo default \
    --port 8000 --policy.device cpu \
    --algo.global-steps 500000 --algo.buffer-size 4096
```

Terminal B, the environment, in `plugrl-env-client`:

```bash
uv run plugrl-run-env-client mujoco-v1 \
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

`--server-host 127.0.0.1` is not optional either. The server listens on
`0.0.0.0`, meaning every interface. The client's default `--server-host` is
also `0.0.0.0`, and on Windows that is not an address a client can connect to.

## Verify

- The server prints `Agent Server is listening on 0.0.0.0:8000`.
- The env client prints `Server metadata: {...}`, including `action_dim` and
  `action_horizon`, and starts stepping episodes.
- The server's metrics show `rollout/reward` rising. On HalfCheetah it
  starts near -300 and climbs out within a few minutes.

`plugrl-server/experiments/e6-first-learning-curve/` holds a three-seed run
of exactly this, with the script that produced it.

## Where output goes

- Server: `<checkpoint-base-dir>/<algorithm>/<policy>/<exp-name>/`, for
  example `checkpoints/fpo/fpo-policy/<exp-name>/`. It holds one directory per
  saved step and a `tensorboard/` directory with the metrics.
  `--checkpoint-base-dir` defaults to `./checkpoints`. Without `--exp-name`
  the server makes up a name from the time.
- Env client: `runs/<exp-name>/`, under the directory the client was started
  from. `client_config.json` has every setting the client ran with,
  `logs/client.log` its log, and `rollout/proc_000/summary.json` the episode
  count, mean return, success rate and a timing breakdown.

## Just checking connectivity

```bash
# Terminal A, in plugrl-server
uv run plugrl-run-server dummy-policy default dummy default

# Terminal B, in plugrl-env-client
uv run plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

The dummy policy's default action - continuous, 7-dimensional, horizon 4 -
is what `dummy-v1` expects, so neither side needs more flags. The client
exits 0 after three episodes. The dummy algorithm's `learn` is a sleep and
moves no weights. Use it to confirm the two sides talk, not to train.

## Other policies

```bash
uv run plugrl-run-server dppo-policy default dppo hopper \
    --policy.checkpoint-path /path/to/pretrained.pt --exp-name my_dppo_exp
```

`dppo-policy` needs `uv sync --extra dppo`; without it the policy is not in
the CLI at all. It also needs a pretrained checkpoint: without
`--policy.checkpoint-path` it starts from random weights.

`pi0-policy` needs a GPU, a checkpoint, the `openpi` extra and the
`third_party/openpi` git submodule, which `git clone` does not fetch. Until
all of that is installed it is missing from the CLI. The steps are in the
[plugrl-server README](https://github.com/PlugRL/plugrl-server#training-pi0-openpi-with-fpo).

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
- `--resume` continues a run. Pass the same `--exp-name`, policy and
  algorithm as the run you are continuing (and the same
  `--checkpoint-base-dir`, if you set one), because together they name the
  checkpoint directory. Without `--exp-name` the server makes up a new name,
  finds no checkpoint there, and raises `FileNotFoundError`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Env client keeps retrying | The server is not listening yet, the address or firewall is wrong, or `--server-host` was left at `0.0.0.0` |
| `Torch not compiled with CUDA enabled` | Pass `--policy.device cpu` |
| Only one metrics row, at the very end | `--algo.buffer-size` is larger than the run |
| `--resume` raises `FileNotFoundError` | No checkpoint in `<checkpoint-base-dir>/<algorithm>/<policy>/<exp-name>/`: `--exp-name`, policy or algorithm differs from the run you meant, or that run saved nothing yet |
| `FileExistsError: Checkpoint directory ... already exists` | That `--exp-name` was used before. Pass `--resume`, `--overwrite` (deletes it), or a new name |
| An environment reports a missing extra | Install it, e.g. `uv sync --extra mujoco` |

## Next steps

- [User Guide](index.md)
- [Protocol](../protocol/index.md)
- [Algorithms](../algorithm/index.md)
- [Environments](../env/index.md)
- [Policies](../policy/index.md)
