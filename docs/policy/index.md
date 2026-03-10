## Overview

Policies live in `plugrl-server` and are selected together with the algorithm via the Tyro CLI.

Examples:

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

## Built-in policies

- `dummy-policy`: random actions for protocol tests
- `dppo-policy`: DPPO policy (requires the corresponding components/checkpoints)
- `pi0-policy`: OpenPI policy (requires a checkpoint path)

For OpenPI:

```bash
plugrl-run-server pi0-policy default dppo hopper --policy.checkpoint_path /path/to/checkpoint
```
