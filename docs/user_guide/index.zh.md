# 用户指南

端到端跑通 PlugRL：启动 server，启动 worker，调试时把观测推到 viewer。

## 快速开始

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

## 验证

- server 打印 WebSocket 监听地址
- env client 打印 server 元信息并开始跑 episode

## 流程

1. 用 `plugrl-run-server` 或 `plugrl-run-server-ray` 启动训练端。
2. 用 `plugrl-run-env-client <env_id>` 启动一个或多个环境端。
3. 需要看观测时开启 viewer 推流。

## 组件

- `plugrl-server`：聚合推理请求，驱动学习与 checkpoint
- `plugrl-env-client`：创建 Gymnasium 环境，发送 `infer`，接收 `action`，回传 `feedback`
- `plugrl-protocol`：WebSocket 传输与 msgpack 序列化
- `plugrl-monitor`：可选 viewer

## 常用参数

- server 默认地址为 `0.0.0.0:8000`
- env client 通过 `--server-host` 与 `--server-port` 连接
- viewer 推流使用 `--use-remote-viewer`、`--viewer-host`、`--viewer-port`

## 常见问题

- env client 一直重试：确认 server 已监听且地址可达。
- CLI 里找不到策略或算法：确认注册模块在构建 CLI 前已被 import。

## 下一步

- [快速开始](get_started.zh.md)
- [算法](../algorithm/index.zh.md)
- [环境](../env/index.zh.md)
- [策略](../policy/index.zh.md)
