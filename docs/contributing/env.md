# Contributing: Environment

Environments live in `plugrl-env-client`.

## Where to edit

- Implementation: `plugrl_env_client/envs/...`
- Registration: `plugrl_env_client.utils.registration`

## Checklist

- Implement a `BaseEnv` and a dataclass config.
- Register an env UID so `plugrl-run-env-client <env-id>` works.
- Ensure the env returns observations compatible with the worker recorder.

## Verify

Start a dummy server.

```bash
plugrl-run-server dummy-policy default dummy default
```

Start an env client with your env.

```bash
plugrl-run-env-client <env-id> --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## Troubleshooting

- Env client CLI cannot find env UID: registration module was not imported.
- Env creation fails: check optional dependencies and your config defaults.

## Next steps

- [Custom environment](../env/custom_env.md)
- [Contributing](index.md)
