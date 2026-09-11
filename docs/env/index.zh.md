# 环境

环境运行在 env client 侧，通过 Gymnasium 创建。

> Note: 环境代码可以放在你自己的包里。只要 env client 启动时能 import 并完成注册，CLI 就能发现它。

## 快速开始

查看一个环境的参数。

```bash
plugrl-run-env-client dummy-v1 --help
```

跑一个短 episode。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## 验证

- env client 打印 server 元信息
- env client 能 reset 与 step 环境

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

## 常见内置环境 ID

- `dummy-v1`
- `mujoco-v1`：需要 `mujoco` 可选依赖；快速开始用的就是它
- `classic-v1`
- `atari-v1`
- `robomimic-v1`
- `d4rl-*` 需要安装可选依赖
- `libero-*` 需要安装可选依赖

## 常用 env client 参数

- `--num-procs`：多进程并行跑环境
- `--server-host`、`--server-port`：server 地址
- `--recorder.video-fps`：录制 mp4 的输出帧率

没有让环境按固定墙钟 FPS 运行的参数。本页此前列出的 `--use-real-time`、
`--fps` 在这个 CLI 上并不存在。

## 常见问题

- CLI 找不到 env id：注册模块没有被 import。
- 多进程初始化冲突：环境较重时可尝试 `--runner.use-env-lock`。

## 下一步

- [自定义环境](custom_env.zh.md)
- [快速开始](../user_guide/get_started.zh.md)
