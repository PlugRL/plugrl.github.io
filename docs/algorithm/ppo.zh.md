# 训练循环

本页描述 server 在运行时做了什么。

## 快速开始

跑一个 DPPO 实验。

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

## 验证

启动一个 worker，确认闭环在跑。

```bash
plugrl-run-env-client dummy-v1 --num-episodes 1
```

## server 内部发生了什么

server 以调度循环驱动训练。

1. 等待所有已连接 worker 都提交一次 `infer`。
2. 聚合观测并调用 `algorithm.infer(batch_obs)`。
3. 向每个 worker 回发 `action`。
4. 接收 `feedback` 并调用 `algorithm.feedback(...)`。
5. 在合适时机调用 `algorithm.learn()` 并保存 checkpoint。

关键点。

- 推理批大小由当前连接数决定。
- feedback、learn、save 在模型锁保护下执行。

## 常用参数

- 指标追踪：`--track.enabled`、`--track.tracker swanlab|wandb`
- checkpoint：`--checkpoint-base-dir ./checkpoints`、`--resume`

`--track.enabled` 与 `--resume` 是不带值的布尔开关。写成
`--track.enabled true` 或 `--resume true` 会直接解析失败 - tyro 报
`Unrecognized arguments: true` 并退出。关掉它们用 `--track.no-enabled`
与 `--no-resume`。本页此前这两处都多写了一个 `true`。

多 GPU 训练使用 Ray 启动。

```bash
plugrl-run-server-ray dppo-policy default dppo-dist hopper --num-ddp-gpus 4
```

!!! note "Ray 启动器目前不是受支持的路径"

    算法必须写 `dppo-dist` 而不是 `dppo`：`cli_ray.py` 里有
    `isinstance(algo, DDPAlgorithm)` 断言，而只有 UID 为 `dppo-dist` 的
    `DPPOAlgoDistributed` 混入了 `DDPAlgorithm`。本页此前写的是 `dppo`，
    会卡在这条断言上。这个启动器还需要 `dppo` 可选依赖，它按*本机* GPU 数量
    构造 worker 列表 - 所以多节点集群也只看得见头节点 - 而且它的 server 说的
    是比 WebSocket 那套更旧的协议方言。除非你就是在改 Ray 这条路径，否则请用
    `plugrl-run-server`。

## 常见问题

- `--resume` 没生效：确认实验目录里已经有 checkpoint。
- worker 卡住不 step：检查 worker 是否都走到了 `infer` 阶段。

## 下一步

- [算法](index.zh.md)
- [自定义算法](custom_algorithm.zh.md)
- [DPPO 策略](../policy/dppo_policy.zh.md)
