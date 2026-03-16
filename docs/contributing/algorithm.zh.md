# 贡献：算法

算法在 `plugrl-server` 中实现。

## 代码放哪里

- 实现：`plugrl_server/algorithm/...`
- 注册：`plugrl_server.algorithm.registration`
- Server loop：`plugrl_server.server.websocket_agent_server`

## 清单

- 实现 server loop 需要的 `infer(...)` 与 `feedback(...)`。
- 按需实现训练与 checkpoint 钩子。
- 注册配置（UID + variants），并确保模块会被 import。

## 验证

启动使用你算法的 server。

```bash
plugrl-run-server dummy-policy default <your-algo> default
```

启动 dummy worker。

```bash
plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## 常见问题

- CLI 找不到 UID：注册模块没有被 import。
- 首次 `infer` 崩溃：观测 schema 对不上。

## 下一步

- [自定义算法](../algorithm/custom_algorithm.zh.md)
- [贡献指南](index.zh.md)
