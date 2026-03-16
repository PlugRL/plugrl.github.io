# 贡献指南

用于本地开发与扩展 PlugRL。

## 快速开始

在你要改的仓库里安装依赖。

```bash
cd plugrl-server
uv sync
```

如果你在改 env client 仓库，把目录换成 `plugrl-env-client`。

启用 pre-commit。

```bash
uv run pre-commit install
```

## 验证

跑一个最小端到端 smoke test。

```bash
# 终端 1：plugrl-server
uv run plugrl-run-server dummy-policy default dummy default

# 终端 2：plugrl-env-client
uv run plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## 扩展点

- 环境：env client 侧，仓库为 `plugrl-env-client`
- 策略：server 侧，仓库为 `plugrl-server`
- 算法：server 侧，仓库为 `plugrl-server`

## 下一步

- [Pre-commit](pre_commit.zh.md)
- [贡献：环境](env.zh.md)
- [贡献：策略](policy.zh.md)
- [贡献：算法](algorithm.zh.md)
