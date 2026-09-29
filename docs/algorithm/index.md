# Algorithms

Algorithms run on the server and are selected via Tyro subcommands.

## Quickstart

Two minimal commands.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

## Verify

List registered algorithms. They are listed one level down, after a policy
and its variant. The top-level `plugrl-run-server --help` lists policy UIDs
only.

```bash
plugrl-run-server dummy-policy default --help
```

Run a smoke test loop.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 1
```

## How selection works

Command shape.

- `<policy_uid> <policy_variant> <algo_uid> <algo_variant>`

Config sources.

- Policy and algorithm configs are independent dataclasses.
- Override fields with `--policy.*` and `--algo.*`.

Discovery.

- Registries live in `plugrl_server.policy.registration` and `plugrl_server.algorithm.registration`.
- Your modules must be imported before the CLI is built: the module that
  registers the config and the module that registers the class. See
  [Custom algorithm](custom_algorithm.md#file-layout).

## Built-in algorithms

Six UIDs are registered in `plugrl-server`.

- `fpo`: FPO training loop - the algorithm the quickstarts run. Needs a flow
  policy: `fpo-policy` or `pi0-policy`.
- `dppo`: DPPO training loop. Takes a diffusion or a flow policy:
  `dppo-policy`, `fpo-policy` or `pi0-policy`. Variants `hopper`, `walker`,
  `cheetah`, `square` and `libero` (the one for `pi0-policy`).
- `ppo`: PPO for Gaussian policies, see below.
- `eval`: run a policy without training it, optionally from
  `--algo.policy-checkpoint-path`
- `dummy`: protocol and connectivity smoke tests
- `dppo-dist`: DPPO for the Ray launcher `plugrl-run-server-ray` only. See the
  note in [Training loop](ppo.md#ray-launcher).

No algorithm needs the `dppo` extra. Two policies do: `dppo-policy` and
`dppo-gaussian-policy`. Without the extra, those two policy UIDs are missing
from the CLI, with no error and no warning. Install it with
`uv sync --extra dppo` in `plugrl-server`.

For `ppo` and `dppo`, a run is `--algo.train-itrs` iterations of
`--algo.buffer-size` frames. Both set `global_steps` from those two, so
`--algo.global-steps` has no effect on them.

### `ppo`

PPO as CleanRL's `ppo_continuous_action.py` runs it: clipped surrogate,
clipped value loss, advantages normalized per minibatch, rewards scaled by a
running estimate of the return's deviation. It needs a policy with
`evaluate_actions`, which today means `gaussian-policy` or
`dppo-gaussian-policy`. It refuses a policy run with `--policy.deterministic`.

Variants.

- `default`: CleanRL's MuJoCo settings, 488 iterations of 2048 frames.
- `dppo-square`: DPPO's Gaussian PPO baseline on robomimic square, for
  `dppo-gaussian-policy` started from DPPO's released checkpoint.

```bash
# MuJoCo. The default sizes, 17 and 6, fit HalfCheetah and Walker2d; Hopper is 11 and 3.
plugrl-run-server gaussian-policy default ppo default \
  --policy.obs-dim 17 --policy.action-dim 6

# robomimic square, from DPPO's released Gaussian checkpoint
plugrl-run-server dppo-gaussian-policy default ppo dppo-square \
  --policy.checkpoint-path /path/to/square_gaussian_pretrained.pt
```

## Troubleshooting

- Algorithm UID not listed under `plugrl-run-server <policy> <variant> --help`: registration module was not imported.
- UID listed, but the run dies with `KeyError: 'Algorithm <uid> is not registered.'`: the config module was imported and the class module was not.
- `dppo-policy` or `dppo-gaussian-policy` missing from the CLI: the `dppo` extra is not installed.
- CLI flags conflict across policy and algo: keep shared concepts in one config.

## Next steps

- [Training loop](ppo.md)
- [Custom algorithm](custom_algorithm.md)
- [Policies](../policy/index.md)
