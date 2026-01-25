## PlugRL 中的算法（PPO/DPPO）

本页作为“训练环路深挖”入口。文件名历史上写的是 PPO，但当前 `plugrl-server` 代码实现侧重点是：

- `dummy`
- `dppo` / `dppo-dist`

## Server 侧训练调度（实际发生了什么）

server 内部以调度循环驱动训练：

1. 等待所有已连接 worker 都提交一次 `infer` 请求。
2. 把观测聚合成 batch，调用 `algorithm.infer(batch_obs)`。
3. 对每个 worker 回发 `action`。
4. 接收各 worker 的 `feedback`，调用 `algorithm.feedback(...)`。
5. 在合适时机调用 `algorithm.learn()`，并定期保存 checkpoint。

关键点：

- 推理批处理的“批大小”由当前连接数决定。
- feedback/learn/save 会在模型锁保护下执行，避免并发修改模型状态。

## DPPO 常用命令

```bash
plugrl-run-server dppo hopper dppo-policy default --exp_name my_dppo_exp
```

常用参数：

- `--track.enabled true` 开启实验追踪
- `--track.tracker swanlab|wandb`
- `--checkpoint-base-dir ./checkpoints` 指定 checkpoint 根目录
- `--resume true` 从实验目录下最新 checkpoint 恢复

多 GPU / DDP（Ray 启动）：

```bash
plugrl-run-server-ray dppo hopper dppo-policy default --num-ddp-gpus 4
```
