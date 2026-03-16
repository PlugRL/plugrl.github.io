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

- 指标追踪：`--track.enabled true`、`--track.tracker swanlab|wandb`
- checkpoint：`--checkpoint-base-dir ./checkpoints`、`--resume true`

多 GPU 训练使用 Ray 启动。

```bash
plugrl-run-server-ray dppo-policy default dppo hopper --num-ddp-gpus 4
```

## 常见问题

- `--resume` 没生效：确认实验目录里已经有 checkpoint。
- worker 卡住不 step：检查 worker 是否都走到了 `infer` 阶段。

## 下一步

- [算法](index.zh.md)
- [自定义算法](custom_algorithm.zh.md)
- [DPPO 策略](../policy/dppo_policy.zh.md)
