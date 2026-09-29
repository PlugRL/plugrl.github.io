# Pre-commit

Run lightweight checks before committing.

## Quickstart

Run these commands in the repo you are working on.

```bash
uv sync
uv run pre-commit install
uv run pre-commit run --all-files
```

In `plugrl-env-client`, add the `--extra` flags you use to `uv sync`
(for example `uv sync --extra mujoco`). A plain `uv sync` removes the
packages of every extra you leave out.

## Notes

- The first run may auto-fix files. Stage changes and run again.
- Linting and formatting are handled by `ruff` and `ruff-format`.
- `plugrl-server` requires Python `>=3.11,<3.14`; `plugrl-env-client`
  requires `>=3.10,<3.13`.
- Each `.pre-commit-config.yaml` pins the hooks' Python with
  `default_language_version`: `python3.11` in `plugrl-server`, `python3.10` in
  `plugrl-env-client`. pre-commit builds the hook environments with the
  `.venv`'s own Python if its version matches, and otherwise needs that
  version installed somewhere it can find it.

## Next steps

- [Contributing](index.md)
