## 贡献：策略（Policy）

策略在 `plugrl-server` 中实现。

### 代码放哪里

- 策略实现：`plugrl_server/policy/...`
- 注册入口：`plugrl_server.policy.registration`

### 提交流程检查清单

- [ ] 实现策略类与配置 dataclass。
- [ ] 在 registry 中注册（UID + variant）。
- [ ] 用 dummy 环境 worker 做端到端验证。
- [ ] 确认返回的动作形状/类型符合 worker 侧预期。

### 快速验证

```bash
plugrl-run-server dummy default <your-policy> default
plugrl-run-worker dummy-v1 --num-episodes 1
```
