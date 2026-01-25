## 贡献：环境（Env）

环境在 `plugrl-worker` 中实现。

### 代码放哪里

- 环境实现：`plugrl_worker/envs/...`
- 配置与注册：`plugrl_worker.utils.registration`

### 最小检查清单

- [ ] 实现一个 Gymnasium 环境（或 wrapper）。
- [ ] 定义 dataclass 配置以便 CLI 暴露。
- [ ] 注册 env id，确保 `plugrl-run-worker <env-id>` 可用。
- [ ] 用 `dummy` server 做一次端到端连通性测试。

### 快速验证

```bash
plugrl-run-server dummy default dummy-policy default
plugrl-run-worker <env-id> --num-episodes 1
```
