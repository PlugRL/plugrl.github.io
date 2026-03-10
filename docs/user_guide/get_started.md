## Get Started

This page walks you through a minimal end-to-end **connectivity/debug smoke test**:

- Start a server (dummy algorithm + dummy policy)
- Start a worker (dummy environment)
- Verify the infer/action/feedback loop

> Notes
>
> - The server default is `0.0.0.0:8000`.
> - The worker connects to `--server-host/--server-port`.

## 1) Install

PlugRL is meant to be integrated as a **suite of packages** in an existing project. You do not need to mirror this repo's folder structure.

You typically only need these packages installed (and they will bring `plugrl-client` as a dependency):

- `plugrl-server`
- `plugrl-worker`

If you are developing locally (changing code), you can also install each package in editable mode:

```bash
pip install -e .
```

Tip: treat `dummy` as a smoke test: validate connectivity first, then plug in your own env/policy.

## 2) Use `dummy` as a connectivity check

### Terminal A: start server

```bash
plugrl-run-server dummy-policy default dummy default
```

You should see logs like:

- WebSocket listening on `0.0.0.0:8000`
- Selected algorithm/policy configs

### Terminal B: start worker

```bash
plugrl-run-worker dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

If the connection is OK, worker will print server metadata and start stepping the env.

## 3) Optional: remote viewer

The worker can stream observations to a separate viewer via WebSocket.

### Terminal C: start viewer

From `plugrl-monitor`:

```bash
uvicorn vlarl_viewer.main:app --reload --host 0.0.0.0 --port 9000
```

Open `http://localhost:9000/` in your browser.

### Terminal B (worker): enable streaming

```bash
plugrl-run-worker dummy-v1 \
	--use-remote-viewer \
	--viewer-host 127.0.0.1 \
	--viewer-port 9000
```

## 4) DPPO examples (single-node)

The server supports DPPO (`dppo`) and a Ray-based distributed launcher.

### Single process server

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

### Ray launcher

```bash
plugrl-run-server-ray dppo-policy default dppo hopper --exp_name my_dppo_exp --num-ddp-gpus 4
```

## Troubleshooting

- Worker keeps retrying: check server host/port and firewall.
- Viewer shows “env disconnected”: check `--viewer-host/--viewer-port` and that worker runs with `--use-remote-viewer`.
- `--resume` requires an existing checkpoint directory.
