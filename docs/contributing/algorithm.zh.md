## 贡献：算法（Algorithm）

算法在 `plugrl-server` 中实现。

### 代码放哪里

- 算法实现：`plugrl_server/algorithm/...`
- 注册入口：`plugrl_server.algorithm.registration`
- WebSocket 调度/通信环：`plugrl_server.server.websocket_agent_server`

### 提交流程检查清单

- [ ] 实现 `infer(...)` 与 `feedback(...)`，满足 server 侧调度循环契约。
- [ ] 实现学习逻辑（`learn`）与 checkpoint 钩子。
- [ ] 在 registry 中注册算法配置。
- [ ] 用 `plugrl-run-worker dummy-v1` 做端到端验证。

### 快速验证

```bash
plugrl-run-server dummy default dummy-policy default
plugrl-run-worker dummy-v1 --num-episodes 1
```
