# plugrl-docs

PlugRL 文档站点源码，使用 MkDocs Material 构建，支持中英文双语。

## 本地预览

本仓库使用 uv 管理 Python 环境与依赖。

```bash
cd plugrl-docs
uv sync --frozen
uv run mkdocs serve -a 127.0.0.1:8000
```

在浏览器打开 http://127.0.0.1:8000/ 。

中文站点路径为 /zh/ 。

## 构建

```bash
uv run mkdocs build --strict
```

默认输出目录为 site/ 。该目录已在 .gitignore 中忽略，不需要提交到仓库。

## 部署

本仓库通过 GitHub Pages 与 GitHub Actions 自动部署。

1. 在 GitHub 仓库 Settings -> Pages 中，将 Source 设置为 GitHub Actions
2. 推送到 main 分支后，会触发工作流构建并发布
3. 站点地址为 https://plugrl.github.io

工作流配置位于 .github/workflows/deploy-pages.yml ，也支持在 Actions 页面手动触发。

## 常见修改

- 新增页面：在 docs/ 下添加 Markdown 文件，并在 mkdocs.yml 的 nav 中挂载
- 新增中文翻译：为同名页面添加 .zh.md 版本，例如 index.zh.md
