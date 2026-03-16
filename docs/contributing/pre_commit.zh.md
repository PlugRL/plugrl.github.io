# Pre-commit

提交前跑一轮轻量检查。

## 快速开始

在你正在改动的子仓库目录里执行。

```bash
uv sync
uv run pre-commit install
uv run pre-commit run --all-files
```

## 说明

- 第一次跑可能会自动改文件。`git add` 后再跑一次。
- 格式化由 `ruff-format` 负责。
- `plugrl-server` 需要 Python `>=3.11`。

## 下一步

- [贡献指南](index.zh.md)
