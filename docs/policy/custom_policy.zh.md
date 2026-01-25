## 自定义策略

要在 `plugrl-server` 中新增一个策略（policy），通常需要：

1. 实现策略类（参考 `plugrl_server.policy.*`）。
2. 定义一个继承 `BasePolicyConfig` 的 dataclass 配置。
3. 在 `plugrl_server.policy.registration` 中注册策略（UID + variant）。

### 推荐验证流程

先用最便宜的端到端测试验证协议与动作格式：

```bash
plugrl-run-server dummy default <your-policy> default
plugrl-run-worker dummy-v1 --num-episodes 1
```

如果协议正确：worker 能收到 `action`，server 能持续接收 `feedback`。

### 小提示

- worker 侧期望 server 的 ACTION 消息里包含 `action` 字段。
- 如果策略输出动作序列（action chunk），worker 可以通过 `--replan-steps` 控制重规划频率。
