## 贡献指南

本章节面向“开发/贡献者”，和正文的“使用指南”不太一样：这里默认你会在对应的子仓库里进行本地开发，并遵循现有的代码组织与注册方式。

- 在需要改动的 codebase 中用 Poetry 建环境并安装依赖（例如在 `plugrl-worker` / `plugrl-server` 目录下执行 `poetry install`）。
- 按现有约定实现：dataclass 配置、registry 注册、以及 CLI 能自动发现（保持参数/子命令风格一致）。

PlugRL 的扩展点主要集中在三类：

- 环境（worker 侧）
- 策略（server 侧）
- 算法（server 侧）

大多数扩展遵循相同套路：

1. 增加一个 dataclass 配置。
2. 在对应 registry 模块中注册。
3. 确保 CLI 能自动发现并暴露为参数/子命令。

本章节其它页面分别给出 env/policy/algorithm 的具体落点与建议流程。
