# 快速开始

用最小组件跑通端到端 smoke test。

> Note: server 默认地址为 `0.0.0.0:8000`。env client 通过 `--server-host` 与 `--server-port` 连接。

## 快速开始命令

终端 A 启动 server。

```bash
plugrl-run-server dummy-policy default dummy default
```

终端 B 启动 env client。

```bash
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

## 验证

- server 打印 WebSocket 监听地址
- env client 打印 server 元信息并开始跑 episode

## DPPO 示例

单进程 server。

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

Ray 启动。

```bash
plugrl-run-server-ray dppo-policy default dppo hopper --exp_name my_dppo_exp --num-ddp-gpus 4
```

## 常用参数

- server 地址使用 `--host` 与 `--port` 修改
- 运行 episode 数使用 `--num-episodes`
- resume 需要 `--checkpoint-base-dir` 下存在实验目录与 checkpoint

## 常见问题

- env client 一直重试：检查 server 是否已启动，host 与 port 是否一致，端口是否可达。
- `--resume` 找不到 checkpoint：确认实验目录存在且包含 checkpoint。

## 下一步

- [用户指南](index.zh.md)
- [算法](../algorithm/index.zh.md)
- [环境](../env/index.zh.md)
- [策略](../policy/index.zh.md)
