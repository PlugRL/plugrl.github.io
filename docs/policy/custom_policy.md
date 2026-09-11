# Custom policy

Add a server-side policy so `plugrl-run-server` can select it by UID.

Policies are discovered by import-time registration.

## Quickstart

Define a config dataclass and a `BasePolicy` subclass, then register both.

```py
import dataclasses

from plugrl_server.policy.base_policy import (
    BasePolicy,
    BasePolicyConfig,
    PolicyRuntimeState,
)
from plugrl_server.policy.registration import register_policy, register_policy_config

UID = "your-policy"


@register_policy_config(UID)
@dataclasses.dataclass
class YourPolicyConfig(BasePolicyConfig):
    ...


@register_policy(UID)
class YourPolicy(BasePolicy):
    def prepare_observation(self, obs: dict):
        ...

    def get_action_and_runtime_state(self, obs: dict):
        ...

    def fake_runtime_state(self, batch_size: int) -> PolicyRuntimeState:
        ...
```

Reference implementation: `plugrl-server/examples/sac/sac_policy.py`.

## File layout

Built-in in `plugrl-server`.

- `plugrl_server/policy/<policy_uid>/...`
- Import it from `plugrl_server/policy/__init__.py`

Plug-in in your own package.

- Put the policy module in your own package.
- Import it before calling `plugrl_server.cli:main`.

## Verify

Check the CLI.

```bash
plugrl-run-server --help
```

For plug-in policies, import before entering the CLI.

```bash
python -c "import my_pkg.plugrl_policies; from plugrl_server.cli import main; main()" \
  your-policy default dummy default
```

## Contract

- `prepare_observation` converts the worker obs dict into a `NumpyState` -
  an `np.ndarray` or a nested mapping of them. `BaseTorchPolicy` converts that
  to tensors for you in `extract_model_obs_tensor`.
- `get_action_and_runtime_state` returns an action and a `PolicyRuntimeState`.
- `fake_runtime_state` returns shapes and dtypes that match your buffers.
- `PolicyRuntimeState` is a type alias, not a base class: return whatever your
  algorithm needs - a dict, a dataclass, or `None`.

## Troubleshooting

- Policy UID not listed: module import did not run.
- Training fails due to shape mismatch: keep action shape stable across infer and training.
- Runtime state missing fields: align it with what your algorithm stores.
- Device and dtype drift: move tensors to `self.device` and keep dtypes stable.

## Next steps

- [Policies](index.md)
- [Custom algorithm](../algorithm/custom_algorithm.md)
