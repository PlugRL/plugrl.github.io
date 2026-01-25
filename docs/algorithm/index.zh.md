## 概览

算法侧主要在 `plugrl-server` 中实现，并通过 Tyro 的“子命令树”进行选择。

从使用者角度，你需要选择一个组合：

`<algo> <algo_variant> <policy> <policy_variant>`

例如：

```bash
plugrl-run-server dummy default dummy-policy default
plugrl-run-server dppo hopper dppo-policy default
```

这套 CLI 是由 registry 自动拼出来的（可扩展点）：

- `plugrl_server.algorithm.registration`
- `plugrl_server.policy.registration`

因此：

- 新增算法/策略通常对应“注册 config + 提供构造函数”
- config 使用 dataclass，支持通过 `--algo.*`、`--policy.*` 覆盖参数

## 当前已实现（server 侧）

- `dummy`：用于验证 server/worker 协议与连通性
- `dppo`：DPPO（Diffusion-based Policy Optimization）
- `dppo-dist`：实验性的分布式 DPPO（通常配合 Ray 启动）
