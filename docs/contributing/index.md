# Contributing

Local development guide for extending PlugRL.

## Quickstart

Set up the repo you are changing.

```bash
cd plugrl-server
uv sync
```

If you are working on the env client, run the same commands in `plugrl-env-client`.

Enable pre-commit hooks.

```bash
uv run pre-commit install
```

## Verify

Run a minimal end-to-end smoke test.

```bash
# Terminal 1: plugrl-server
uv run plugrl-run-server dummy-policy default dummy default

# Terminal 2: plugrl-env-client
uv run plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## What to extend

- Environments: env-client-side (`plugrl-env-client`)
- Policies: server-side (`plugrl-server`)
- Algorithms: server-side (`plugrl-server`)

## Next steps

- [Pre-commit](pre_commit.md)
- [Contributing: Environment](env.md)
- [Contributing: Policy](policy.md)
- [Contributing: Algorithm](algorithm.md)
