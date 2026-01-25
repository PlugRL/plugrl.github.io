## 概览

本节用户指南以“能跑通、好排查、易扩展”为目标，覆盖端到端的基本流程：

1. 启动训练 server（`plugrl-run-server` 或 `plugrl-run-server-ray`）。
2. 启动一个或多个环境 worker（`plugrl-run-worker <env>`）。
3. （可选）启动远程 viewer，把 worker 的观测实时推送到浏览器界面。

## 组件与职责

- **Server（plugrl-server）**
	- 聚合所有已连接 worker 的推理请求，批量推理。
	- 调用 `algorithm.infer(...)` 与 `algorithm.feedback(...)`。
	- 在调度循环中驱动学习（`algorithm.learn(...)`）与保存 checkpoint。

- **Worker（plugrl-worker）**
	- 通过 `gym.make(<env_id>, config=...)` 创建 Gymnasium 环境。
	- 通过 `plugrl_client.websocket_worker_agent.WebSocketWorkerAgent` 与 server 建立 WebSocket 通信。
	- 发送 `infer`（观测），接收 `action`（动作/动作序列），回传 `feedback`（奖励、终止信息等）。

- **协议层（plugrl-client）**
	- WebSocket 传输 + msgpack 序列化（`msgpack_numpy`）。
	- 消息类型：`metadata`、`infer`、`action`、`feedback`。

## 下一步

请继续阅读 **快速开始**：先用 `dummy` 做一次端到端联通性检查（便于排查网络/协议/参数问题），再替换为你自己的 env / policy。
