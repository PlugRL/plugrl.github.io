# 快速开始

从零到一个正在学习的策略，两个终端。

## 安装

两个包都不在 PyPI 上。分别 clone，再用 `uv` 安装：

```bash
git clone https://github.com/PlugRL/plugrl-server.git
git clone https://github.com/PlugRL/plugrl-env-client.git

cd plugrl-server     && uv sync && cd ..
cd plugrl-env-client && uv sync --extra mujoco && cd ..
```

`uv sync` 把每个包连同它的 `plugrl-run-*` 命令装进各自仓库的 `.venv`。所以这些
页面上的命令都要在它所属的仓库目录里、用 `uv run` 来跑，`uv run` 用的就是那个 `.venv`。

`--extra mujoco` 是下面快速开始要用的。env client 每个环境家族对应一个 extra，
用哪个装哪个。`uv sync` 会删掉这次没点名的东西，所以每次跑它都要带上同样的
`--extra`；`uv run` 不会动它们。

两个包也可以装在同一个环境里 —— 这两套依赖确实能共存，
`plugrl-server/experiments/e1-dependency-conflict/` 里有实测。
分开装只是这个架构的本意。

## 快速开始

终端 A，训练端，在 `plugrl-server` 里：

```bash
uv run plugrl-run-server fpo-policy default fpo default \
    --port 8000 --policy.device cpu \
    --algo.global-steps 500000 --algo.buffer-size 4096
```

终端 B，环境端，在 `plugrl-env-client` 里：

```bash
uv run plugrl-run-env-client mujoco-v1 \
    --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

`HalfCheetah-v5` 是 17 维观测、6 维动作，正好是 `fpo-policy` 的默认值，
所以什么都不用配。

!!! warning "两个不是装饰的参数"

    `--policy.device cpu` —— 默认是 `cuda`，没有 GPU 时服务端会在启动时
    直接报 `Torch not compiled with CUDA enabled`。

    `--algo.buffer-size 4096` —— FPO 在 rollout buffer 填满时、或运行到最后
    一步时才学习。按默认的 `983040`，少于约一百万步的运行**只会在最后学一次**，
    你得到的是一个点而不是一条曲线。

`--server-host 127.0.0.1` 同样不能省。server 监听的是 `0.0.0.0`，即所有网卡；
客户端 `--server-host` 的默认值也是 `0.0.0.0`，而在 Windows 上客户端连不上这个地址。

## 验证

- server 打印 `Agent Server is listening on 0.0.0.0:8000`
- env client 打印 `Server metadata: {...}`（含 `action_dim`、`action_horizon`），
  然后开始跑 episode
- server 的指标里 `rollout/reward` 在上升。HalfCheetah 上从 -300 附近起步，
  几分钟内就会爬上来

`plugrl-server/experiments/e6-first-learning-curve/` 里有一次三种子的完整运行，
以及产生它的脚本。

## 输出在哪里

- server：`<checkpoint-base-dir>/<algorithm>/<policy>/<exp-name>/`，例如
  `checkpoints/fpo/fpo-policy/<exp-name>/`。里面每保存一步就有一个目录，另有一个
  放指标的 `tensorboard/` 目录。`--checkpoint-base-dir` 默认是 `./checkpoints`；
  不传 `--exp-name` 时，server 用当前时间生成一个名字。
- env client：启动目录下的 `runs/<exp-name>/`。`client_config.json` 记着这次运行
  的全部设置，`logs/client.log` 是日志，`rollout/proc_000/summary.json` 里有
  episode 数、平均回报、成功率和耗时拆分。

## 只想确认能连通

```bash
# Terminal A, in plugrl-server
uv run plugrl-run-server dummy-policy default dummy default

# Terminal B, in plugrl-env-client
uv run plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

dummy 策略默认输出连续的 7 维动作、horizon 为 4，正是 `dummy-v1` 要的，所以两边
都不用再加参数。客户端跑完三个 episode 后以 0 退出。dummy 算法的 `learn` 只是
sleep，不更新任何权重。它用来确认两端能对话，不是用来训练的。

## 其他策略

```bash
uv run plugrl-run-server dppo-policy default dppo hopper \
    --policy.checkpoint-path /path/to/pretrained.pt --exp-name my_dppo_exp
```

`dppo-policy` 需要 `uv sync --extra dppo`，不装的话 CLI 里根本没有它。它还需要
一个预训练 checkpoint：不传 `--policy.checkpoint-path` 就是从随机权重开始。

`pi0-policy` 需要 GPU、checkpoint、`openpi` extra，以及 `git clone` 不会拉下来的
`third_party/openpi` git 子模块。这些没装齐之前，CLI 里不会出现它。步骤见
[plugrl-server 的 README](https://github.com/PlugRL/plugrl-server#training-pi0-openpi-with-fpo)。

!!! note "Ray 启动器目前不是受支持的路径"

    `plugrl-run-server-ray` 确实存在，但它需要 `dppo` extra；它用**本机**的
    GPU 数构建 worker 列表，所以即使连上多节点集群也只看得见头节点；
    而且它的服务端说的是比 WebSocket 版更旧的协议方言。
    除非你就是在改 Ray 这条路径，否则请用 `plugrl-run-server`。

## 常用参数

- 用 `--host` 和 `--port` 设置服务端地址
- 用 `--num-episodes` 控制 episode 数
- `--num-procs` 可以起多个环境端进程连同一个 server
- `--resume` 接着之前的运行继续。`--exp-name`、策略、算法都要和那次运行一样
  （设过 `--checkpoint-base-dir` 的话也要一样），因为 checkpoint 目录就是由它们
  拼出来的。不传 `--exp-name` 时 server 会新起一个名字，在那里找不到 checkpoint，
  于是报 `FileNotFoundError`。

## 排错

| 现象 | 原因 |
|---|---|
| env client 一直重试 | server 还没监听，地址或防火墙不对，或者 `--server-host` 还是默认的 `0.0.0.0` |
| `Torch not compiled with CUDA enabled` | 加上 `--policy.device cpu` |
| 指标只有最后一行 | `--algo.buffer-size` 比整个运行还大 |
| `--resume` 报 `FileNotFoundError` | `<checkpoint-base-dir>/<algorithm>/<policy>/<exp-name>/` 下没有 checkpoint：`--exp-name`、策略或算法和你想接的那次不一样，或者那次还没存过 |
| `FileExistsError: Checkpoint directory ... already exists` | 这个 `--exp-name` 用过了。加 `--resume`、`--overwrite`（会删掉旧目录），或者换个名字 |
| 某个环境报缺少 extra | 装上它，例如 `uv sync --extra mujoco` |

## 下一步

- [用户指南](index.zh.md)
- [通信协议](../protocol/index.zh.md)
- [算法](../algorithm/index.zh.md)
- [环境](../env/index.zh.md)
- [策略](../policy/index.zh.md)
