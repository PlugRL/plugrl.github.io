# Contributing: Algorithm

Algorithms live in `plugrl-server`.

## Where to edit

- Implementation: `plugrl_server/algorithm/...`
- Registration: `plugrl_server.algorithm.registration`
- Server loop: `plugrl_server.server.websocket_agent_server`

## Checklist

- Implement the `infer(...)` and `feedback(...)` contract used by the server loop.
- Implement training and checkpoint hooks as needed.
- Register your config (UID + variants) and make sure it is imported.

## Verify

Start a server that uses your algorithm.

```bash
plugrl-run-server dummy-policy default <your-algo> default
```

Connect a dummy worker.

```bash
plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## Troubleshooting

- Algo UID not listed: registration module was not imported.
- Server crashes on first `infer`: observation schema mismatch.

## Next steps

- [Custom algorithm](../algorithm/custom_algorithm.md)
- [Contributing](index.md)
