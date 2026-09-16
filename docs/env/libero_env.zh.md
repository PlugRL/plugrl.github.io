# Libero 环境

通过可选依赖在 `plugrl-env-client` 中运行 Libero。

## 安装

安装带 Libero extras 的 env client。

```bash
pip install -e ".[libero]"
```

## 快速开始

查看可配置项。

```bash
plugrl-run-env-client libero-v1 --help
```

跑几个 episode。

```bash
plugrl-run-env-client libero-v1 --num-episodes 10 --server-host 127.0.0.1 --server-port 8000
```

## E11 是怎么跑的

E11 通过一个 PlugRL server 在 LIBERO 上评测 `pi05_libero` checkpoint：一个任务一个
客户端进程，十个任务同时跑，每个任务的初始状态按顺序取，而不是随机采样。

```bash
plugrl-run-env-client libero-v1 \
  --server-host 127.0.0.1 --server-port 8000 \
  --num-envs 1 --num-procs 10 --num-episodes 10 \
  --env.task-suite-name libero_spatial \
  --env.no-randomize-initial-state \
  --runner.pass-proc-id \
  --runner.replan-steps 5 \
  --runner.seed 7 \
  --recorder.no-thread0-only \
  --exp-name my_eval
```

- `--runner.pass-proc-id` 让第 *i* 个进程跑第 *i* 个任务，十个进程正好覆盖十任务
  套件；此时 `--num-episodes` 是**每个任务**的回合数，不是总数。若想固定跑单个
  任务——微调那几次就是这么做的——去掉该 flag，改传
  `--env.task-id 8 --env.randomize-initial-state`。
- `--recorder.no-thread0-only` 让每个进程都写出自己的 `summary.json`。不加它就只有
  0 号进程上报，事后无法还原逐任务成功率。
- 渲染走 EGL，客户端环境里需要 `MUJOCO_GL=egl` 与 `PYOPENGL_PLATFORM=egl`。它渲染
  在哪块 GPU 上由 EGL 自己的设备顺序决定，不一定与 `CUDA_VISIBLE_DEVICES` 一致。
- LIBERO 会写自己的配置文件，首次运行前把 `LIBERO_CONFIG_PATH` 指到可写目录。

协议、结果，以及两个进程各自被记录下来的环境：
[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)。

## 验证

- env client 能创建 Libero 环境
- episode 能正常跑完

## 常见问题

- 多进程初始化冲突：可尝试 `--use-env-lock`。

## 下一步

- [环境](index.zh.md)
- [快速开始](../user_guide/get_started.zh.md)
