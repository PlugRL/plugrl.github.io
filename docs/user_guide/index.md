## Overview

This guide focuses on the end-to-end workflow:

1. Start a training server (`plugrl-run-server` or `plugrl-run-server-ray`).
2. Start one or more environment workers (`plugrl-run-worker <env>`).
3. (Optional) Start the remote viewer to stream observations.

## Components

- **Server (`plugrl-server`)**
	- Batches inference across all connected workers.
	- Calls `algorithm.infer(...)` and `algorithm.feedback(...)`.
	- Runs learning (`algorithm.learn(...)`) and checkpointing.

- **Worker (`plugrl-worker`)**
	- Creates Gymnasium environments via `gym.make(<env_id>, config=...)`.
	- Connects to server via `plugrl_client.websocket_worker_agent.WebSocketWorkerAgent`.
	- Sends `infer` (observation), receives `action`, sends `feedback`.

- **Protocol (`plugrl-client`)**
	- WebSocket transport + msgpack serialization (`msgpack_numpy`).
	- Message types: `metadata`, `infer`, `action`, `feedback`.

## Next

Continue with **Get Started**: use `dummy` as a quick connectivity/debug smoke test first, then swap in your own envs/policies.
