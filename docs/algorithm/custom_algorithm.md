# Custom Algorithm

Add a server-side algorithm so `plugrl-run-server` can select it by UID.

## Quickstart

1. Create a package under `plugrl-server/src/plugrl_server/algorithm/<algo_uid>/`.
2. Register a config dataclass and an algorithm class.
3. Ensure both modules are imported at server startup so Tyro can discover them.

Reference implementation: `plugrl-server/examples/sac/sac.py`, an off-policy
SAC with its own policy in `sac_policy.py`. Run it from `plugrl-server` with
`python examples/sac/sac.py sac_policy default sac default`.

## File layout

Put the code in one of these layouts.

### Built-in in `plugrl-server`

- `plugrl_server/algorithm/<algo_uid>/<algo_uid>_config.py`: the config
  dataclass, registered with `@register_algo_config`
- `plugrl_server/algorithm/<algo_uid>/<algo_uid>.py`: the algorithm class,
  registered with `@register_algo`
- `plugrl_server/algorithm/__init__.py`: imports both modules

Import both. The config module alone puts the UID in the CLI, but the run
prints its config and dies with `KeyError: 'Algorithm <algo_uid> is not registered.'`.
One module holding both decorators, as `examples/sac/sac.py` does, is also fine.

### Plug-in in your own package

- Put the algorithm module in your own Python package.
- Import it, config and class, before calling `plugrl_server.cli:main`.

## Server contract

The WebSocket server loop calls these methods.

- `infer(obs) -> (action, runtime_state)`, once per batch of environments.
- `derive_train_state(runtime_state) -> train_state`, right after every
  `infer`. The default returns `None`. The result is sliced per environment
  and comes back as `feedback(train_state=...)`. `example_train_state(n)`
  calls it on `policy.fake_runtime_state(n)`, which is how the built-in
  algorithms size their buffers.
- `feedback(...) -> (prev_node, global_step, log_dict)`, only for frames that
  will be stored.
- `discard_feedback(*, info, next_terminated, next_truncated)`, for every
  other frame. The default records the finished episode's metrics and nothing
  else. If you override it, call `super().discard_feedback(...)`, or those
  episodes are missing from `rollout/*`.
- `learn() -> (global_step, log_dict)`, with `pre_learn()` before it and
  `post_learn()` after it. The base `post_learn` resets the episode metrics,
  so an override should call `super().post_learn()`.
- Scheduling and checkpoint hooks: `should_learn`, `should_save`, `should_stop`, `create_checkpoint`

The CLI calls two more before the server starts.

- `init_optimizers()`, right after the algorithm is built. The default does
  nothing. `dppo` builds its optimizers here.
- `load_checkpoint(checkpoint)`, when the run is started with `--resume`.

And one class attribute.

- `on_policy: bool = True`. The server passes a frame to `feedback` only if
  its action came from the current policy and `should_learn()` is false.
  Everything else goes to `discard_feedback`. An algorithm that learns from a
  replay buffer sets `on_policy = False` and is given every frame that has a
  step state, as the SAC example does. See
  [Training loop](ppo.md#what-happens-on-the-server).

What the loop implies for the hooks.

- The server does not infer while `should_learn()` is true. If it is still
  true after `learn()`, the server learns again without inferring in between.
  So `learn()` or `post_learn()` must empty the buffer, or move whatever
  counter `should_learn` reads.
- `should_save()` and `should_stop()` are checked on every pass of the loop,
  not once per learn step. `should_save()` must turn false once
  `create_checkpoint()` has run. The built-ins record the saved iteration
  inside `create_checkpoint`.

See `plugrl_server/algorithm/base_algorithm.py` for exact signatures. The
server calls `learn()`, but `learn()` is concrete on `BaseAlgorithm`: it calls
`learn_impl()` and then wraps the result with `build_train_info`, which adds
the `rollout/*` metrics. `learn_impl` is the abstract method, so that is the
one you override. Overriding `learn` instead leaves `learn_impl`
unimplemented and the class abstract, and `make_algo` fails with `TypeError`.

`infer` and `feedback` take and return `PolicyRuntimeState` from
`plugrl_server.policy.state`; `feedback` also takes `train_state:
PolicyTrainState = None`. Older templates used `InternalState` and
`get_action_and_internal_state`; neither exists. Every `feedback` parameter is
keyword-only, so a mismatched name is a `TypeError` on the server's first
call, not a silent rename.

## Minimal template

```py
import dataclasses

import numpy as np

from plugrl_server.algorithm.base_algorithm import BaseAlgoConfig, BaseAlgorithm
from plugrl_server.algorithm.registration import register_algo, register_algo_config
from plugrl_server.common.checkpoint_manager import Checkpoint
from plugrl_server.policy.base_torch_policy import BaseTorchPolicy
from plugrl_server.policy.state import PolicyRuntimeState, PolicyTrainState

UID = "your-algo"


@register_algo_config(UID)
@dataclasses.dataclass
class YourAlgoConfig(BaseAlgoConfig):
    # The run length is BaseAlgoConfig's field, set with --algo.global-steps.
    global_steps: int | None = 100_000


@register_algo(UID)
class YourAlgorithm(BaseAlgorithm):
    # Set to False if the algorithm learns from a replay buffer.
    on_policy = True

    def __init__(self, config: YourAlgoConfig, policy: BaseTorchPolicy):
        super().__init__(config=config, policy=policy)
        self.global_step = 0

    def infer(self, obs: dict) -> tuple[np.ndarray, PolicyRuntimeState]:
        action, runtime_state = self.policy.get_action_and_runtime_state(obs)
        return action, runtime_state

    def feedback(
        self,
        *,
        obs: dict,
        runtime_state: PolicyRuntimeState,
        train_state: PolicyTrainState = None,
        terminated: bool,
        truncated: bool,
        next_obs: dict,
        reward: float,
        info: dict,
        next_terminated: bool,
        next_truncated: bool,
        prev_node: tuple,
    ) -> tuple[tuple, int, dict]:
        # Store the frame here.
        if (next_terminated or next_truncated) and "episode" in info:
            if bool(info["episode"].get("mask", True)):
                # Without this, rollout/success, reward and length stay 0.
                self.record_episode_metrics(info["episode"])
        self.global_step += 1
        return prev_node, self.global_step, {}

    def learn_impl(self) -> tuple[int, dict]:
        return self.global_step, {}

    def should_learn(self) -> bool:
        return False

    def should_stop(self) -> bool:
        return self.global_step >= self.config.global_steps

    def should_save(self) -> bool:
        return False

    def create_checkpoint(self) -> Checkpoint:
        # state_dict() exists because a BaseTorchPolicy is a torch.nn.Module.
        return Checkpoint(step=self.global_step, model=self.policy.state_dict(), optimizer=None, meta={})

    def load_checkpoint(self, checkpoint: Checkpoint) -> None:
        self.global_step = checkpoint.step
        if checkpoint.model is not None:
            self.policy.load_state_dict(checkpoint.model)
```

## Design rules

- Put model and action generation parameters in the policy config.
- Use `BaseAlgoConfig.global_steps` for the run length rather than a field of your own. The progress display reads it.
- Keep two counters if your `learn()` uses external data: environment steps and update steps.
- Save schedule counters in `Checkpoint.meta` and restore them in `load_checkpoint`.
- Use `BaseAlgorithm` unless you implement the distributed hooks required by `DDPAlgorithm`.

## Verify

Start with a smoke test.

```bash
plugrl-run-server dummy-policy default your-algo default
plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 1
```

For plug-in algorithms, import before entering the CLI.

```bash
python -c "import my_pkg.plugrl_algorithms; from plugrl_server.cli import main; main()" \
  dummy-policy default your-algo default
```

## Troubleshooting

- Algorithm UID not listed in `plugrl-run-server <policy> <variant> --help`: module import did not run.
- `KeyError: 'Algorithm your-algo is not registered.'` after the config is printed: the class module was not imported, only the config module.
- `rollout/*` stays at 0: `feedback` does not call `record_episode_metrics`. If only some episodes are missing, an override of `discard_feedback` does not call `super()`.
- The server learns again and again without inferring: `should_learn()` is still true after `learn()`.
- A checkpoint is written on every loop pass: `should_save()` stays true after `create_checkpoint()`.
- Duplicate flags under `--algo.*` and `--policy.*`: keep the parameter in one config.
- After resume, learning or saving cadence drifts: restore all counters from `Checkpoint.meta`.
- `DDPAlgorithm` errors at runtime: switch to `BaseAlgorithm` or implement the required distributed hooks.

## Next steps

- [Algorithm overview](index.md)
- [Training loop](ppo.md)
- [Custom policy](../policy/custom_policy.md)
- [Custom environment](../env/custom_env.md)
