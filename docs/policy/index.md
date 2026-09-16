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

- `dummy-policy`: random actions for protocol smoke tests
- `dppo-policy`: DPPO diffusion policy
- `fpo-policy`: FPO flow-matching policy, used by the get-started run
- `pi0-policy`: OpenPI policy, requires a checkpoint path

OpenPI example. `pi0-policy` is a flow policy, so it pairs with `fpo` or with
`eval` - not with `dppo`, which expects a diffusion policy.

```bash
plugrl-run-server pi0-policy default eval default \
  --policy.name pi05_libero \
  --policy.checkpoint-path /path/to/checkpoint \
  --policy.device cuda
```

## Troubleshooting

- Policy UID not listed: registration module was not imported.
- OpenPI import fails: complete the OpenPI local setup in the server repo.

## Next steps

- [Custom policy](custom_policy.md)
- [DPPO policies](dppo_policy.md)
