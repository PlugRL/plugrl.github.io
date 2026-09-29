# Policies

Policies run on the server and are selected together with the algorithm.

## Quickstart

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

## Verify

Confirm the policy UID is visible in the CLI.

```bash
plugrl-run-server --help
```

## Built-in policies

- `dummy-policy`: random actions for protocol smoke tests. By default they are
  continuous, 7-dimensional, with a horizon of 4, as the env client's
  `dummy-v1` expects.
- `fpo-policy`: FPO flow-matching policy, used by the get-started run
- `dppo-policy`: DPPO diffusion policy. Needs the `dppo` extra.
- `gaussian-policy`: CleanRL's Gaussian MLP, trained with `ppo`.
  `--policy.deterministic` acts with the mean instead of a sample, for
  evaluation with `eval`.
- `dppo-gaussian-policy`: DPPO's Gaussian MLP, which loads the checkpoints
  DPPO releases. Trained with `ppo`. Needs the `dppo` extra.
- `pi0-policy`: OpenPI policy, requires a checkpoint path. Needs OpenPI.

Which algorithm takes which policy.

- `fpo`: flow policies, `fpo-policy` and `pi0-policy`.
- `dppo`: diffusion policies and flow policies, since the flow base class
  subclasses the diffusion one: `dppo-policy`, `fpo-policy`, `pi0-policy`.
- `ppo`: `gaussian-policy`, `dppo-gaussian-policy`.
- `eval` and `dummy`: any policy.

A policy whose dependencies are missing is also missing from the CLI, with no
error. `dppo-policy` and `dppo-gaussian-policy` need the `dppo` extra
(`uv sync --extra dppo` in `plugrl-server`). `pi0-policy` needs OpenPI, set up
as `plugrl-server/src/plugrl_server/policy/openpi/README.md` describes.

OpenPI example. `pi0-policy` runs with `eval`, with `fpo`, and with `dppo`
through its `libero` variant, which
[E25](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e25-pi0-dppo)
ran end to end.

```bash
plugrl-run-server pi0-policy default eval default \
  --policy.name pi05_libero \
  --policy.checkpoint-path /path/to/checkpoint \
  --policy.device cuda
```

## Troubleshooting

- Policy UID not listed: registration module was not imported, or the policy's dependencies are not installed (see above).
- `pi0-policy` fails at startup: complete the OpenPI local setup in the server repo.

## Next steps

- [Custom policy](custom_policy.md)
- [DPPO policies](dppo_policy.md)
