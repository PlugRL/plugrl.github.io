# 用户指南

端到端跑通 PlugRL：启动 server，启动 env client。

## 快速开始

```bash
plugrl-run-server fpo-policy default fpo default \
    --policy.device cpu --algo.global-steps 500000 --algo.buffer-size 4096
plugrl-run-env-client mujoco-v1 --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

这一对**真的会学**。[快速开始](get_started.zh.md)里说明了那两个不可省的参数，
以及 dummy 连通性检查怎么做。

## 验证

- server 打印 WebSocket 监听地址
- env client 打印 server 元信息并开始跑 episode

## 流程

1. 用 `plugrl-run-server` 启动训练端。（也有 `plugrl-run-server-ray`，但它目前
   不是受支持的路径，见[快速开始](get_started.zh.md)）
2. 用 `plugrl-run-env-client <env_id>` 启动一个或多个环境端。

## 组件

- `plugrl-server`：聚合推理请求，驱动学习与 checkpoint
- `plugrl-env-client`：创建 Gymnasium 环境，发送 `infer`，接收 `action`，回传 `feedback`
- `plugrl-protocol`：WebSocket 传输与 msgpack 序列化

## 常用参数

- server 默认地址为 `0.0.0.0:8000`
- env client 通过 `--server-host` 与 `--server-port` 连接

## 常见问题

- env client 一直重试：确认 server 已监听且地址可达。
- CLI 里找不到策略或算法：确认注册模块在构建 CLI 前已被 import。

## 下一步

- [快速开始](get_started.zh.md)
- [算法](../algorithm/index.zh.md)
- [环境](../env/index.zh.md)
- [策略](../policy/index.zh.md)
