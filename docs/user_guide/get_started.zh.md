# 快速开始

从零到一个正在学习的策略，两个终端。

## 安装

两个包都不在 PyPI 上。分别 clone 并用 `uv` 安装：

```bash
git clone https://github.com/PlugRL/plugrl-server.git
git clone https://github.com/PlugRL/plugrl-env-client.git

cd plugrl-server     && uv sync && cd ..
cd plugrl-env-client && uv sync --extra mujoco && cd ..
```

`--extra mujoco` 是下面快速开始所需的。env client 的每个环境家族对应一个 extra，
只装你要用的即可。

两者也可以装在同一个环境里 —— 这两套依赖确实能共存，
`plugrl-server/experiments/e1-dependency-conflict/` 里有实测。
分开装只是这个架构的本意。

## 快速开始

终端 A，训练端：

```bash
plugrl-run-server fpo-policy default fpo default \
    --port 8000 --policy.device cpu \
    --algo.global-steps 500000 --algo.buffer-size 4096
```

终端 B，环境端：

```bash
plugrl-run-env-client mujoco-v1 \
    --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

`HalfCheetah-v5` 是 17 维观测、6 维动作，**正好是 `fpo-policy` 的默认值**，
所以不需要任何配置。

!!! warning "两个不是装饰的参数"

    `--policy.device cpu` —— 默认是 `cuda`，没有 GPU 时服务端会在启动时
    直接报 `Torch not compiled with CUDA enabled`。

    `--algo.buffer-size 4096` —— FPO 在 rollout buffer 填满时、或运行到最后
    一步时才学习。按默认的 `983040`，少于约一百万步的运行**只会在最后学一次**，
    你得到的是一个点而不是一条曲线。

## 验证

- server 打印 WebSocket 监听地址
- env client 打印 server 元信息（含 `action_dim`、`action_horizon`）并开始跑 episode
- server 的指标里 `rollout/reward` 在上升。HalfCheetah 上从 -300 附近起步，
  几分钟内就会爬上来

`plugrl-server/experiments/e6-first-learning-curve/` 里有一次三种子的完整运行，
以及产生它的脚本。

## 只想确认能连通

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

dummy 算法的 `learn` 是一个 sleep，不移动任何权重。它用来确认两端能对话，
不是用来训练的。

## 其他策略

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

DPPO 需要 `plugrl-server[dppo]` 和一个预训练 checkpoint。`pi0-policy` 同样需要
checkpoint，而且需要 GPU。

!!! note "Ray 启动器目前不是受支持的路径"

    `plugrl-run-server-ray` 确实存在，但它需要 `dppo` extra；它用**本机**的
    GPU 数构建 worker 列表，所以即使连上多节点集群也只看得见头节点；
    而且它的服务端说的是比 WebSocket 版更旧的协议方言。
    除非你就是在改 Ray 这条路径，否则请用 `plugrl-run-server`。

## 常用参数

- 用 `--host` 和 `--port` 设置服务端地址
- 用 `--num-episodes` 控制 episode 数
- `--num-procs` 可以起多个环境端进程连同一个 server
- `--resume` 需要 `--checkpoint-base-dir` 下已有实验目录

## 排错

| 现象 | 原因 |
|---|---|
| env client 一直重试 | server 还没监听，或地址/防火墙不对 |
| `Torch not compiled with CUDA enabled` | 加上 `--policy.device cpu` |
| 指标只有最后一行 | `--algo.buffer-size` 比整个运行还大 |
| `--resume` 报 `FileNotFoundError` | 那个目录下还没有任何 checkpoint |
| 某个环境报缺少 extra | 装上它，例如 `uv sync --extra mujoco` |

## 下一步

- [用户指南](index.zh.md)
- [通信协议](../protocol/index.zh.md)
- [算法](../algorithm/index.zh.md)
- [环境](../env/index.zh.md)
- [策略](../policy/index.zh.md)
