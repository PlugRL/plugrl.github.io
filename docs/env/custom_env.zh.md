# 编写自定义环境

PlugRL 所需要的 Env 类继承自基类 `plugrl_worker.envs.base_env.BaseEnv` 其特点是标准化的 I/O 要求，Env 类依靠继承自 `plugrl_worker.envs.base_env.BaseEnvConfig` 的 Config 类初始化

具体而言，用户自定义环境时可以参考一下模板，将已有的环境通过类似打包的方式接入到 PlugRL 中。

首先是你需要编写下面两个和环境有关的类，比如在 `custom_env.py` 文件下：

```
import dataclasses
from plugrl_worker.envs.base_env import BaseEnv, BaseEnvConfig, Observation, Action
from plugrl_worker.utils.registration import register_env, register_env_config

UID = "Custom-v1"

@register_env_config(UID)
@dataclasses.dataclass
class CustomConfig(BaseEnvConfig):
    ...

@register_env(UID)
class CustomEnv(BaseEnv):
    def __init__(self, config: CustomConfig, worker_id: int | None = None, total_workers: int | None = None):
        super().__init__(config=config)
        ...
        
    def prepare_obs(self, obs) -> Observation:
        return Observation(
            images=...,
            states=...,
            text=...,
        )
        
    def reset(self, *, seed: int | None = None, options: dict | None = None) -> tuple[Observation | None, dict]:
        ...
    
    def step(self, action: Action) -> tuple[Observation | None, float, bool, bool, dict]:
        ...
    
if __name__ == "__main__":
    from plugrl_worker.cli import main
    main()
```

首先是引用

```
from plugrl_worker.envs.base_env import BaseEnv, BaseEnvConfig, Observation, Action
from plugrl_worker.utils.registration import register_env, register_env_config
```

其中 `Observation` 和 `Action` 是定义的标准化 I/O，具体为：

```
ImageArray = Annotated[npt.NDArray[np.uint8], ("b", "h", "w", "c")]
StateArray = Annotated[npt.NDArray[DType], ("b", "d")]

@dataclasses.dataclass
class Observation:
    images: Dict[str, ImageArray]
    states: Dict[str, StateArray]
    text: str

Action = Annotated[npt.NDArray[DType], ("b", "da")]
```

其中 `b` 这一项是考虑到打包的环境有可能本身支持并行，表示并行环境的个数，但由于目前还不支持并行环境打包，因此请按照 `b=1` 考虑。

之后的 `register_env`, `register_env_config` 是类的装饰器，用于注册环境及配置文件，`register_env` 同时支持参数 `max_episode_steps` 和 `best_reward_threshold_for_success`，用户可以在注册时同时设置一轮的最长步数和成功的奖励标准，比如：

```
register_env(UID, max_episode_steps=100, best_reward_threshold_for_success=1.)
```

表示注册一个名为 UID 的环境，运行步数为 100，若单次奖励超过 1，则记为成功。

注册器可以让用户使用 CLI 看到注册好的环境，运行环境的客户端去接入已有的模型服务器上。

```
if __name__ == "__main__":
    from plugrl_worker.cli import main
    main()
```

对于配置文件，通常需要列出足够的信息用于初始化自定义环境，一般包含类似 `env_name`, `task_id` 等字段。

对于自定义环境类，注意到初始化时除了配置文件的传入，同时还传入了 `worker_id` 和 `total_workers` 字段，这两个字段是客户端在并行创建时会传入的参数，用户根据这两个参数实现每个协程上的客户端运行不同参数的环境，一个使用的典型是代码库中 `plugrl_worker.envs.libero.libero_env` 的实现。

# 使用自定义环境

如果一切按照预期完成，在运行 `custom_env.py` 时会看到

```
╭─ Required options ────────────────────────────────────────────────────────────────────────────────────────────╮
│ The following arguments are required: {dummy-v1,d4rl-v1,atari-v1,classic-v1,robomimic-v1,libero-v1,custom-v1} │
│ ───────────────────────────────────────────────────────────────────────────────────────────────────────────── │
│ For full helptext, run custom_env.py --help                                                                   │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

运行 `python custom_env.py custom-v1 --help` 时你会看到所有可用参数，`python custom_env.py custom-v1` 后如果没有报错，则之后使用逻辑和其他环境相同。

# 一般调试流程

在运行成功后，可以使用 `--use-remote-viewer` 和 plugrl_server 中的 `dummy_algorithm` 和 `dummy_policy` 测试随机运行的结果。