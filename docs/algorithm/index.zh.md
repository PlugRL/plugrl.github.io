# 算法

算法运行在 server 侧，通过 Tyro 子命令进行选择。

## 快速开始

两个最小命令。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

## 验证

查看已注册算法。

```bash
plugrl-run-server --help
```

跑一次 smoke test。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --num-episodes 1
```

## 选择方式

命令形状。

- `<policy_uid> <policy_variant> <algo_uid> <algo_variant>`

配置来源。

- policy 与 algo 配置是独立的 dataclass
- 用 `--policy.*` 与 `--algo.*` 覆盖字段

发现机制。

- registry 位于 `plugrl_server.policy.registration` 与 `plugrl_server.algorithm.registration`
- 模块必须在构建 CLI 前被 import

## 内置算法

- `dummy`：协议与联通性验证
- `dppo`：DPPO 训练循环
- `dppo-dist`：Ray 分布式 DPPO

## 常见问题

- `--help` 里找不到 UID：注册模块没有被 import。
- policy 与 algo 的 flag 冲突：共享概念只保留在一侧配置。

## 下一步

- [训练循环](ppo.zh.md)
- [自定义算法](custom_algorithm.zh.md)
- [策略](../policy/index.zh.md)
