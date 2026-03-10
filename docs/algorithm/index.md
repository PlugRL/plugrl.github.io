## Overview

Algorithms live in `plugrl-server` and are selected via Tyro subcommands.

In practice, you pick a triple:

`<policy> <policy_variant> <algo> <algo_variant>`

Examples:

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

The CLI is assembled from registries:

- `plugrl_server.algorithm.registration`
- `plugrl_server.policy.registration`

This means:

- adding a new algorithm/policy usually requires registering a config and a factory
- all configs are dataclasses and can be overridden by flags like `--algo.*` / `--policy.*`

## Implemented algorithms (server-side)

- `dummy`: smoke-test the server/worker protocol
- `dppo`: diffusion-based policy optimization (see server README for common runs)
- `dppo-dist`: experimental distributed DPPO (via Ray launcher)
