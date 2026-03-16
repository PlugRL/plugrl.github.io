# Custom Algorithm

Add a server-side algorithm so `plugrl-run-server` can select it by UID.

## Quickstart

1. Create a package under `plugrl-server/src/plugrl_server/algorithm/<algo_uid>/`.
2. Register a config dataclass and an algorithm class.
3. Ensure the module is imported at server startup so Tyro can discover it.

Reference implementation: `plugrl-server/examples/sac/sac.py`.

## File layout

Put the code in one of these layouts.

### Built-in in `plugrl-server`

- `plugrl_server/algorithm/<algo_uid>/<algo_uid>.py` implementation
- `plugrl_server/algorithm/<algo_uid>/__init__.py` registration import
- `plugrl_server/algorithm/__init__.py` imports your package

### Plug-in in your own package

- Put the algorithm module in your own Python package.
- Import the module before calling `plugrl_server.cli:main`.

## Server contract

The WebSocket server loop calls these methods.

- `infer(obs) -> (action, internal_state)`
- `feedback(...) -> (prev_node, global_step, log_dict)`
- `learn() -> (global_step, log_dict)`
- Scheduling and checkpoint hooks: `should_learn`, `should_save`, `should_stop`, `create_checkpoint`, `load_checkpoint`

See `plugrl_server/algorithm/base_algorithm.py` for exact signatures.

## Minimal template

```py
import dataclasses

import numpy as np

from plugrl_server.algorithm.base_algorithm import BaseAlgoConfig, BaseAlgorithm
from plugrl_server.algorithm.registration import register_algo, register_algo_config
from plugrl_server.common.checkpoint_manager import Checkpoint
from plugrl_server.policy.base_policy import BasePolicy, InternalState

UID = "your-algo"


@register_algo_config(UID)
@dataclasses.dataclass
class YourAlgoConfig(BaseAlgoConfig):
    total_timesteps: int = 100_000


@register_algo(UID)
class YourAlgorithm(BaseAlgorithm):
    def __init__(self, config: YourAlgoConfig, policy: BasePolicy):
        super().__init__(config=config, policy=policy)
        self.global_step = 0

    def infer(self, obs: dict) -> tuple[np.ndarray, InternalState]:
        action, internal_state = self.policy.get_action_and_internal_state(obs)
        return action, internal_state

    def feedback(
        self,
        *,
        obs: dict,
        internal_state: InternalState | None,
        terminated: bool,
        truncated: bool,
        next_obs: dict,
        reward: float,
        info: dict,
        next_terminated: bool,
        next_truncated: bool,
        prev_node: tuple,
    ) -> tuple[tuple, int, dict]:
        self.global_step += 1
        return prev_node, self.global_step, {}

    def learn(self) -> tuple[int, dict]:
        return self.global_step, {}

    def should_learn(self) -> bool:
        return False

    def should_stop(self) -> bool:
        return self.global_step >= self.config.total_timesteps

    def should_save(self) -> bool:
        return False

    def create_checkpoint(self) -> Checkpoint:
        return Checkpoint(step=self.global_step, model=self.policy.state_dict(), optimizer=None, meta={})

    def load_checkpoint(self, checkpoint: Checkpoint) -> None:
        self.global_step = checkpoint.step
        if checkpoint.model is not None:
            self.policy.load_state_dict(checkpoint.model)
```

## Design rules

- Put model and action generation parameters in the policy config.
- Keep two counters if your `learn()` uses external data: environment steps and update steps.
- Save schedule counters in `Checkpoint.meta` and restore them in `load_checkpoint`.
- Use `BaseAlgorithm` unless you implement the distributed hooks required by `DDPAlgorithm`.

## Verify

Start with a smoke test.

```bash
plugrl-run-server dummy-policy default your-algo default
plugrl-run-env-client dummy-v1 --num-episodes 1
```

For plug-in algorithms, import before entering the CLI.

```bash
python -c "import my_pkg.plugrl_algorithms; from plugrl_server.cli import main; main()" \
  dummy-policy default your-algo default
```

## Troubleshooting

- Algorithm UID not listed in `plugrl-run-server --help`: module import did not run.
- Duplicate flags under `--algo.*` and `--policy.*`: keep the parameter in one config.
- After resume, learning or saving cadence drifts: restore all counters from `Checkpoint.meta`.
- `DDPAlgorithm` errors at runtime: switch to `BaseAlgorithm` or implement the required distributed hooks.

## Next steps

- [Algorithm overview](index.md)
- [Training loop](ppo.md)
- [Custom policy](../policy/custom_policy.md)
- [Custom environment](../env/custom_env.md)
