# 自定义环境

把一个新环境接入 `plugrl-env-client`，让 `plugrl-run-env-client <env_id>` 能发现并运行它。

## 快速开始

实现一个 env 类与一个 config dataclass，并注册它们。

```py
import dataclasses

import numpy as np

from plugrl_env_client.envs.base_env import Action, BaseEnv, BaseEnvConfig, Observation
from plugrl_env_client.utils.registration import register_env, register_env_config

UID = "custom-v1"


@register_env_config(UID)
@dataclasses.dataclass
class CustomConfig(BaseEnvConfig):
    ...


@register_env(UID)
class CustomEnv(BaseEnv):
    def __init__(self, config: CustomConfig, worker_id: int | None = None, total_workers: int | None = None):
        super().__init__(config=config)
        self.worker_id = worker_id
        self.total_workers = total_workers

    def prepare_obs(self, obs: np.ndarray) -> Observation:
        return Observation(images={}, states={}, text="")

    def reset(self, *, seed: int | None = None, options: dict | None = None) -> tuple[Observation | None, dict]:
        ...

    def step(self, action: Action) -> tuple[Observation | None, float, bool, bool, dict]:
        ...
```

## 验证

注册后应该能看到子命令。

```bash
plugrl-run-env-client custom-v1 --help
```

对着 dummy server 跑一个 episode。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client custom-v1 --num-episodes 1
```

## 约定

- env 继承 `BaseEnv`
- config 继承 `BaseEnvConfig`
- 实现 `reset` 与 `step`
- 在 `prepare_obs` 中把原始输出转成 `Observation`

## 注册

- `register_env_config` 注册 config dataclass
- `register_env` 注册 env 类
- `register_env` 支持 `max_episode_steps` 等可选参数

## 常见问题

- CLI 找不到 env id：模块没有被 import。
- 多进程初始化冲突：可尝试 `--use-env-lock`。

## 下一步

- [环境概览](index.zh.md)
- [快速开始](../user_guide/get_started.zh.md)