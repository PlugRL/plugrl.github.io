# 贡献：环境

环境在 `plugrl-env-client` 中实现。

## 代码放哪里

- 实现：`plugrl_env_client/envs/...`
- 注册：`plugrl_env_client.utils.registration`

## 清单

- 实现 `BaseEnv` 与配置 dataclass。
- 注册 env UID，让 `plugrl-run-env-client <env-id>` 可用。
- 观测格式与 recorder 兼容。

## 验证

启动 dummy server。

```bash
plugrl-run-server dummy-policy default dummy default
```

启动 env client，使用你的 env。

```bash
plugrl-run-env-client <env-id> --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## 常见问题

- CLI 找不到 UID：注册模块没有被 import。
- 创建 env 失败：检查可选依赖与默认配置。

## 下一步

- [自定义环境](../env/custom_env.zh.md)
- [贡献指南](index.zh.md)
