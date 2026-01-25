## 概览

策略（policy）主要在 `plugrl-server` 中实现，并与算法一起通过 Tyro CLI 进行选择。

示例：

```bash
plugrl-run-server dummy default dummy-policy default
plugrl-run-server dppo hopper dppo-policy default
```

## 内置策略

- `dummy-policy`：随机动作，用于协议/联通性测试
- `dppo-policy`：DPPO 策略（通常需要对应依赖/权重）
- `pi0-policy`：OpenPI（PI0）策略（需要提供 checkpoint 路径）

OpenPI 示例：

```bash
plugrl-run-server dppo hopper pi0-policy default --policy.checkpoint_path /path/to/checkpoint
```
