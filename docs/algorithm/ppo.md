## Algorithms in PlugRL (PPO/DPPO)

This page is the “deep dive” entry for the training loop. The filename historically says PPO, but the current `plugrl-server` implementation focuses on:

- `dummy`
- `dppo` / `dppo-dist`

## Server training loop (what actually happens)

At runtime, the server runs a scheduler loop:

1. Wait until all connected workers have enqueued an `infer` request.
2. Aggregate observations into a batch and call `algorithm.infer(batch_obs)`.
3. Send `action` back to each worker.
4. Receive `feedback` from each worker and call `algorithm.feedback(...)`.
5. Periodically call `algorithm.learn()` and save checkpoints.

Key properties:

- Inference is **batched by number of active connections**.
- Learning and feedback are protected by a model lock to avoid concurrency issues.

## Practical DPPO commands

```bash
plugrl-run-server dppo hopper dppo-policy default --exp_name my_dppo_exp
```

Useful flags:

- `--track.enabled true` to enable tracking
- `--track.tracker swanlab|wandb`
- `--checkpoint-base-dir ./checkpoints`
- `--resume true` to resume from the latest checkpoint in the experiment directory

For multi-GPU runs, use:

```bash
plugrl-run-server-ray dppo hopper dppo-policy default --num-ddp-gpus 4
```
