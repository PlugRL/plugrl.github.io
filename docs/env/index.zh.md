# 环境

环境运行在 env client 侧，通过 Gymnasium 创建。

## 快速开始

在 `plugrl-env-client` 里查看一个环境的参数。

```bash
uv run plugrl-run-env-client dummy-v1 --help
```

对着 dummy server 跑几个短 episode。

```bash
# Terminal A, in plugrl-server
uv run plugrl-run-server dummy-policy default dummy default

# Terminal B, in plugrl-env-client
uv run plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

## 验证

- env client 打印 `Server metadata: {...}`
- 它能 reset、step 环境，跑完这些 episode 后以 0 退出

## 环境如何创建

env client 用 `gym.make_vec` 创建 env，下面就是
`plugrl_env_client/runner/run.py` 里的调用。

```py
env = gym.make_vec(
    env_id,
    num_envs=num_envs,
    vectorization_mode="vector_entry_point",
    config=config_dataclass,
    max_episode_steps=max_episode_steps,
    process_id=process_id,
    total_processes=total_processes,
)
```

`register_env` 注册时 `entry_point=None`，只提供 `vector_entry_point`，
所以直接调用 `gym.make(env_id, ...)` 会报
`<env_id> registered but entry_point is not specified`。本页此前写的是
`gym.make` 形式，那个写法从来跑不通。

CLI 只认得在它构建之前就已经被 import 过的环境模块。`plugrl_env_client/envs/`
下所有 `*_env.py` 文件由它自己 import；放在别处的代码得自己先 import 自己。
两种做法都写在[自定义环境](custom_env.zh.md)里。

## 内置环境 ID

普通的 `uv sync` 之后只有 `dummy-v1` 能用。其余每个家族都要装对应的 extra，
例如 `uv sync --extra classic`；没装的话 CLI 里没有这个 ID，启动时会打印一条
`Skip loading env module ...` 警告，里面写着缺哪个 extra。

| Env ID | Extra | 跑的是什么 |
|---|---|---|
| `dummy-v1` | 无 | 随机的图像、状态和奖励，用来检查连通性 |
| `mujoco-v1` | `mujoco` | Gymnasium 的 MuJoCo 任务，默认 `HalfCheetah-v5`（`--env.name`）。快速开始用的就是它 |
| `classic-v1` | `classic` | Gymnasium 的 classic control，默认 `CartPole-v1` |
| `atari-v1` | `atari` | ALE 的 Atari 游戏，默认 `BreakoutNoFrameskip-v4` |
| `d4rl-v1` | `d4rl` | D4RL 的 MuJoCo 任务，默认 `hopper-medium-v2` |
| `robomimic-v1` | `robomimic` | robomimic 的 robosuite 任务，见下文 |
| `libero-v1` | `libero` | LIBERO 任务套件，见 [Libero 环境](libero_env.zh.md) |

`robomimic-v1` 的 `--env.name` 可选 `lift`、`can`、`square`、`transport`，每个
还有 `-img` 版本（默认 `can-img`）。`-img` 版本会把腕部相机的图像放进观测；不带
`-img` 的只有状态，外加单独渲染的 `agentview` 画面。任务成功的那一步，episode 以 terminated 结束
（用 `--env.no-terminate-on-success` 关掉）；到 `--env.horizon` 步时被截断，默认
取 robomimic 自己的 rollout 长度：lift、can、square 为 400 步，transport 为 700 步。
它每个进程只跑一个 env，并且拒绝 `--runner.seed`，因为底下的 robosuite 仿真
没有被播种。`robomimic` extra 钉死了 MuJoCo 2.3.7 和 robosuite 1.4.1，所以要
单独一个环境，不能和 `mujoco` extra 装在一起，见
[Libero 环境](libero_env.zh.md#install)。它还要用 CMake 编译 `egl-probe`，
先装好 `cmake`。

## 常用 env client 参数

- `--num-envs`：每个客户端进程里的环境数
- `--num-procs`：多进程并行跑环境
- `--server-host`、`--server-port`：server 地址。`--server-host` 一定要传，
  默认的 `0.0.0.0` 在 Windows 上连不上
- `--runner.seed`：基础种子；不设的话每次运行的 episode 都不一样
- `--exp-name`：输出目录 `runs/<exp-name>/` 的名字

默认不录制。`--recorder.episode-freq N` 每结束 N 个 episode 录一个：它的第一帧
和最后一帧观测存到 `runs/<exp-name>/rollout/proc_000/sampled/` 下。再加
`--recorder.record-video`，当被录的是 0 号 env 的 episode 时，每个图像键还会写
一个 mp4；帧率用 `--recorder.video-fps` 设。写视频要用 ffmpeg，基础安装不带它：
需要加上 `video` extra（`uv sync --extra video`，和其他 extra 一起写）。默认只有 0 号进程录制，加
`--recorder.no-thread0-only` 让每个进程都录。

没有让环境按固定墙钟 FPS 运行的参数。本页此前列出的 `--use-real-time`、
`--fps` 在这个 CLI 上并不存在。

## 常见问题

- CLI 找不到 env ID：对应的 extra 没装，或者模块没有被 import。
- 多进程初始化冲突：环境较重时可尝试 `--runner.use-env-lock`。

## 下一步

- [自定义环境](custom_env.zh.md)
- [快速开始](../user_guide/get_started.zh.md)
