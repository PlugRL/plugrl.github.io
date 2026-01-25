# PlugRL

PlugRL 是一套面向分布式强化学习实验的 **RLInfra（Reinforcement Learning Infrastructure）**。它将“训练端”和“环境端”解耦，使得你可以用一致的通信协议把不同环境、不同策略/算法组合起来跑实验。

更重要的是：PlugRL 更像“一组可插拔套件（packages）”，而不是要求你把项目组织成某个固定的 codebase 结构。

- 你可以在已有工程里按需引入：只用 worker 跑环境、或用 server + worker 组成训练闭环。
- 你的 env / policy / algorithm 可以继续放在你自己的包里；谁要用到它，就让它在那一侧（worker 或 server）能被加载到即可。
- 仓库里的多目录结构主要用于开发与示例组织，不代表你的项目必须长得一样。

在一次端到端实验里，你通常会用到这些角色（都可独立安装、按需组合）：

- **plugrl-worker**：负责跑环境、采集 rollout，并把观测/反馈通过协议发给训练端
- **plugrl-server**：负责推理与学习（算法 + 策略），并管理 checkpoint / 指标追踪
- **plugrl-client**：共享的协议与序列化层（WebSocket + msgpack），让两端“说同一种话”
- **plugrl-monitor**：可选的远程 Viewer，用于实时查看 worker 观测、快速调试

此外 PlugRL 也内置了一些可直接使用的 baseline（例如用于联通性验证的 `dummy` 组件，以及 `dppo` 等算法/策略组合），方便先跑通流程，再逐步替换为你已有的模型与环境。

第一次使用建议从 **用户指南 → 快速开始** 走一遍端到端流程。

## 架构概览

典型流程：

1. 启动 server（`plugrl-run-server` 或 `plugrl-run-server-ray`）。
2. 启动一个或多个 worker（`plugrl-run-worker <env>`），通过 WebSocket 连接到 server。
3. worker 循环执行：
   - 发送观测（`infer`）
   - 接收动作（`action`，通常是一段 action chunk）
   - 与环境交互后回传反馈（`feedback`）
4. server 侧按连接数聚合/批处理推理请求，驱动算法学习，并定期保存 checkpoint。

## 本文档的范围

- 如何把 plugrl-server / plugrl-worker 接入到已有工程
- 如何做联通性与调试：用 `dummy` 组件快速验证协议闭环
- 如何通过 Tyro CLI 选择算法/策略并配置参数
- worker 侧环境注册与配置方式
- 如何贡献新的 env / policy / algorithm
