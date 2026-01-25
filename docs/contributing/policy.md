## Contributing: Policy

Policies are implemented in `plugrl-server`.

### Where to add code

- Policy implementations: `plugrl_server/policy/...`
- Registry: `plugrl_server.policy.registration`

### Checklist

- [ ] Implement a policy and its config dataclass.
- [ ] Register it (UID + variants).
- [ ] Validate with a dummy env worker.
- [ ] Ensure the policy returns action tensors/arrays in the expected shape.

### Quick validation

```bash
plugrl-run-server dummy default <your-policy> default
plugrl-run-worker dummy-v1 --num-episodes 1
```
