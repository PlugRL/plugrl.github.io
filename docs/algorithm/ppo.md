# Training loop

This page describes what the server loop does at runtime.

## Quickstart

Run a DPPO experiment.

```bash
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp
```

## Verify

Run the loop end to end with the dummy pair, which needs no model and no
simulator.

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 1
```

## What happens on the server

The server runs a scheduler loop.

1. If `algorithm.should_learn()` is true, do not infer. A full buffer learns first.
2. Otherwise wait until every connected worker has enqueued an `infer`
   request, aggregate the observations and call `algorithm.infer(batch_obs)`.
   Each action is tagged with the number of learn steps so far.
3. Send `action` back to each worker.
4. Receive `feedback` and hand each frame to the algorithm, as described below.
5. Call `algorithm.learn()` when `should_learn()` is true. Save a checkpoint
   when `should_save()` or `should_stop()` is true. Shut down after
   `should_stop()`.

Which frames are trained on.

- A frame goes to `algorithm.feedback(...)` only if its action came from the
  current policy (no learn step since it was inferred) and the algorithm is
  still collecting (`should_learn()` is false). Only those frames are stored.
- Every other frame goes to
  `algorithm.discard_feedback(info=..., next_terminated=..., next_truncated=...)`.
  The default records the finished episode's metrics, if the frame ended one,
  and does nothing else.
- A frame with no step state is always discarded. That happens when a worker
  reconnects mid-run: the server has no previous observation for it.
- For the built-in algorithms, `global_step` counts stored frames only. The
  metric `server/discarded_frames` counts the discarded ones since the server
  started, and is logged with each learn step.
- This rule is for on-policy algorithms, which is every built-in one
  (`BaseAlgorithm.on_policy = True`). An algorithm that learns from a replay
  buffer sets `on_policy = False` and is given every frame that has a step
  state. `examples/sac/sac.py` does.

Key properties.

- Inference waits for one request from every active connection, unless
  `--mini-infer-batch-size N` is set. Then it runs as soon as N environments
  are queued.
- Inference, feedback, learning and saving all run under one model lock, so
  they never overlap.
- A worker that sends no feedback for `--feedback-wait-timeout` seconds
  (default 60) is disconnected. While a learn step runs, the server keeps
  waiting instead.

## Common options

- Tracking: `--track.enabled`, `--track.tracker swanlab|wandb`
- Checkpoints: `--checkpoint-base-dir ./checkpoints`, `--exp-name NAME`,
  `--resume`, `--overwrite`
- Seeding: `--seed 0` seeds Python, NumPy and torch before the policy is built.
  A run with one worker is reproducible. With several it is not, because
  which requests share a batch depends on arrival order.
- Inference batching: `--mini-infer-batch-size N`
- Worker timeout: `--feedback-wait-timeout 60`

`--track.enabled`, `--resume` and `--overwrite` are bare boolean flags.
Writing `--track.enabled true` or `--resume true` is a parse error - tyro
reports `Unrecognized arguments: true` and exits. The off switches are
`--track.no-enabled`, `--no-resume` and `--no-overwrite`.

### Checkpoints and resuming

- A run writes to `<checkpoint-base-dir>/<algo_uid>/<policy_uid>/<exp-name>/<step>/`.
  Without `--exp-name`, the name is built from a timestamp, so every run gets
  a new directory.
- `--resume` loads the latest step in that directory. To reach the same
  directory, pass the same `--checkpoint-base-dir` and `--exp-name` and the
  same policy and algorithm UIDs. Keep the variants the same too, or the
  weights will not fit. If the directory holds no checkpoint, the server exits
  with `FileNotFoundError`, and leaves the directory behind, empty.
- If the directory already exists and you pass neither `--resume` nor
  `--overwrite`, the server exits with `FileExistsError`. `--overwrite`
  deletes the directory first.
- Stopping the server with Ctrl-C writes a checkpoint on the way out, so an
  interrupted run can be resumed. It waits up to 30 seconds for a running
  learn step, and it does not save after a fatal error.

```bash
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp
# stopped with Ctrl-C; later:
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp --resume
```

### Starting from another run's weights

`fpo` and `dppo` can start from a checkpoint written by another run.
`--algo.policy-checkpoint-path` is a step directory, the one that holds
`model.safetensors`. `--algo.restore` says how much of it to take.

- `all` (default): model, optimizer, step and iteration. A resume from any
  directory. For `dppo` the checkpoint must have been written by `dppo`.
- `model`: weights only. Optimizer, step and iteration start over.
- `except-critic`: every weight except `critic.*`. The value head keeps its
  random initialization.

```bash
plugrl-run-server fpo-policy default fpo default \
  --algo.policy-checkpoint-path ./checkpoints/fpo/fpo-policy/my_fpo_exp/983040 \
  --algo.restore except-critic
```

`--algo.restore` other than `all` requires `--algo.policy-checkpoint-path`.
`eval` takes `--algo.policy-checkpoint-path` too, and loads only the weights.

## Ray launcher {#ray-launcher}

Multi GPU runs via the Ray launcher.

```bash
plugrl-run-server-ray dppo-policy default dppo-dist hopper --num-ddp-gpus 4
```

!!! note "The Ray launcher is not a supported path today"

    The algorithm has to be `dppo-dist`, not `dppo`: `cli_ray.py` asserts
    `isinstance(algo, DDPAlgorithm)`, and only `DPPOAlgoDistributed` under the
    UID `dppo-dist` mixes `DDPAlgorithm` in. The command above needs the `dppo`
    extra because of `dppo-policy`; `dppo-dist` itself does not. The launcher
    builds its worker list from the *local* GPU count - so a multi-node
    cluster still only sees the head node - and its server speaks an older
    dialect of the protocol than the WebSocket one. It also predates the frame
    rule above: it calls `feedback` on every frame and never discards one.
    Use `plugrl-run-server` unless you are working on the Ray path itself.

## Troubleshooting

- `--resume` fails with `FileNotFoundError`: the directory has no checkpoint. Check `--checkpoint-base-dir`, `--exp-name` and both UIDs.
- `FileExistsError` at startup: the experiment directory exists. Add `--resume` or `--overwrite`, or pick another `--exp-name`. After a failed `--resume` the directory is the empty one that run left.
- Workers hang before the first step: check that every worker reaches the `infer` stage. The server logs `Infer queue has been waiting` every 5 seconds while it waits.
- `server/discarded_frames` rises with each learn step: expected with several workers or environments. The round in which a buffer fills leaves actions in flight, and their frames are discarded.

## Next steps

- [Algorithms](index.md)
- [Custom algorithm](custom_algorithm.md)
- [DPPO policies](../policy/dppo_policy.md)
