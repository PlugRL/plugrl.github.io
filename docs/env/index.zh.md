## 概览

PlugRL 不要求你的环境代码必须放在 `plugrl-worker` 仓库/目录里：你可以把环境实现放在自己的包中，只要它被安装到同一 Python 环境、在 worker 启动时可被 import，并完成注册（或能被 `gym.make(...)` 创建），就可以接入。

环境侧主要在 **plugrl-worker** 中运行，并通过 Gymnasium 方式创建：

```python
env = gym.make(<env_id>, config=<dataclass_config>, max_episode_steps=...)
```

worker 提供统一入口：

```bash
plugrl-run-worker <env> [OPTIONS]
```

## 内置环境类型（常见）

在安装对应可选依赖后，常见的环境 ID 包括：

- `dummy-v1`（连通性/调试）
- `classic-v1`（经典控制）
- `atari-v1`
- `robomimic-v1`
- `d4rl-*`（需安装可选依赖）
- `libero-*`（需安装可选依赖）

查看某个环境的完整参数：

```bash
plugrl-run-worker dummy-v1 --help
```

## 常用 worker 参数

- `--num-workers`：启动多个进程并行跑环境
- `--server-host/--server-port`：server 地址
- `--use-remote-viewer`：推送观测到远程 viewer
- `--use-real-time` / `--fps`：以固定 FPS 实时运行，便于调试
