## Pre-commit

Both `plugrl-worker` and `plugrl-server` use `pre-commit` to run lightweight checks before committing.

In the repository you are working on:

1. Install dev dependencies:

   - `poetry install --with dev`

2. Install git hooks:

   - `poetry run pre-commit install`

3. Run all hooks (useful on first setup):

   - `poetry run pre-commit run --all-files`

Notes:

- It is normal for the first run to show “Failed” because some hooks auto-fix files. Stage the changes and run again.
- Formatting is handled by `ruff-format`.
- `plugrl-server` requires Python `>=3.11`. If Poetry complains about the Python version, switch the Poetry env to a compatible interpreter.
