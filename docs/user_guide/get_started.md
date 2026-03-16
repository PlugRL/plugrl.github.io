# Get Started

Run a minimal end-to-end smoke test.

> Note: Server default address is `0.0.0.0:8000`. Env client connects via `--server-host` and `--server-port`.

## Quickstart

Terminal A starts the server.

```bash
plugrl-run-server dummy-policy default dummy default
```

Terminal B starts the env client.

```bash
plugrl-run-env-client dummy-v1 --num-episodes 2 --server-host 127.0.0.1 --server-port 8000
```

## Verify

- Server prints a WebSocket listening address.
- Env client prints server metadata and steps episodes.

## Remote viewer

Terminal C starts the viewer.

```bash
uvicorn vlarl_viewer.main:app --reload --host 0.0.0.0 --port 9000
```

Open this URL.

- `http://localhost:9000/`

Run the env client with streaming enabled.

```bash
plugrl-run-env-client dummy-v1 --use-remote-viewer --viewer-host 127.0.0.1 --viewer-port 9000
```

## DPPO examples

Single process server.

```bash
plugrl-run-server dppo-policy default dppo hopper --exp_name my_dppo_exp
```

Ray launcher.

```bash
plugrl-run-server-ray dppo-policy default dppo hopper --exp_name my_dppo_exp --num-ddp-gpus 4
```

## Common options

- Set server address with `--host` and `--port`.
- Control episode count with `--num-episodes`.
- Resume requires an existing experiment directory under `--checkpoint-base-dir`.

## Troubleshooting

- Env client keeps retrying: check server address and firewall.
- Viewer shows disconnected: check `--viewer-host` and `--viewer-port`, then confirm `--use-remote-viewer` is enabled.
- `--resume` requires existing checkpoints.

## Next steps

- [User Guide](index.md)
- [Algorithms](../algorithm/index.md)
- [Environments](../env/index.md)
- [Policies](../policy/index.md)
