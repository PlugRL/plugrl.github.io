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

- `dummy-policy`：随机动作，用于协议联通性验证。默认是连续动作、7 维、horizon 为 4，
  正好是 env client 的 `dummy-v1` 要的形状
- `fpo-policy`：FPO flow matching 策略，快速上手那条命令用的就是它
- `dppo-policy`：DPPO diffusion 策略，需要 `dppo` 可选依赖
- `gaussian-policy`：CleanRL 的高斯 MLP，用 `ppo` 训练。`--policy.deterministic`
  让它直接输出均值而不采样，配合 `eval` 做评测
- `dppo-gaussian-policy`：DPPO 的高斯 MLP，能加载 DPPO 发布的 checkpoint，用 `ppo`
  训练，需要 `dppo` 可选依赖
- `pi0-policy`：OpenPI 策略，需要 checkpoint 路径，需要装好 OpenPI

各算法能配哪些策略。

- `fpo`：流策略，即 `fpo-policy` 和 `pi0-policy`。
- `dppo`：diffusion 策略和流策略都行，因为流策略的基类是 diffusion 基类的子类：
  `dppo-policy`、`fpo-policy`、`pi0-policy`。
- `ppo`：`gaussian-policy`、`dppo-gaussian-policy`。
- `eval` 和 `dummy`：任何策略。

依赖没装全的策略也不会出现在 CLI 里，而且不报错。`dppo-policy` 和
`dppo-gaussian-policy` 需要 `dppo` 可选依赖（在 `plugrl-server` 里执行
`uv sync --extra dppo`）。`pi0-policy` 需要 OpenPI，按
`plugrl-server/src/plugrl_server/policy/openpi/README.md` 安装。

OpenPI 示例。`pi0-policy` 可以配 `eval`、`fpo`，也可以通过 `libero` 变体配
`dppo`，[E25](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e25-pi0-dppo)
完整跑通过这个组合。

```bash
plugrl-run-server pi0-policy default eval default \
  --policy.name pi05_libero \
  --policy.checkpoint-path /path/to/checkpoint \
  --policy.device cuda
```

## 常见问题

- CLI 找不到 UID：注册模块没有被 import，或者这个策略的依赖没装（见上文）。
- `pi0-policy` 启动失败：按 server 仓库里的 OpenPI README 完成本地依赖。

## 下一步

- [自定义策略](custom_policy.zh.md)
- [DPPO 策略](dppo_policy.zh.md)
