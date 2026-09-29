# 贡献指南

用于本地开发与扩展 PlugRL。

## 快速开始

在你要改的仓库里安装依赖。

```bash
cd plugrl-server
uv sync
```

如果你在改 env client，就在 `plugrl-env-client` 里跑同样的命令，并加上你要用的
环境对应的 `--extra`（例如 `uv sync --extra mujoco`）。

启用 pre-commit。

```bash
uv run pre-commit install
```

## 验证

跑一个最小端到端 smoke test。每条命令都在它所属的仓库目录里运行。

```bash
# Terminal 1, in plugrl-server
uv run plugrl-run-server dummy-policy default dummy default

# Terminal 2, in plugrl-env-client
uv run plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

客户端跑完三个 episode 后以 0 退出。`--server-host 127.0.0.1` 不能省：客户端的
默认值 `0.0.0.0` 在 Windows 上连不上。

## 扩展点

- 环境：env client 侧，仓库为 `plugrl-env-client`
- 策略：server 侧，仓库为 `plugrl-server`
- 算法：server 侧，仓库为 `plugrl-server`

## 下一步

- [Pre-commit](pre_commit.zh.md)
- [贡献：环境](env.zh.md)
- [贡献：策略](policy.zh.md)
- [贡献：算法](algorithm.zh.md)
