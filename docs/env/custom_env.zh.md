# 自定义环境

把一个新环境接入 `plugrl-env-client`，让 `plugrl-run-env-client <env_id>` 能发现并运行它。

## 快速开始

实现一个 env 类与一个 config dataclass，并注册它们。下面这个是完整的，照抄就能跑：
平面上一个点朝目标移动，动作是 2 维连续量。

```py
import dataclasses

import gymnasium as gym
import numpy as np

from plugrl_env_client.envs.base_env import (
    Action,
    BaseEnv,
    BaseEnvConfig,
    BoolArray,
    Observation,
    RewardArray,
)
from plugrl_env_client.utils.registration import register_env, register_env_config

UID = "Point-v1"  # the CLI subcommand is the lowercase form, point-v1


@register_env_config(UID)
@dataclasses.dataclass
class PointConfig(BaseEnvConfig):
    """Every field needs a default: register_env_config calls PointConfig()
    at import time. Each field becomes a flag, e.g. --env.step-size."""

    step_size: float = 0.1  # distance moved per step at full action
    goal_radius: float = 0.1  # how close counts as reaching the goal


@register_env(UID, max_episode_steps=100, best_reward_threshold_for_success=1.0)
class PointEnv(BaseEnv):
    """A point on a plane moves toward a goal. Reward 1.0 on reaching it."""

    def __init__(
        self,
        config: PointConfig,
        num_envs: int = 1,
        process_id: int | None = None,
        total_processes: int | None = None,
    ):
        super().__init__(
            config=config,
            num_envs=num_envs,
            process_id=process_id,
            total_processes=total_processes,
        )
        self.step_size = config.step_size
        self.goal_radius = config.goal_radius
        # The env client sizes its action buffer from single_action_space
        # (the action of ONE env) before the first step.
        self.single_action_space = gym.spaces.Box(-1.0, 1.0, (2,), np.float32)
        self.action_space = gym.spaces.Box(-1.0, 1.0, (num_envs, 2), np.float32)
        self.pos = np.zeros((num_envs, 2), dtype=np.float32)
        self.goal = np.zeros((num_envs, 2), dtype=np.float32)

    def _obs(self) -> Observation:
        # Every array has the env batch as its leading axis.
        return Observation(
            images={},
            states={"pos": self.pos.copy(), "goal": self.goal.copy()},
            text="move to the goal",
        )

    def reset(
        self, *, seed: int | None = None, options: dict | None = None
    ) -> tuple[Observation, dict]:
        self.seed_rngs(seed)  # first, so that --runner.seed has an effect
        idx = np.arange(self.num_envs)
        if options is not None and options.get("reset_indices") is not None:
            # After an episode ends the client resets only the finished envs.
            idx = np.asarray(options["reset_indices"], dtype=np.int64)
        # Draw from self.np_random, not np.random, or the seed does nothing.
        self.pos[idx] = self.np_random.uniform(-1.0, 1.0, (len(idx), 2))
        self.goal[idx] = self.np_random.uniform(-1.0, 1.0, (len(idx), 2))
        return self._obs(), {}  # the whole batch, not only the reset envs

    def step(
        self, actions: Action
    ) -> tuple[Observation, RewardArray, BoolArray, BoolArray, dict]:
        a = np.clip(np.asarray(actions, dtype=np.float32), -1.0, 1.0)  # (num_envs, 2)
        self.pos = np.clip(self.pos + self.step_size * a, -1.0, 1.0)
        dist = np.linalg.norm(self.pos - self.goal, axis=1)
        reached = dist < self.goal_radius
        reward = np.where(reached, 1.0, -dist).astype(np.float32)  # (num_envs,)
        terminated = reached  # bool, (num_envs,)
        truncated = np.zeros(self.num_envs, dtype=np.bool_)  # the time limit is added for you
        # Do not reset here. The client sends this terminal observation and
        # then calls reset(options={"reset_indices": ...}) itself.
        return self._obs(), reward, terminated, truncated, {}


if __name__ == "__main__":
    from plugrl_env_client.cli import main

    main()
```

## 文件放在哪里

CLI 只能提供那些在它构建之前模块就已被 import 的环境。有两种办法做到。

**放进 env client 里。** 在你的 `plugrl-env-client` checkout 里把文件存成
`src/plugrl_env_client/envs/point/point_env.py`，旁边放一个空的 `__init__.py`，
和内置的各个家族一样。CLI 启动时会 import `plugrl_env_client/envs/` 下所有名为
`*_env.py` 的文件，所以 `uv run plugrl-run-env-client point-v1` 能找到它。
如果这次 import 失败，CLI 只会打印一条 `Skip loading env module ...` 警告，
这个 ID 就不见了。

**放在别处。** 保留文件末尾的 `if __name__ == "__main__":`，用 env client 的
Python 直接运行这个文件，比如在 `plugrl-env-client` 目录里：

```bash
uv run python /path/to/point_env.py point-v1 --help
```

import 这个文件就完成了注册，随后 `plugrl_env_client.cli.main()` 构建出的 CLI
里就有它。单独运行 `plugrl-run-env-client` 永远不会 import 你的文件，所以列不出
这个环境。CLI 模块在第一次被 import 时就定下环境列表，所以如果你自己写启动脚本，
要先 import 你的环境模块，再 import `plugrl_env_client.cli`。`plugrl-env-client`
里的 `examples/pusht/pusht_env.py` 就是这么写的。

## 验证

注册后应该能看到子命令（这里是放进 env client 的写法；放在别处时把
`plugrl-run-env-client` 换成 `python /path/to/point_env.py`）：

```bash
uv run plugrl-run-env-client point-v1 --help
```

对着 dummy server 跑一下。dummy 策略的动作默认是 7 维，那是给 `dummy-v1` 的，
这里要改成和这个环境一样的 2 维：

```bash
# Terminal A, in plugrl-server
uv run plugrl-run-server dummy-policy default dummy default --policy.action-dim 2

# Terminal B, in plugrl-env-client
uv run plugrl-run-env-client point-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

客户端以 0 退出。`runs/<exp-name>/rollout/proc_000/summary.json` 里有 episode 数
和平均回报。

## 约定 {#contract}

- env 继承 `BaseEnv`。config 继承 `BaseEnvConfig`，是一个 dataclass，每个字段都要有默认值。
- `__init__` 接收 `config, num_envs, process_id, total_processes` 四个参数，
  与 `BaseEnv.__init__` 以及内置的 `MuJoCoEnv` 一致。`EnvSpec.make` 总会传
  `num_envs`，`gym.make_vec` 会转发 `process_id` 与 `total_processes`；除非客户端
  带了 `--runner.pass-proc-id`，这两个都是 `None`。本页此前用的是 `worker_id` 与
  `total_workers`，这两个名字在 `plugrl-env-client` 里根本不存在，按那个签名写的类
  会因为多出来的 `num_envs` 直接抛 `TypeError`。
- `__init__` 里要设 `single_action_space`，即单个 env 的动作空间。客户端在第一步
  之前就读它的 shape 和 dtype；`action_space` 只是备选。
- 一切都按 `num_envs` 成批。`step` 收到的动作形状是 `(num_envs, *action_shape)`，
  返回 `(Observation, reward, terminated, truncated, info)`：reward 是形状
  `(num_envs,)` 的 float32 数组，terminated 和 truncated 是形状 `(num_envs,)` 的
  bool 数组，info 是 dict。`Observation` 里每个图像和状态数组的第一维都是
  `num_envs`；`text` 可以只给一个字符串。
- `reset(*, seed=None, options=None)` 返回整批的 `(Observation, info)`。有 episode
  结束时，客户端会调用 `reset(options={"reset_indices": ...})`：只重置这些 env，
  但返回的仍是全部 env 的观测。`num_envs=1` 时这个选项照样会传进来，所以别把它
  转交给内层的 Gymnasium 环境。
- `reset` 一开头先调 `self.seed_rngs(seed)`，所有随机数都从 `self.np_random` 取。
  否则 `--runner.seed` 不起作用。客户端只在第一次 reset 时传种子。
- `step` 里不能自己 reset。报告 terminated 或 truncated 的那一步，要返回这个
  episode 的最后一帧观测；客户端把它当作终止观测发出去，之后再重置这个 env
  （[SPEC.md §5.4](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md)）。
  在 `step` 里自己 reset 的环境，发出去的会是下一个 episode 的第一帧，而且不会报任何错。
- info 可以是 `{}`。server 要读的 `episode` 统计由客户端自己加上；info 里的其他
  内容 server 一概不读。

## 注册

- `register_env_config(uid)` 注册 config dataclass。它在 import 时不带参数地实例化
  这个类，所以每个字段都要有默认值。
- `register_env(uid, ...)` 注册 env 类。CLI 子命令是 `uid` 的小写形式。
- `max_episode_steps` 会加一个时间上限，到点时置 `truncated`。运行时可用
  `--runner.max-episode-steps` 覆盖。
- `best_reward_threshold_for_success`：一个 episode 里只要有一步奖励达到这个值，
  就算成功。server 平均进 `rollout/success` 的 `s` 就由它决定。不设的话成功永远是
  false，`rollout/success` 一直是 0。
- 其他关键字参数会传给 env 的 `__init__`，而且必须能 JSON 序列化，否则
  `register_env` 抛 `RuntimeError`。

## 常见问题

| 现象 | 原因 |
|---|---|
| CLI 里没有这个 env ID | 模块没被 import。放在 env client 里的：文件名要以 `_env.py` 结尾，找找有没有 `Skip loading env module` 警告。放在别处的：直接运行这个文件，而不是 `plugrl-run-env-client` |
| `Env must expose action space via single_action_space/action_space` | `__init__` 里没设 `single_action_space` |
| `Expected action shape tail (2,), got (7,)` | server 策略的动作维数和环境的不一致；在 server 上设 `--policy.action-dim` |
| `Expected reward shape (1,), got ()` | `step` 返回了一个普通 float；要返回形状 `(num_envs,)` 的数组 |
| 多进程初始化冲突 | 试试 `--runner.use-env-lock` |

## 下一步

- [环境概览](index.zh.md)
- [快速开始](../user_guide/get_started.zh.md)
