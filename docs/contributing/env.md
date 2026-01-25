## Contributing: Environment

Environments are implemented in `plugrl-worker`.

### Where to add code

- Env implementations: `plugrl_worker/envs/...`
- Config + registry: `plugrl_worker.utils.registration`

### Checklist

- [ ] Create a Gymnasium env (or wrapper) that returns observations compatible with the worker recorder.
- [ ] Define a dataclass config for CLI exposure.
- [ ] Register an env ID so `plugrl-run-worker <env-id>` works.
- [ ] Test with `dummy` server.

### Quick validation

```bash
plugrl-run-server dummy default dummy-policy default
plugrl-run-worker <env-id> --num-episodes 1
```
