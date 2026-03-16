# Contributing: Policy

Policies live in `plugrl-server`.

## Where to edit

- Implementation: `plugrl_server/policy/...`
- Registration: `plugrl_server.policy.registration`

## Checklist

- Implement a policy and its config dataclass.
- Register it (UID + variants) and make sure it is imported.
- Keep action shapes stable across inference and training.

## Verify

Start the server with your policy.

```bash
plugrl-run-server <your-policy> default dummy default
```

Connect a dummy worker.

```bash
plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## Troubleshooting

- Policy UID not listed: registration module was not imported.
- Shape mismatch in training: align action and `InternalState` with your buffers.

## Next steps

- [Custom policy](../policy/custom_policy.md)
- [Contributing](index.md)
