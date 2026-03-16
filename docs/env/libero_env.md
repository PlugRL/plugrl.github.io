# Libero environment

Run Libero tasks in `plugrl-env-client` via an optional dependency group.

## Install

Install env client with Libero extras.

```bash
pip install -e ".[libero]"
```

## Quickstart

Inspect the CLI config.

```bash
plugrl-run-env-client libero-v1 --help
```

Run a few episodes.

```bash
plugrl-run-env-client libero-v1 --num-episodes 10 --server-host 127.0.0.1 --server-port 8000
```

## Verify

- Env client can create the Libero env.
- Episodes run without init errors.

## Troubleshooting

- Multi process init conflicts: try `--use-env-lock`.

## Next steps

- [Environments](index.md)
- [Get Started](../user_guide/get_started.md)
