# PlugRL

PlugRL 是一套面向分布式强化学习实验的基础设施。训练端与环境端通过统一协议解耦。

!!! note

    PlugRL 是一组可插拔的 Python 包。你的 env、policy、algorithm 可以放在自己的
    包里，只要在使用侧 import 并完成注册。

一个完整尺寸的 pi0.5 已经通过这条边界在 LIBERO 上端到端跑通，而强化学习的结果是
负面的：见[真实 VLA，端到端](#vla)。

## 快速开始

两个进程：训练端持有策略，环境端跑环境并向它请求动作。下面这一对**真的会学** ——
FPO + HalfCheetah-v5，纯 CPU，不需要 GPU，也不需要下载任何资源文件。

两个包都不在 PyPI 上，先从源码安装：

```bash
git clone https://github.com/PlugRL/plugrl-server.git
git clone https://github.com/PlugRL/plugrl-env-client.git

cd plugrl-server     && uv sync && cd ..
cd plugrl-env-client && uv sync --extra mujoco && cd ..
```

env client 按环境家族划分 extra，这次要用的是 `mujoco`。完整步骤见
[快速开始](user_guide/get_started.zh.md)。

然后开两个终端：

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

## 真实 VLA，端到端

<video src="/media/libero-base.mp4" autoplay loop muted playsinline controls
       style="width:360px;max-width:100%"></video>

*画面是**未经微调**的 pi0.5 通过这条边界在 `libero_spatial` 任务 0 上的执行过程——
三个回合，全部成功。这是策略自己看到的观测流，原生 224×224，不是外部机位。
微调之后成功率归零的那个策略，在下文。*

同样的两个进程也能承载一个完整尺寸的 pi0.5：环境端步进 LIBERO，服务端返回动作，
FPO 用回传的反馈训练。边界本身没有任何改动，变的只是策略。

作为对照，未经微调的 checkpoint 在 `libero_spatial` 上 99/100、在 `libero_10` 上
185/200，与 openpi 公布的 98.8 与 92.4 一致；而且服务端记录的回合数与步数和客户端
逐一相等——正是这一条说明传输层没有悄悄丢掉任何东西。

**强化学习的结果是负面的。** 在最难的那个任务上，一轮 FPO 把成功率从 26/50 打到
0/50；而且这次训练并不完整，10 轮只跑完 1 轮——第二次 learn 装不下，它要和第一次
分配的优化器状态挤在同一张 24 GB 卡上。预测是预注册的，其中一条被证伪。数字、两个
进程各自被记录下来的环境，以及这些数据**不能**支持的结论，见
[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)。

## 环境端既不需要 CUDA，也不需要 GPU

训练端有 6.5G，而且要一张显卡；跑环境的那台机器不必如此。LIBERO 环境端可以装成
**3.4G、零个 nvidia wheel**（原本是 7.8G 带十六个），发出的观测逐字节相同，并且能在
**CPU 上渲染**——十个客户端同时跑，30 个回合全部成功，代价是 **1.91 倍**墙钟。

代价就在这 1.91 倍上，构成它的数字是：软件渲染的单步慢 10 倍，其中大部分、但不是
全部，被"多个客户端排队等同一个策略"的等待所掩盖。

这推翻了本项目自己已经写下的结论。E1 曾测得 robomimic 类环境端 7.2G 且带 CUDA，并
断言这类环境的环境端**确实**需要 GPU——那对**默认安装**是成立的，因为 Linux 上
`torch` 无论用不用都会把 CUDA 一起带来。[E12](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e12-cuda-free-rollout)
先原样复现了 E1 那一行，再只改一个版本钉定；
[E13](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e13-gpu-free-rendering)
则量出了无 GPU 渲染的代价。

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
