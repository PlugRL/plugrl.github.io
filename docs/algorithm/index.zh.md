# 算法

算法运行在 server 侧，通过 Tyro 子命令进行选择。

## 快速开始

两个最小命令。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-server dppo-policy default dppo hopper
```

## 验证

查看已注册算法。算法要在选定策略和变体之后的下一层才列出来；顶层的
`plugrl-run-server --help` 只列策略 UID。

```bash
plugrl-run-server dummy-policy default --help
```

跑一次 smoke test。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 1
```

## 选择方式

命令形状。

- `<policy_uid> <policy_variant> <algo_uid> <algo_variant>`

配置来源。

- policy 与 algo 配置是独立的 dataclass
- 用 `--policy.*` 与 `--algo.*` 覆盖字段

发现机制。

- registry 位于 `plugrl_server.policy.registration` 与 `plugrl_server.algorithm.registration`
- 模块必须在构建 CLI 前被 import：注册配置的模块和注册类的模块都要 import，
  见[自定义算法](custom_algorithm.zh.md#file-layout)

## 内置算法

`plugrl-server` 里一共注册了六个 UID。

- `fpo`：FPO 训练循环 - 快速开始跑的就是它。需要流策略：`fpo-policy` 或 `pi0-policy`
- `dppo`：DPPO 训练循环。diffusion 策略和流策略都能用：`dppo-policy`、
  `fpo-policy`、`pi0-policy`。变体有 `hopper`、`walker`、`cheetah`、`square`
  和 `libero`（给 `pi0-policy` 用的）
- `ppo`：面向高斯策略的 PPO，见下文
- `eval`：只跑策略不训练，可用 `--algo.policy-checkpoint-path` 指定权重
- `dummy`：协议与联通性验证
- `dppo-dist`：只给 Ray 启动器 `plugrl-run-server-ray` 用的 DPPO，见
  [训练循环](ppo.zh.md#ray-launcher)里的说明

没有哪个算法需要 `dppo` 可选依赖。需要它的是两个策略：`dppo-policy` 和
`dppo-gaussian-policy`。没装的话，这两个策略 UID 会直接从 CLI 里消失，既不报错
也不警告。安装方法是在 `plugrl-server` 里执行 `uv sync --extra dppo`。

`ppo` 和 `dppo` 一次运行跑 `--algo.train-itrs` 轮，每轮 `--algo.buffer-size`
帧。两者都用这两个值算出 `global_steps`，所以 `--algo.global-steps` 对它们不起作用。

### `ppo`

按 CleanRL `ppo_continuous_action.py` 的做法实现的 PPO：裁剪的替代目标、裁剪的
value loss、按 minibatch 归一化的 advantage，reward 按回报标准差的滑动估计缩放。
它要求策略提供 `evaluate_actions`，目前就是 `gaussian-policy` 和
`dppo-gaussian-policy`。策略开了 `--policy.deterministic` 时它会拒绝运行。

变体。

- `default`：CleanRL 的 MuJoCo 设置，488 轮，每轮 2048 帧。
- `dppo-square`：DPPO 在 robomimic square 上的高斯 PPO 基线，配合从 DPPO 发布的
  checkpoint 起步的 `dppo-gaussian-policy`。

```bash
# MuJoCo. The default sizes, 17 and 6, fit HalfCheetah and Walker2d; Hopper is 11 and 3.
plugrl-run-server gaussian-policy default ppo default \
  --policy.obs-dim 17 --policy.action-dim 6

# robomimic square, from DPPO's released Gaussian checkpoint
plugrl-run-server dppo-gaussian-policy default ppo dppo-square \
  --policy.checkpoint-path /path/to/square_gaussian_pretrained.pt
```

## 常见问题

- `plugrl-run-server <policy> <variant> --help` 里找不到算法 UID：注册模块没有被 import。
- UID 列出来了，但运行时报 `KeyError: 'Algorithm <uid> is not registered.'`：只 import 了配置模块，没 import 类所在的模块。
- CLI 里没有 `dppo-policy` 或 `dppo-gaussian-policy`：没装 `dppo` 可选依赖。
- policy 与 algo 的 flag 冲突：共享概念只保留在一侧配置。

## 下一步

- [训练循环](ppo.zh.md)
- [自定义算法](custom_algorithm.zh.md)
- [策略](../policy/index.zh.md)
