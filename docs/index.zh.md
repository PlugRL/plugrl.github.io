# PlugRL

PlugRL 让策略对着跑在别处的环境训练：另一个进程、另一台机器、一台没有 GPU 的机器，
或者一个不是用 Python 写的程序。训练端持有策略和算法；环境端步进环境，向它请求动作。
两者之间是一份写下来的协议，它不只把动作送出去，也把奖励和回合结束传回来，所以策略
是在被训练，而不只是被调用。

## 在它上面能跑什么

两个 MLP 策略和两个算法在四个任务上的全部组合，加上作为对照基线的高斯 MLP + PPO。
十六格全部学会。边框和上面的标签写的是实验得出的结论。每段视频下面那条线是三个种子的
训练曲线（画的是回报；方块那一列画的是成功率，因为那几组的奖励口径不一样），同一列用
同一个纵轴，所以平的线就是真的没动。鼠标悬停就能播放；点一下格子，除了播放，还会在
下面显示训练它的那两条命令。从一格换到另一格，变的只有指定策略、算法和任务的那几个词。

<div class="cov" data-part="grid" data-src="/media/coverage/coverage.json"></div>

方块任务上，每一行都是从预训练好的策略起步微调：`dppo-policy` 和高斯 MLP 用的是
DPPO 官方发布的存档，`fpo-policy` 用的是我们自己行为克隆出来的起点
（[E35](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e35-square-bc)）。
高斯 MLP 这一行，在三个 MuJoCo 任务上是 CleanRL 的策略和 PPO，回报和 CleanRL 自己
报告的差不多（[E38](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e38-gaussian-ppo)）；
在方块任务上是 DPPO 的高斯 MLP，用 DPPO 自己的 PPO 设置微调
（[E40](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e40-square-gaussian-ppo)）。
表里没有 `dppo-policy · FPO`，因为这个组合不存在：FPO 只能训练流策略。每段视频都取自
三个种子里最后十轮居中的那个种子的最终检查点。这个检查点评估了五个回合，放出来的是回报
居中的那一回合，不是最好的那一回合。生成这些内容的脚本在
[figures/coverage](https://github.com/PlugRL/plugrl-server/tree/main/figures/coverage)。

训练端和环境端连 Python 环境都不共用。训练这些格子的服务端，没有一台装了 MuJoCo、
robosuite 或 gymnasium。环境客户端分别跑在两套独立的环境里：MuJoCo 那几个任务用的是
gymnasium 加 MuJoCo 3；robomimic 用的是 robosuite 1.4.1 加 MuJoCo 2.3.7，因为
robosuite 1.4.1 在 MuJoCo 3 上跑不起来。训练这十六格的是同一个服务端代码库。

## 环境端很轻

训练端有 6.5G，而且要一张显卡；跑环境的那台机器两样都不需要。LIBERO 环境端可以装成
**3.4G、零个 nvidia wheel**（原本是 7.8G 带十六个），发出的观测逐字节相同，并且能在
**CPU 上渲染**：十个客户端同时跑，30 个回合全部成功，墙钟是用显卡时的 **1.91 倍**
（[E12](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e12-cuda-free-rollout)、
[E13](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e13-gpu-free-rendering)）。
软件渲染的单步慢 10 倍，其中大部分被"多个客户端排队等同一个策略"的等待掩盖了。

环境端也不必是 Python。[协议](protocol/index.zh.md)是写下来的，附带一致性检查器；一个
除了标准库之外什么都不用的 C++ 客户端（没有 msgpack 库，也没有 WebSocket 库），驱动一个
真实的训练端完成了 120 次训练交换
（[E2](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e2-cross-language)）。

## 拆开的代价

很小。观测为 184 KiB 时，同一台机器上一次交换约 0.8 毫秒，离开这台机器再多约 0.5 毫秒
（[E7](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e7-cross-machine)）。
后一个数是从虚拟机到它的宿主机测的，还没有在两台物理机之间测过。

## 真实 VLA，端到端

<video src="/media/libero-base.mp4" autoplay loop muted playsinline controls
       style="width:360px;max-width:100%"></video>

*画面是**未经微调**的 pi0.5 通过这条边界在 `libero_spatial` 任务 0 上的执行过程——
三个回合，全部成功。这是策略自己看到的观测流，原生 224×224，不是外部机位。*

同样的两个进程也能承载一个完整尺寸的 pi0.5：环境端步进 LIBERO，服务端返回动作。边界
本身没有任何改动，变的只是策略。未经微调的 checkpoint 在 `libero_spatial` 上 99/100、
在 `libero_10` 上 185/200，与 openpi 公布的 98.8 与 92.4 一致；而且服务端记录的回合数
与步数和客户端逐一相等——正是这一条说明传输层没有悄悄丢掉任何东西
（[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)）。

用 PlugRL 对 pi0.5 做强化学习微调，目前还没能让它变好。这部分记录和视频在
[单独一页](vla.zh.md)。

## 快速开始

下面这一对不需要 GPU 就能学会：FPO + HalfCheetah-v5，纯 CPU，不需要下载任何资源文件。
两个包都不在 PyPI 上，先从源码安装：

```bash
git clone https://github.com/PlugRL/plugrl-server.git
git clone https://github.com/PlugRL/plugrl-env-client.git

cd plugrl-server     && uv sync && cd ..
cd plugrl-env-client && uv sync --extra mujoco && cd ..
```

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

episode 回报从 -300 附近起步，三个随机种子到 50 万步达到 **1928 ± 224**，在做这次测量
的纯 CPU 机器上大约一百分钟
（[E6](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e6-first-learning-curve)）。
其余内容在[快速开始](user_guide/get_started.zh.md)：为什么 `--algo.buffer-size` 不能省、
怎么只检查连通性、以及常见问题。

## 组件

- `plugrl-server`：训练端，负责算法、策略、checkpoint、指标追踪
- `plugrl-env-client`：环境端，负责创建环境并采集 rollout
- `plugrl-protocol`：协议与序列化层，WebSocket 与 msgpack

环境、策略和算法都可以放在你自己的包里，只要在使用它的那一端 import 并完成注册。

## 下一步

- [用户指南](user_guide/index.zh.md)
- [快速开始](user_guide/get_started.zh.md)
- [通信协议](protocol/index.zh.md)
- [算法](algorithm/index.zh.md)
- [环境](env/index.zh.md)
- [策略](policy/index.zh.md)
- [贡献指南](contributing/index.zh.md)
