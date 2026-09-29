# Pre-commit

提交前跑一轮轻量检查。

## 快速开始

在你正在改动的子仓库目录里执行。

```bash
uv sync
uv run pre-commit install
uv run pre-commit run --all-files
```

在 `plugrl-env-client` 里，`uv sync` 要带上你在用的 `--extra`（例如
`uv sync --extra mujoco`）。不带的话，没点名的 extra 装的包都会被删掉。

## 说明

- 第一次跑可能会自动改文件。`git add` 后再跑一次。
- 代码检查和格式化由 `ruff` 与 `ruff-format` 负责。
- `plugrl-server` 需要 Python `>=3.11,<3.14`；`plugrl-env-client` 需要 `>=3.10,<3.13`。
- 两个仓库的 `.pre-commit-config.yaml` 都用 `default_language_version` 钉死了
  hook 用的 Python：`plugrl-server` 是 `python3.11`，`plugrl-env-client` 是
  `python3.10`。`.venv` 自己的 Python 版本对得上时，pre-commit 就用它建 hook 的
  环境；对不上时，就得另外装好那个版本，并且让 pre-commit 找得到。

## 下一步

- [贡献指南](index.zh.md)
