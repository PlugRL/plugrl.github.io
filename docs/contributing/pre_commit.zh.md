## pre-commit

`plugrl-worker` 和 `plugrl-server` 都用 `pre-commit` 做提交前检查，避免把明显的格式问题和低级错误带进仓库。

在你正在改动的子仓库目录里：

1. 安装 dev 依赖：

   - `poetry install --with dev`

2. 安装 git hook：

   - `poetry run pre-commit install`

3. 首次建议全量跑一遍：

   - `poetry run pre-commit run --all-files`

注意：

- 第一次跑出现 “Failed” 很常见，因为有些 hook 会自动改文件。把改动 `git add` 之后再跑一次就会变绿。
- 格式化由 `ruff-format` 负责。
- `plugrl-server` 需要 Python `>=3.11`。如果 Poetry 报 Python 版本不满足，需要先切到兼容的解释器/环境。
