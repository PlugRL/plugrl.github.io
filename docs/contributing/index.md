## Contributing

This section is for contributors (local development), which is slightly different from the “User Guide” usage path: here we assume you will work inside the relevant codebase and follow the existing registration/CLI conventions.

- In the codebase you are changing (e.g. `plugrl-worker` / `plugrl-server`), set up the dev environment with Poetry (run `poetry install`).
- Follow the existing patterns: dataclass configs, registry registration, and CLI auto-discovery (keep the style consistent).

PlugRL is designed to be extended along three main axes:

- Environments (worker-side)
- Policies (server-side)
- Algorithms (server-side)

Most extensions follow the same pattern:

1. Add a dataclass config.
2. Register it in a registry module.
3. Ensure the CLI discovers it automatically.

See the pages in this section for specifics.

For local code quality checks before committing, see [Pre-commit](pre_commit.md).
