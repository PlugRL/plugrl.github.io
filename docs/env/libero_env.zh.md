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

## 验证

- env client 能创建 Libero 环境
- episode 能正常跑完

## 常见问题

- 多进程初始化冲突：可尝试 `--use-env-lock`。

## 下一步

- [环境](index.zh.md)
- [快速开始](../user_guide/get_started.zh.md)
