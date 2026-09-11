# PlugRL

PlugRL 是一套面向分布式强化学习实验的基础设施。训练端与环境端通过统一协议解耦。

> Note: PlugRL 是一组可插拔的 Python 包。你的 env、policy、algorithm 可以放在自己的包里，只要在使用侧 import 并完成注册。

## 快速开始

两个进程：训练端持有策略，环境端跑环境并向它请求动作。下面这一对**真的会学** ——
FPO + HalfCheetah-v5，纯 CPU，不需要 GPU，也不需要下载任何资源文件。

```bash
# 终端 1 —— 训练端
plugrl-run-server fpo-policy default fpo default \
    --port 8000 --policy.device cpu \
    --algo.global-steps 500000 --algo.buffer-size 4096

# 终端 2 —— 环境端
plugrl-run-env-client mujoco-v1 \
    --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

`HalfCheetah-v5` 的观测是 17 维、动作是 6 维，**正好是 `fpo-policy` 的默认值**，
所以不需要任何配置。环境端需要 `plugrl-env-client[mujoco]`。

episode 回报从 -300 附近起步。三个随机种子里，到第 2 万步仍有种子会掉回 -300 区间，
均值在约 6 万步处越过零点，到 50 万步达到 **1928 ± 224** —— 在做这次测量的纯 CPU
机器上大约一百分钟。**最初几分钟全是噪声**，要按几万步的尺度看，而不是看屏幕上
最先出现的那几行。曲线、种子与日志：[E6](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e6-first-learning-curve)。

!!! warning "`--algo.buffer-size` 不是装饰"

    FPO 在 rollout buffer 填满时、或运行到最后一步时才学习。按默认的
    `buffer_size=983040`，任何少于约一百万步的运行**只会在最后学一次** ——
    你得到的是一个点，不是一条曲线。

### 只想确认能连通？

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

dummy 算法的 `learn` 是一个 sleep，不会移动任何权重。它用来确认两端能对话，
不是用来训练的。

## 验证

- server 打印 WebSocket 监听地址
- env client 打印 server 元信息（策略名、动作形状）并开始跑 episode
- 用 `fpo` 时，server 的指标表里 `rollout/reward` 会上升

## 组件

- `plugrl-server`：训练端，负责算法、策略、checkpoint、指标追踪
- `plugrl-env-client`：环境端，负责创建环境并采集 rollout
- `plugrl-protocol`：协议与序列化层，WebSocket 与 msgpack

前两者之间的边界就是[通信协议](protocol/index.zh.md)，而且它是**被写下来的**而非
默认的：环境端不必是 Python，也不必是这个代码库。

## 常用参数

- env client 通过 `--server-host` 与 `--server-port` 连接 server
- `--num-procs` 可以起多个环境端进程连同一个 server

!!! note "关于 `plugrl-run-server-ray`"

    确实有一个基于 Ray 的启动器，但**目前不是受支持的路径**。它需要 `dppo`
    extra；它用**本机**的 GPU 数构建 worker 列表，所以即使 Ray 连上多节点集群
    也只看得见头节点；而且它的服务端说的是比 WebSocket 版更旧的协议方言，
    见 [SPEC.md 第 5.3 节](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md)。
    除非你就是在改 Ray 这条路径，否则请用 `plugrl-run-server`。

## 下一步

- [用户指南](user_guide/index.zh.md)
- [快速开始](user_guide/get_started.zh.md)
- [通信协议](protocol/index.zh.md)
- [算法](algorithm/index.zh.md)
- [环境](env/index.zh.md)
- [策略](policy/index.zh.md)
- [贡献指南](contributing/index.zh.md)
