# PlugRL

PlugRL 是一套面向分布式强化学习实验的基础设施。训练端与环境端通过统一协议解耦。

> Note: PlugRL 是一组可插拔的 Python 包。你的 env、policy、algorithm 可以放在自己的包里，只要在使用侧 import 并完成注册。

## 快速开始

先跑通一次联通性 smoke test。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

## 验证

- server 打印 WebSocket 监听地址
- env client 打印 server 元信息并开始跑 episode

## 组件

- `plugrl-server`：训练端，负责算法、策略、checkpoint、指标追踪
- `plugrl-env-client`：环境端，负责创建环境并采集 rollout
- `plugrl-protocol`：协议与序列化层，WebSocket 与 msgpack
- `plugrl-monitor`：可选 viewer，用于查看观测

## 常用参数

- env client 通过 `--server-host` 与 `--server-port` 连接 server
- 观测串流使用 `--use-remote-viewer`、`--viewer-host`、`--viewer-port`
- 分布式启动使用 `plugrl-run-server-ray`

## 下一步

- [用户指南](user_guide/index.zh.md)
- [快速开始](user_guide/get_started.zh.md)
- [算法](algorithm/index.zh.md)
- [环境](env/index.zh.md)
- [策略](policy/index.zh.md)
- [贡献指南](contributing/index.zh.md)
