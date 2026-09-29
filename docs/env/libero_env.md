# Libero environment

Run Libero tasks in `plugrl-env-client` via an optional dependency group.

## Install

LIBERO runs on robosuite 1.4.1, which needs MuJoCo 2.3.7: MuJoCo 3 fails
robosuite 1.4.1's joint-type assertion. `mujoco-v1` and the other Gymnasium
families are meant for MuJoCo 3. So give LIBERO an environment of its own,
for example a second clone of the env client. `robomimic-v1` uses the same
MuJoCo 2.3.7 / robosuite 1.4.1 stack and needs the same separation.

```bash
git clone https://github.com/PlugRL/plugrl-env-client.git plugrl-env-client-libero
cd plugrl-env-client-libero
uv sync --extra libero
uv run python -c "import mujoco, robosuite; print(mujoco.__version__, robosuite.__version__)"
```

The last line should print `2.3.7 1.4.1`. Run the commands below from inside
this clone.

## Quickstart

Inspect the CLI config.

```bash
uv run plugrl-run-env-client libero-v1 --help
```

Run a few episodes.

```bash
uv run plugrl-run-env-client libero-v1 --num-episodes 10 --server-host 127.0.0.1 --server-port 8000
```

## As E11 ran it

E11 evaluated a `pi05_libero` checkpoint on LIBERO through a PlugRL server: one
client process per task, ten tasks at once, with each task's initial states
taken in order rather than sampled.

```bash
uv run plugrl-run-env-client libero-v1 \
  --server-host 127.0.0.1 --server-port 8000 \
  --num-envs 1 --num-procs 10 --num-episodes 10 \
  --env.task-suite-name libero_spatial \
  --env.no-randomize-initial-state \
  --runner.pass-proc-id \
  --runner.replan-steps 5 \
  --runner.seed 7 \
  --recorder.no-thread0-only \
  --exp-name my_eval
```

- `--runner.pass-proc-id` gives process *i* task *i*, so ten processes cover a
  ten-task suite and `--num-episodes` counts per task rather than in total. To
  hold one task fixed instead - which is what the fine-tuning runs did - drop
  that flag and pass `--env.task-id 8 --env.randomize-initial-state`.
- `--recorder.no-thread0-only` makes every process write its own
  `summary.json`. Without it only process 0 reports, and per-task success
  rates cannot be recovered afterwards.
- Rendering goes through EGL, so the client needs `MUJOCO_GL=egl` and
  `PYOPENGL_PLATFORM=egl` in its environment. Which GPU it renders on follows
  EGL's own device order, which need not agree with `CUDA_VISIBLE_DEVICES`.
- LIBERO writes its own config file, so point `LIBERO_CONFIG_PATH` somewhere
  writable before the first run.

Protocol, results and the recorded environment of both processes:
[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero).

## Verify

- Env client can create the Libero env.
- Episodes run without init errors.

## Troubleshooting

- Multi process init conflicts: try `--runner.use-env-lock`.

## Next steps

- [Environments](index.md)
- [Get Started](../user_guide/get_started.md)
