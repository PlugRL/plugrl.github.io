## 快速开始

这一页带你用最小组件做一次端到端“联通性/调试”验证：

- 启动 server（dummy algorithm + dummy policy）
- 启动 worker（dummy env）
- 验证 `infer/action/feedback` 通信闭环

> 约定
>
> - server 默认监听 `0.0.0.0:8000`（可用 `--host/--port` 修改）。
> - worker 通过 `--server-host/--server-port` 连接 server。

## 1）安装

PlugRL 推荐以“套件依赖”的方式接入你的现有工程：你不需要复制/保持本仓库的目录结构。

你通常只需要安装这两个包（以及它们会依赖的 `plugrl-client`）：

- `plugrl-server`
- `plugrl-worker`

如果你要本地开发/改代码，也可以在对应目录使用 editable 安装：

```bash
pip install -e .
```

提示：`dummy` 更像一个 smoke test：先用它把网络/协议/参数打通，再逐步接入你自己的 env/policy。

## 2）用 dummy 做一次联通性检查

### 终端 A：启动 server

```bash
plugrl-run-server dummy default dummy-policy default
```

预期现象：

- 打印 server 版本、算法/策略配置
- 看到 WebSocket server 监听在 `0.0.0.0:8000`

### 终端 B：启动 worker

```bash
plugrl-run-worker dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

预期现象：

- worker 显示“Connected to server with metadata ...”
- 开始 reset/step 环境并向 server 回传 feedback

## 3）（可选）开启远程 Viewer

worker 支持把观测（尤其是图像）推送到一个独立的 viewer，便于实时调试。

### 终端 C：启动 viewer

在 `plugrl-monitor` 目录下：

```bash
uvicorn vlarl_viewer.main:app --reload --host 0.0.0.0 --port 9000
```

然后打开浏览器：

- `http://localhost:9000/`

### 终端 B（worker）：启用推流

```bash
plugrl-run-worker dummy-v1 \
	--use-remote-viewer \
	--viewer-host 127.0.0.1 \
	--viewer-port 9000
```

说明：为了避免端口冲突，多进程 worker 时只有 `worker_id==0` 会建立 viewer 连接，其它进程共享该 viewer。

## 4）DPPO 示例（单机）

`plugrl-server` 当前提供 `dppo`（以及实验性的 Ray 分布式启动）。

### 单进程 server

```bash
plugrl-run-server dppo hopper dppo-policy default --exp_name my_dppo_exp
```

### Ray 启动（多 GPU / DDP）

```bash
plugrl-run-server-ray dppo hopper dppo-policy default \
	--exp_name my_dppo_exp \
	--num-ddp-gpus 4
```

## 常见问题

- worker 一直重试连接：检查 server 是否已启动、host/port 是否一致、以及防火墙/容器端口映射。
- viewer 显示 env 未连接：确认 viewer 端口（默认 9000）与 worker 的 `--viewer-host/--viewer-port` 一致，并确保 worker 带 `--use-remote-viewer`。
- `--resume` 只能用于已存在 checkpoint 的实验目录（`--checkpoint-base-dir` + `algo/policy/exp_name`）。
