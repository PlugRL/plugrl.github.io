## Libero 环境

`plugrl-worker` 提供了对 Libero 的集成（通常作为可选依赖安装）。

### 安装

以“可选依赖组”的方式安装（具体命令取决于你的安装方式/工具链），概念上类似：

```bash
pip install -e ".[libero]"
```

### 运行

先查看 Libero 环境对应的 env id 以及可配置项：

```bash
plugrl-run-worker libero-v1 --help
```

然后像其它环境一样启动 worker：

```bash
plugrl-run-worker libero-v1 --num-episodes 10 --server-host 127.0.0.1 --server-port 8000
```

### 备注

- Libero 初始化相对更重，多进程时若遇到初始化冲突，可尝试开启 `--use-env-lock` 进行串行初始化。
