# Algorithms

Algorithms run on the server and are selected via Tyro subcommands.

## Quickstart

Two minimal commands.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

## Verify

List registered algorithms.

```bash
plugrl-run-server --help
```

Run a smoke test loop.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 1
```

## How selection works

Command shape.

- `<policy_uid> <policy_variant> <algo_uid> <algo_variant>`

Config sources.

- Policy and algorithm configs are independent dataclasses.
- Override fields with `--policy.*` and `--algo.*`.

Discovery.

- Registries live in `plugrl_server.policy.registration` and `plugrl_server.algorithm.registration`.
- Your modules must be imported before the CLI is built.

## Built-in algorithms

Five UIDs are registered in `plugrl-server`.

- `fpo`: FPO training loop - the algorithm the quickstarts run
- `dummy`: protocol and connectivity smoke tests
- `eval`: run a policy without training it, optionally from
  `--algo.policy-checkpoint-path`
- `dppo`: DPPO training loop, needs the `dppo` extra
- `dppo-dist`: distributed DPPO via the Ray launcher, needs the `dppo` extra

Without the `dppo` extra installed, `plugrl-run-server` logs
`Could not import DPPO algorithm module` at startup and the `dppo-dist`
subcommand is absent.

## Troubleshooting

- Algorithm UID not listed: registration module was not imported.
- CLI flags conflict across policy and algo: keep shared concepts in one config.

## Next steps

- [Training loop](ppo.md)
- [Custom algorithm](custom_algorithm.md)
- [Policies](../policy/index.md)
