# 贡献：环境

环境在 `plugrl-env-client` 中实现。

## 代码放哪里

- 实现：`src/plugrl_env_client/envs/<family>/<family>_env.py`。CLI 启动时会 import
  `envs/` 下所有 `*_env.py` 文件。
- 注册：`plugrl_env_client.utils.registration`（`register_env`、`register_env_config`）。
- 可选依赖：在 `pyproject.toml` 的 `[project.optional-dependencies]` 下加一个
  extra，并在模块开头检查依赖，缺了就抛出写明这个 extra 的 `ImportError`，
  和 `envs/mujoco/mujoco_env.py` 一样。这样没装 extra 时，CLI 只是打一条警告
  跳过这个环境，而不是整个起不来。

## 清单

- 实现 `BaseEnv` 与配置 dataclass，配置的每个字段都要有默认值。
- 注册 env UID，让 `plugrl-run-env-client <env-id>` 可用；子命令是 UID 的小写形式。
- 遵守[约定](../env/custom_env.zh.md#contract)：设好 `single_action_space`，
  `step` 返回成批的数组，处理 `reset_indices`，通过 `seed_rngs` 播种，
  绝不在 `step` 里自己 reset。
- 返回的 `Observation` 里，每个图像和状态数组的第一维都是 `num_envs`。
  `Recorder`（`plugrl_env_client.recorder`）会按 env 切开它，保存首末帧观测和视频。
- 任务有"成功"这个概念的话，给 `register_env` 传 `best_reward_threshold_for_success`，
  否则 server 的 `rollout/success` 一直是 0。

## 验证

在 `plugrl-server` 里启动 dummy server。把 `--policy.action-dim` 设成你的环境的
动作维数；离散动作的话再加 `--policy.discrete`，并把它设成可选动作的个数。

```bash
uv run plugrl-run-server dummy-policy default dummy default --policy.action-dim <action-dim>
```

在 `plugrl-env-client` 里用你的 env 启动 env client。

```bash
uv run plugrl-run-env-client <env-id> --server-host 127.0.0.1 --server-port 8000 --num-episodes 3
```

## 常见问题

- CLI 找不到 UID：模块没有被 import。看看启动时有没有 `Skip loading env module ...` 警告。
- `Expected action shape tail ...`：dummy server 的 `--policy.action-dim` 和环境不一致。
- 创建 env 失败：检查可选依赖与默认配置。

## 下一步

- [自定义环境](../env/custom_env.zh.md)
- [贡献指南](index.zh.md)
