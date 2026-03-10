## Custom Algorithm

To plug a new algorithm into `plugrl-server`, you typically:

1. Define an algorithm config (dataclass) for Tyro CLI.
2. Implement a `BaseAlgorithm` subclass (infer / feedback / learn / checkpoint hooks).
3. Register both, and make sure the module is imported so the CLI can discover it.

A minimal end-to-end example is the SAC implementation in `plugrl-server/examples/sac/sac.py`.

### Where to add code

In `plugrl-server/src/plugrl_server/algorithm/<your_algo>/...`:

- Implementation: `plugrl_server/algorithm/<your_algo>/<your_algo>.py`
- Registration (side-effect import): `plugrl_server/algorithm/<your_algo>/__init__.py`
- Ensure it is imported from `plugrl_server/algorithm/__init__.py` (so `import plugrl_server` loads it)

### What the server expects

The WebSocket server loop calls these methods on your algorithm:

- `infer(obs) -> (action, internal_state)`
- `feedback(...) -> (prev_node, global_step, log_dict)`
- `learn() -> (global_step, log_dict)`
- plus scheduling / checkpoint hooks: `should_learn/should_save/should_stop`, `create_checkpoint/load_checkpoint`

You can confirm the abstract signatures in `plugrl_server/algorithm/base_algorithm.py`.

### Template

```python
import dataclasses
import numpy as np

from plugrl_server.algorithm.base_algorithm import BaseAlgorithm, BaseAlgoConfig
from plugrl_server.algorithm.registration import register_algo, register_algo_config
from plugrl_server.common.checkpoint_manager import Checkpoint
from plugrl_server.policy.base_policy import BasePolicy, InternalState

UID = "your-algo"


@register_algo_config(UID)
@dataclasses.dataclass
class YourAlgoConfig(BaseAlgoConfig):
    # Training schedule
    total_timesteps: int = 100_000
    # Add your hyper-params
    ...


@register_algo(UID)
class YourAlgorithm(BaseAlgorithm):
    def __init__(self, config: YourAlgoConfig, policy: BasePolicy):
        super().__init__(config=config, policy=policy)
        self.global_step = 0

    def infer(self, obs: dict) -> tuple[np.ndarray, InternalState]:
        # Use policy to produce an action, and return InternalState for training.
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
        # Consume transition, update buffers/counters, and return logs.
        self.global_step += 1
        return prev_node, self.global_step, {}

    def learn(self) -> tuple[int, dict]:
        # Perform updates and return logs.
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

### Notes (based on SAC)

- SAC stores training data in a replay buffer inside the algorithm, and uses the `InternalState` returned from `infer()` in `feedback()`.
- SAC defines optimizers in the algorithm `__init__` and saves their state dicts in `create_checkpoint()`.
- If you want your algorithm to emit action chunks, you can set `break_action_chunk` as needed (see `BaseAlgorithm`).

### Walkthrough: SAC

Use `plugrl-server/examples/sac/sac.py` to map the server contract:

- **`infer()`**: calls `policy.get_action_and_internal_state(obs, random_sample=...)` and returns both values. SAC uses random actions before `learning_starts`.
- **`feedback()`**: requires `internal_state`, then pushes a transition into a replay buffer. SAC uses a clear split:
    - current `obs` comes from `internal_state.obs`. This is already prepared by the policy.
    - `next_obs` is prepared inside the algorithm via `policy.prepare_observation(next_obs)`.
- **Scheduling**:
    - `should_learn()` gates updates based on `learning_starts` and `update_every`.
    - `learn()` runs `update_to_data_ratio * update_every` gradient steps per call.
    - `should_save()` triggers periodic checkpoints via `save_interval`.
- **Checkpoint**: `create_checkpoint()` saves `policy.state_dict()`, optimizer state dicts, and a small `meta` dict. SAC stores `last_*_step` and `update_counter` in `meta` to resume cleanly.

Buffer details and loss functions are algorithm-specific. Keep the method boundaries aligned with the server loop.

### Verify

Use `dummy` as a smoke test to validate discovery + protocol loop first:

```bash
plugrl-run-server dummy-policy default <your-algo> default
plugrl-run-worker dummy-v1 --num-episodes 1
```

Then swap in your real env/policy and iterate on buffers, loss, and performance.
