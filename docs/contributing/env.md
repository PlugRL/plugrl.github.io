# Contributing: Environment

Environments live in `plugrl-env-client`.

## Where to edit

- Implementation: `src/plugrl_env_client/envs/<family>/<family>_env.py`. The
  CLI imports every `*_env.py` file under `envs/` at startup.
- Registration: `plugrl_env_client.utils.registration` (`register_env`,
  `register_env_config`).
- Optional dependencies: a new extra under
  `[project.optional-dependencies]` in `pyproject.toml`, and a check at the top
  of the module that raises `ImportError` naming that extra, as
  `envs/mujoco/mujoco_env.py` does. The CLI then skips the env with a warning
  when the extra is missing, instead of failing to start.

## Checklist

- Implement a `BaseEnv` and a dataclass config with a default for every field.
- Register an env UID so `plugrl-run-env-client <env-id>` works; the
  subcommand is the UID in lowercase.
- Follow the [contract](../env/custom_env.md#contract): set
  `single_action_space`, return batched arrays from `step`, honour
  `reset_indices`, seed through `seed_rngs`, and never reset inside `step`.
- Return an `Observation` whose image and state arrays all have `num_envs` as
  their leading axis. The `Recorder` (`plugrl_env_client.recorder`) slices it
  per env to save first and last observations and videos.
- If the task has a notion of success, pass
  `best_reward_threshold_for_success` to `register_env`, or the server's
  `rollout/success` stays 0.

## Verify

Start a dummy server, in `plugrl-server`. Set `--policy.action-dim` to your
env's action size; for a discrete action, add `--policy.discrete` and set it
to the number of choices.

```bash
uv run plugrl-run-server dummy-policy default dummy default --policy.action-dim <action-dim>
```

Start an env client with your env, in `plugrl-env-client`.

```bash
uv run plugrl-run-env-client <env-id> --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

## Troubleshooting

- Env client CLI cannot find the env UID: its module was not imported. Look
  for a `Skip loading env module ...` warning at startup.
- `Expected action shape tail ...`: the dummy server's `--policy.action-dim`
  does not match the env.
- Env creation fails: check optional dependencies and your config defaults.

## Next steps

- [Custom environment](../env/custom_env.md)
- [Contributing](index.md)
