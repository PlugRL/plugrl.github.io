# Training loop

This page describes what the server loop does at runtime.

## Quickstart

Run a DPPO experiment.

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

## Verify

Start one worker and confirm the loop runs.

```bash
plugrl-run-env-client dummy-v1 --num-episodes 1
```

## What happens on the server

The server runs a scheduler loop.

1. Wait until all connected workers have enqueued an `infer` request.
2. Aggregate observations and call `algorithm.infer(batch_obs)`.
3. Send `action` back to each worker.
4. Receive `feedback` and call `algorithm.feedback(...)`.
5. Periodically call `algorithm.learn()` and save checkpoints.

Key properties.

- Inference is batched by number of active connections.
- Feedback, learning, and saving are guarded by a model lock.

## Common options

- Tracking: `--track.enabled`, `--track.tracker swanlab|wandb`
- Checkpoints: `--checkpoint-base-dir ./checkpoints`, `--resume`

`--track.enabled` and `--resume` are bare boolean flags. Writing
`--track.enabled true` or `--resume true` is a parse error - tyro reports
`Unrecognized arguments: true` and exits. The off switches are
`--track.no-enabled` and `--no-resume`. Both were written with a `true`
argument on this page.

Multi GPU runs via the Ray launcher.

```bash
plugrl-run-server-ray dppo-policy default dppo-dist hopper --num-ddp-gpus 4
```

!!! note "The Ray launcher is not a supported path today"

    The algorithm has to be `dppo-dist`, not `dppo`: `cli_ray.py` asserts
    `isinstance(algo, DDPAlgorithm)`, and only `DPPOAlgoDistributed` under the
    UID `dppo-dist` mixes `DDPAlgorithm` in. This page previously showed
    `dppo`, which trips that assertion. The launcher also requires the `dppo`
    extra, builds its worker list from the *local* GPU count - so a multi-node
    cluster still only sees the head node - and its server speaks an older
    dialect of the protocol than the WebSocket one. Use `plugrl-run-server`
    unless you are working on the Ray path itself.

## Troubleshooting

- `--resume` does nothing: confirm the experiment directory already contains checkpoints.
- Workers hang before the first step: check that every worker reaches the `infer` stage.

## Next steps

- [Algorithms](index.md)
- [Custom algorithm](custom_algorithm.md)
- [DPPO policies](../policy/dppo_policy.md)
