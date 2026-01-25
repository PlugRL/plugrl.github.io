## Libero Environment

`plugrl-worker` provides Libero integration behind an optional dependency group.

### Install

Install the worker with the Libero extras (exact command depends on your packaging workflow). Conceptually:

```bash
pip install -e ".[libero]"
```

### Run

Use `--help` to see the registered Libero env IDs and their config fields:

```bash
plugrl-run-worker libero-v1 --help
```

Then run with your desired settings:

```bash
plugrl-run-worker libero-v1 --num-episodes 10 --server-host 127.0.0.1 --server-port 8000
```

### Notes

- Libero environments can be heavier than dummy/classic; consider `--use-env-lock` if you see initialization issues when using multiple processes.
