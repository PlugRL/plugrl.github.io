## Contributing: Algorithm

Algorithms are implemented in `plugrl-server`.

### Where to add code

- Algorithm implementations: `plugrl_server/algorithm/...`
- Registry: `plugrl_server.algorithm.registration`
- WebSocket server loop: `plugrl_server.server.websocket_agent_server`

### Checklist

- [ ] Implement `infer(...)` and `feedback(...)` contract expected by the server loop.
- [ ] Implement learning (`learn`) and checkpointing hooks.
- [ ] Register algorithm config(s) in the registry.
- [ ] Validate end-to-end with `plugrl-run-worker dummy-v1`.

### Quick validation

```bash
plugrl-run-server dummy default dummy-policy default
plugrl-run-worker dummy-v1 --num-episodes 1
```
