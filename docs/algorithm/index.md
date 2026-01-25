## Overview

Algorithms live in `plugrl-server` and are selected via Tyro subcommands.

In practice, you pick a triple:

`<algo> <algo_variant> <policy> <policy_variant>`

Examples:

```bash
plugrl-run-server dummy default dummy-policy default
plugrl-run-server dppo hopper dppo-policy default
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
