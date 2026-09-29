# Contributing: Algorithm

Algorithms live in `plugrl-server`.

## Where to edit

- Implementation: `plugrl_server/algorithm/...`
- Registration: `plugrl_server.algorithm.registration`
- Server loop: `plugrl_server.server.websocket_agent_server`

## Checklist

- Implement the `infer(...)` and `feedback(...)` contract used by the server loop.
- Decide `on_policy`. Keep the default `True` if each learn step may use only
  frames the current policy collected. Set `False` if the algorithm learns
  from a replay buffer.
- If you override `discard_feedback`, call `super()` so finished episodes are
  still recorded.
- Implement training and checkpoint hooks as needed.
- Register your config (UID + variants) and your class, and make sure both
  modules are imported.

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

- Algo UID not listed under `plugrl-run-server <policy> <variant> --help`: registration module was not imported.
- `KeyError: 'Algorithm <your-algo> is not registered.'`: the config module was imported, the class module was not.
- Server crashes on first `infer`: observation schema mismatch.

## Next steps

- [Custom algorithm](../algorithm/custom_algorithm.md)
- [Contributing](index.md)
