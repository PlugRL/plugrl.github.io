# The wire protocol

PlugRL splits a training run across two processes. A **training server**
holds the policy and the learning algorithm. An **env client** runs
environments, asks for actions, and reports what happened. They talk over
WebSocket, with msgpack on the wire.

That boundary is the reason an environment stack and a training stack never
have to share a Python environment — and the reason an env client does not
have to be Python at all. A ROS node can be one. So can a robot's onboard
C++ controller.

!!! info "The specification lives in `plugrl-protocol`"

    **[SPEC.md](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md)**
    is the normative document. It is kept next to the code it describes so
    the two cannot drift apart, and this page only orients you.

    It also names its own known defects, in boxes marked **Gap**. Those are
    the honest part; read them before building on anything.

## The exchange

```
client                                     server
  |------------ WebSocket handshake ---------->|
  |<---------------- metadata -----------------|   the server speaks first
  |------------------ infer ------------------>|   observations
  |<----------------- action ------------------|   an action chunk
  |----------------- feedback ---------------->|   reward, done, next obs
```

Four message types — `metadata`, `infer`, `action`, `feedback` — carried as
msgpack maps with a `message_type` field. Arrays travel as

```
{b"__ndarray__": true, b"data": <bin>, b"dtype": "<f4", b"shape": [4, 1, 7]}
```

`dtype` is a numpy typestr: a byte-order character, a kind character, and an
item size. Parsing it takes about ten lines in any language.

## Four rules a first implementation usually gets wrong

**Messages strictly alternate.** `infer`, `action`, `feedback`, `infer`, and
so on. The server's connection handler is straight-line code with no
dispatcher, so a client that sends two `infer` messages in a row has the
second one parsed as a `feedback` and is disconnected.

**The environment sets in one cycle need not match.** `infer` carries the
environments whose action chunk has run out; `feedback` carries the ones
whose chunk finished on this step. The first time an environment terminates
early, those stop being the same set — permanently. The pairing between an
`action` and the `feedback` after it is flow control, not association; the
server routes feedback by environment index.

**The reward is the sum over the chunk.** Not the last step's. A client that
reports the final step's reward trains a different MDP, and nothing fails.

**A reconnect starts from nothing.** Everything the server knows about an
environment — its previous observation, the policy step state, its done
flags — lives for exactly one connection. A client that reconnects must drop
any `feedback` it was holding: the transition it describes can no longer be
completed, and sending it puts a transition built from an empty observation
into the training buffer. Nothing on either side reports an error when that
happens, which is what makes it worth stating.

## Checking an implementation

`plugrl-protocol` ships a server that grades a client against the
specification clause by clause and exits non-zero on a violation:

```bash
python examples/conformance_server.py --port 8000 --steps 20 &
./plugrl_client 127.0.0.1 8000 20
```

Its report has two severities. A **violation** is something the real server
would reject or mishandle. A **note** is something it accepts that differs
from what the Python client does — a portability risk, not a breach.

Two reference clients pass it. `raw_client.py` is 275 lines of Python using
only `msgpack` and `websockets` — no numpy, nothing from PlugRL.
`plugrl_client.cpp` is C++17 with **no third-party libraries at all**: SHA-1,
base64, WebSocket framing and the msgpack subset the protocol needs are all
in the one file, because that is the situation an embedded controller is
actually in.

Both run in CI on every change, so the claim on this page stays checked
rather than remembered.

## Relationship to openpi

PlugRL's serialization is
[openpi](https://github.com/Physical-Intelligence/openpi)'s. The
`msgpack_numpy` codec is taken from it under Apache-2.0 and reformatted
only, so **the array encoding is byte-identical** — the part of a client
that takes real work in C++ or Rust carries across between the two.

The message layer differs. openpi sends a bare observation and gets a bare
action back, which is what serving a policy needs. PlugRL wraps both in an
envelope and adds the `feedback` return channel, which is what training one
needs.
