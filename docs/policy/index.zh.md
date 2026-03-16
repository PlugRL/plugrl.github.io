# 策略

策略运行在 server 侧，与算法一起通过 Tyro CLI 选择。

## 快速开始

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

## 验证

确认策略 UID 能在 CLI 里看到。

```bash
plugrl-run-server --help
```

## 内置策略

- `dummy-policy`：随机动作，用于协议联通性验证
- `dppo-policy`：DPPO diffusion 策略
- `pi0-policy`：OpenPI 策略，需要 checkpoint 路径

OpenPI 示例。

```bash
plugrl-run-server pi0-policy default dppo hopper --policy.checkpoint_path /path/to/checkpoint
```

## 常见问题

- CLI 找不到 UID：注册模块没有被 import。
- OpenPI import 失败：按 server 仓库里的 OpenPI README 完成本地依赖。

## 下一步

- [自定义策略](custom_policy.zh.md)
- [DPPO 策略](dppo_policy.zh.md)
