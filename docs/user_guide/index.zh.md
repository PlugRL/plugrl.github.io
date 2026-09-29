# 用户指南

端到端跑通 PlugRL：先启动 server，再启动一个或多个 env client。

## 快速开始

按[快速开始](get_started.zh.md)装好之后，每条命令都在它所属的仓库目录里、
各开一个终端运行：

```bash
# in plugrl-server
uv run plugrl-run-server fpo-policy default fpo default \
    --policy.device cpu --algo.global-steps 500000 --algo.buffer-size 4096

# in plugrl-env-client
uv run plugrl-run-env-client mujoco-v1 --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

这一对真的会学。[快速开始](get_started.zh.md)里说明了 server 那两个不能省的参数，
以及 dummy 连通性检查怎么做。

## 验证

- server 打印 `Agent Server is listening on 0.0.0.0:8000`
- env client 打印 `Server metadata: {...}`，然后开始跑 episode

## 流程

1. 在 `plugrl-server` 里用 `uv run plugrl-run-server` 启动训练端。（另有
   `plugrl-run-server-ray`，但它目前不是受支持的路径，见[快速开始](get_started.zh.md)）
2. 在 `plugrl-env-client` 里用 `uv run plugrl-run-env-client <env_id>` 启动一个或多个环境端。

## 组件

- `plugrl-server`：把各个客户端的推理请求合批，负责学习与 checkpoint
- `plugrl-env-client`：创建 Gymnasium 环境，发送 `infer`，接收 `action`，回传 `feedback`
- `plugrl-protocol`：WebSocket 传输、消息类型与 msgpack 序列化

## 常用参数

- server 默认监听 `0.0.0.0:8000`，即所有网卡。用 `--host`、`--port` 修改。
- env client 连接 `--server-host` 与 `--server-port`。`--server-host` 一定要传：
  它的默认值是 `0.0.0.0`，Windows 上的客户端连不上这个地址。和 server 在同一台
  机器上就用 `127.0.0.1`。

## 常见问题

- env client 一直重试：server 还没开始监听，或者 `--server-host` / `--server-port` 写错了。
- CLI 里找不到某个 env ID 或策略：对应的 extra 没装，或者（你自己写的代码）模块
  根本没被 import。env client 启动时会打印一条 `Skip loading env module ...` 警告，
  里面写着缺哪个 extra；server 则不声不响地把这个策略略过。

## 下一步

- [快速开始](get_started.zh.md)
- [算法](../algorithm/index.zh.md)
- [环境](../env/index.zh.md)
- [策略](../policy/index.zh.md)
