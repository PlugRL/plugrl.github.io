# Libero environment

Run Libero tasks in `plugrl-env-client` via an optional dependency group.

## Install

Install env client with Libero extras.

```bash
pip install -e ".[libero]"
```

## Quickstart

Inspect the CLI config.

```bash
plugrl-run-env-client libero-v1 --help
```

Run a few episodes.

```bash
plugrl-run-env-client libero-v1 --num-episodes 10 --server-host 127.0.0.1 --server-port 8000
```

## As E11 ran it

E11 evaluated a `pi05_libero` checkpoint on LIBERO through a PlugRL server: one
client process per task, ten tasks at once, with each task's initial states
taken in order rather than sampled.

```bash
plugrl-run-env-client libero-v1 \
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

- Multi process init conflicts: try `--use-env-lock`.

## Next steps

- [Environments](index.md)
- [Get Started](../user_guide/get_started.md)
