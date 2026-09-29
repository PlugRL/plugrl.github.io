# 贡献：策略

策略在 `plugrl-server` 中实现。

## 代码放哪里

- 实现：`plugrl_server/policy/...`
- 注册：`plugrl_server.policy.registration`

## 清单

- 实现策略与配置 dataclass。
- 注册（UID + variants），并确保模块会被 import。
- 动作形状在推理与训练路径保持一致。
- 动作按 batch 在前、带 horizon 轴的 `(B, H, ...)` 返回，并在 `__init__` 里设置
  `action_dim` 和 `action_horizon`。见[约定](../policy/custom_policy.zh.md#contract)。

## 验证

用你的策略启动 server。

```bash
plugrl-run-server <your-policy> default dummy default
```

启动 dummy worker。

```bash
plugrl-run-env-client dummy-v1 --num-episodes 1 --server-host 127.0.0.1 --server-port 8000
```

## 常见问题

- CLI 找不到 UID：注册模块没有被 import。
- 训练 shape 对不上：动作、runtime state（`PolicyRuntimeState`）以及算法由它导出的 train state，结构都要和 buffer 对齐。

## 下一步

- [自定义策略](../policy/custom_policy.zh.md)
- [贡献指南](index.zh.md)
