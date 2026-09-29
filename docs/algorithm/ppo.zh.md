# 训练循环

本页描述 server 在运行时做了什么。

## 快速开始

跑一个 DPPO 实验。

```bash
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp
```

## 验证

用 dummy 这一对把闭环完整跑一遍，不需要模型，也不需要仿真器。

```bash
plugrl-run-server dummy-policy default dummy default
plugrl-run-env-client dummy-v1 --server-host 127.0.0.1 --server-port 8000 --num-episodes 1
```

## server 内部发生了什么 {#what-happens-on-the-server}

server 以调度循环驱动训练。

1. 如果 `algorithm.should_learn()` 为真，就不做推理：buffer 满了先学习。
2. 否则等所有已连接 worker 都提交一次 `infer`，聚合观测并调用
   `algorithm.infer(batch_obs)`。每个动作都会记下截至此时做过几次 learn。
3. 向每个 worker 回发 `action`。
4. 接收 `feedback`，把每一帧按下面的规则交给算法。
5. `should_learn()` 为真时调用 `algorithm.learn()`；`should_save()` 或
   `should_stop()` 为真时保存 checkpoint；`should_stop()` 之后关闭 server。

哪些帧会拿来训练。

- 只有同时满足两个条件的帧才会交给 `algorithm.feedback(...)`：它的动作出自当前
  策略（推理之后没有再 learn 过），并且算法还在收集数据（`should_learn()` 为假）。
  只有这些帧会被存下来。
- 其余的帧都交给
  `algorithm.discard_feedback(info=..., next_terminated=..., next_truncated=...)`。
  默认实现只做一件事：如果这一帧结束了一个 episode，就记下这个 episode 的指标。
- 没有 step state 的帧一律丢弃。worker 在运行中途重连时会出现这种帧：server
  手上没有它的上一条观测。
- 对内置算法来说，`global_step` 只数存下来的帧。指标 `server/discarded_frames`
  数的是 server 启动以来丢掉的帧，每次 learn 时随其他指标一起记录。
- 这条规则针对 on-policy 算法，内置算法全都是（`BaseAlgorithm.on_policy = True`）。
  从 replay buffer 学习的算法把 `on_policy` 设为 `False`，就会拿到每一个带
  step state 的帧。`examples/sac/sac.py` 就是这么做的。

关键点。

- 推理默认等每个活跃连接各来一个请求；设了 `--mini-infer-batch-size N` 的话，
  排队的环境数凑够 N 个就推理。
- 推理、feedback、learn、save 都在同一把模型锁下执行，互不重叠。
- worker 超过 `--feedback-wait-timeout` 秒（默认 60）没发 feedback，连接会被
  关掉。learn 进行期间 server 会一直等，不按超时处理。

## 常用参数

- 指标追踪：`--track.enabled`、`--track.tracker swanlab|wandb`
- checkpoint：`--checkpoint-base-dir ./checkpoints`、`--exp-name NAME`、
  `--resume`、`--overwrite`
- 随机种子：`--seed 0` 在构建策略之前给 Python、NumPy 和 torch 设种子。只连一个
  worker 时结果可复现；连多个时不行，因为哪些请求凑进同一批取决于到达顺序。
- 推理批大小：`--mini-infer-batch-size N`
- worker 超时：`--feedback-wait-timeout 60`

`--track.enabled`、`--resume` 与 `--overwrite` 是不带值的布尔开关。写成
`--track.enabled true` 或 `--resume true` 会直接解析失败 - tyro 报
`Unrecognized arguments: true` 并退出。关掉它们用 `--track.no-enabled`、
`--no-resume` 与 `--no-overwrite`。

### checkpoint 与续训

- 一次运行写到 `<checkpoint-base-dir>/<algo_uid>/<policy_uid>/<exp-name>/<step>/`。
  不给 `--exp-name` 时名字由时间戳生成，所以每次运行都是新目录。
- `--resume` 读取该目录下最新的 step。要落到同一个目录，就得给相同的
  `--checkpoint-base-dir`、`--exp-name`，以及相同的策略 UID 和算法 UID。变体也要
  保持一致，否则权重对不上。目录里没有 checkpoint 时 server 以
  `FileNotFoundError` 退出，并留下一个空目录。
- 目录已存在、又既没给 `--resume` 也没给 `--overwrite` 时，server 以
  `FileExistsError` 退出。`--overwrite` 会先删掉这个目录。
- 用 Ctrl-C 停掉 server 时会顺手写一个 checkpoint，中断的运行因此可以续上。它最多
  等 30 秒让正在进行的 learn 停下；出了致命错误则不保存。

```bash
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp
# stopped with Ctrl-C; later:
plugrl-run-server dppo-policy default dppo hopper --exp-name my_dppo_exp --resume
```

### 从别的运行的权重起步

`fpo` 和 `dppo` 可以从另一次运行写的 checkpoint 起步。
`--algo.policy-checkpoint-path` 指向某个 step 目录，也就是放
`model.safetensors` 的那个。`--algo.restore` 决定取多少。

- `all`（默认）：模型、优化器、step 和轮数，相当于从任意目录续训。`dppo` 要求
  checkpoint 也是 `dppo` 写的。
- `model`：只取权重，优化器、step 和轮数从头开始。
- `except-critic`：除 `critic.*` 以外的全部权重，value head 保持随机初始化。

```bash
plugrl-run-server fpo-policy default fpo default \
  --algo.policy-checkpoint-path ./checkpoints/fpo/fpo-policy/my_fpo_exp/983040 \
  --algo.restore except-critic
```

`--algo.restore` 取 `all` 以外的值时必须同时给 `--algo.policy-checkpoint-path`。
`eval` 也接受 `--algo.policy-checkpoint-path`，只加载权重。

## Ray 启动器 {#ray-launcher}

多 GPU 训练使用 Ray 启动。

```bash
plugrl-run-server-ray dppo-policy default dppo-dist hopper --num-ddp-gpus 4
```

!!! note "Ray 启动器目前不是受支持的路径"

    算法必须写 `dppo-dist` 而不是 `dppo`：`cli_ray.py` 里有
    `isinstance(algo, DDPAlgorithm)` 断言，而只有 UID 为 `dppo-dist` 的
    `DPPOAlgoDistributed` 混入了 `DDPAlgorithm`。上面这条命令需要 `dppo` 可选依赖，
    是因为用了 `dppo-policy`；`dppo-dist` 本身不需要。这个启动器按*本机* GPU 数量
    构造 worker 列表 - 所以多节点集群也只看得见头节点 - 而且它的 server 说的是比
    WebSocket 那套更旧的协议方言。它也早于上面的帧规则：每一帧都调用 `feedback`，
    从不丢帧。除非你就是在改 Ray 这条路径，否则请用 `plugrl-run-server`。

## 常见问题

- `--resume` 报 `FileNotFoundError`：目录里没有 checkpoint。检查 `--checkpoint-base-dir`、`--exp-name` 和两个 UID。
- 启动时报 `FileExistsError`：实验目录已存在。加 `--resume` 或 `--overwrite`，或者换一个 `--exp-name`。如果之前 `--resume` 失败过，这个目录就是那次留下的空目录。
- worker 卡住不 step：检查 worker 是否都走到了 `infer` 阶段。server 等待期间每 5 秒打印一次 `Infer queue has been waiting`。
- `server/discarded_frames` 每次 learn 都在涨：连着多个 worker 或多个环境时这是正常的。buffer 填满的那一轮总有动作还在路上，它们的帧会被丢掉。

## 下一步

- [算法](index.zh.md)
- [自定义算法](custom_algorithm.zh.md)
- [DPPO 策略](../policy/dppo_policy.zh.md)
