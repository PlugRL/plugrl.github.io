## Custom Policy

To add a new policy to `plugrl-server`:

1. Implement a policy class (see `plugrl_server.policy.*`).
2. Create a dataclass config that extends `BasePolicyConfig`.
3. Register the policy (UID + variants) in `plugrl_server.policy.registration`.

### Validation workflow

Start with a cheap end-to-end test:

```bash
plugrl-run-server dummy default <your-policy> default
plugrl-run-worker dummy-v1 --num-episodes 1
```

If the protocol is correct, the worker will receive `action` and the server will accept `feedback`.

### Tips

- The worker expects the server to return an `action` field in the ACTION message.
- If you return action chunks, the worker can “replan” via `--replan-steps`.
