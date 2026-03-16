# Pre-commit

Run lightweight checks before committing.

## Quickstart

Run these commands in the repo you are working on.

```bash
uv sync
uv run pre-commit install
uv run pre-commit run --all-files
```

## Notes

- The first run may auto-fix files. Stage changes and run again.
- Formatting is handled by `ruff-format`.
- `plugrl-server` requires Python `>=3.11`.

## Next steps

- [Contributing](index.md)
