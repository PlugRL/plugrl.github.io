# PlugRL

PlugRL is an **RL Infra** (Reinforcement Learning Infrastructure) for running distributed RL experiments with a clean split between training and environment execution.

Importantly, PlugRL is designed as a **plug-and-play suite of packages**, not a single monorepo-style codebase you must mirror.

- You can bring PlugRL into an existing project and only depend on what you need.
- Your envs/policies/algorithms can live in your own packages; just make them available on the side that uses them (worker or server) and register them there.
- This docs site describes the architecture and extension points; the repo layout is mostly for development and examples.

In a typical end-to-end run, you will use these roles (each installable independently):

- **plugrl-server**: training server (algorithm + policy + checkpointing + tracking)
- **plugrl-worker**: environment workers (Gymnasium env runner + rollout collection)
- **plugrl-client**: shared transport/protocol layer (WebSocket + msgpack)
- **plugrl-monitor**: lightweight remote viewer for debugging observations

PlugRL also ships with a few built-in baselines (e.g., `dummy` components for connectivity checks and DPPO-style setups) so you can run something out of the box and use it as a reference implementation.

If you're new, start at **User Guide → Get Started**.

## High-level architecture

1. Start a server (`plugrl-run-server` or `plugrl-run-server-ray`).
2. Start one or more workers (`plugrl-run-worker <env>`), which connect via WebSocket.
3. Workers repeatedly:
   - send observation (`infer`)
   - receive action chunk (`action`)
   - step the env and send feedback (`feedback`)
4. Server batches inference across connected workers, performs learning, and periodically saves checkpoints.

## What this docs site covers

- How to run a minimal end-to-end setup (dummy algo + dummy env)
- How to select algorithms/policies and configure them via Tyro CLI
- How environments are registered and configured in workers
- How to contribute new envs/policies/algorithms
