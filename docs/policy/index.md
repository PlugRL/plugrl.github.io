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
- `pi0-policy`: OpenPI policy, requires a checkpoint path

OpenPI example.

```bash
plugrl-run-server pi0-policy default dppo hopper --policy.checkpoint_path /path/to/checkpoint
```

## Troubleshooting

- Policy UID not listed: registration module was not imported.
- OpenPI import fails: complete the OpenPI local setup in the server repo.

## Next steps

- [Custom policy](custom_policy.md)
- [DPPO policies](dppo_policy.md)
