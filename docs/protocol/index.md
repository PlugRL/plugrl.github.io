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

## Rules a first implementation usually gets wrong

**Messages strictly alternate.** `infer`, `action`, `feedback`, `infer`, and
so on. The server's connection handler is straight-line code with no
dispatcher, so a client that sends two `infer` messages in a row has the
second one parsed as a `feedback` and is disconnected.

**The action array is time-major.** `action` carries `[H, n, *da]`: the
horizon first, then the `n` environments of the `infer` it answers, in the
same order. The server lays it out environment-first internally and
transposes on the way out. A client that reads it environment-first runs
the wrong actions. It may use any prefix of the `H` steps and ask again
early, but never more than `H`.

**`feedback`'s environment set need not match `infer`'s.** `infer` carries
the environments whose action chunk has run out; `feedback` carries the ones
whose chunk finished on this step. The first time an environment terminates
early, those stop being the same set — permanently. (The `action` always
answers exactly the `infer`'s set.) The pairing between an `action` and the
`feedback` after it is flow control, not association; the server routes
feedback by environment index.

**The reward is the sum over the chunk.** Not the last step's. A client that
reports the final step's reward trains a different MDP, and nothing fails.

**A done step reports its own observation.** On the step that sets
`terminated` or `truncated`, the observation in `feedback` must be the one
that step returned, not the first observation of the next episode. That is
Gymnasium's `AutoresetMode.NEXT_STEP`. An environment that resets inside its
own step sends the wrong one, and again nothing fails.

**`info` is read for one key.** The servers read `info["episode"]` =
`{r, l, s, mask}` (return, length, success, is-this-a-finished-episode), each
an array of length `m`, the number of environments in that `feedback`. They
read it only on a transition whose `terminated` or `truncated` is set, and
feed it to `rollout/reward`, `rollout/length` and `rollout/success`. A
missing `mask` counts as true. Leaving `episode` out trains exactly the
same, but those three metrics read 0; that is how
[E44](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e44-cpp-pendulum)'s
C++ client found it. Nothing else in `info` is read, and `{}` is valid.
One trap, a Gap in SPEC.md: the server splits a non-empty `info` per
environment using the first length-`m` array it finds, at the top level or
one level into a nested map. With `m` > 1 and no such array - `{"task":
"pick"}`, or a msgpack list where an array belongs - the split comes out
wrong. The server treats that as a protocol error: it closes the connection
with the reason `plugrl-server-resync`, and its other clients go on. Until
plugrl-server #108 it closed with 1011 `Internal server error.` and shut the
whole server down.

**A reconnect starts from nothing.** Everything the server knows about an
environment — its previous observation, the policy step state, its done
flags — lives for exactly one connection. A client that reconnects must drop
any `feedback` it was holding: the transition it describes can no longer be
completed. `plugrl-server` now logs `Feedback for env <i> arrived with no
step state` and discards such a transition; before, it stored one built from
an empty observation without a word. The client still sees no error.

## Checking an implementation

`plugrl-protocol` ships a server that grades a client against the
specification and exits non-zero on a violation.

It is one command, and it runs your client for you:

```bash
uv run --extra conformance plugrl-conformance \
    --port 8000 --steps 20 \
    --client "./my_client 127.0.0.1 8000 20"
```

`--client` is a shell command. The checker starts it **after** the socket is
listening and waits for it afterwards, so a client that fails to connect fails
for a reason that is about your client rather than about start-up order. A
non-zero exit from it is reported as a failure of its own.

Without `--client` the checker waits for a client started elsewhere, which is
the older two-terminal form and still works.

To check the reference clients in this repository, the C++ one is a source
file rather than a binary, so it is compiled first:

```bash
g++ -std=c++17 -O2 -Wall -Wextra -o /tmp/plugrl_client examples/plugrl_client.cpp

uv run --extra conformance plugrl-conformance --port 8000 --steps 20 \
    --client "/tmp/plugrl_client 127.0.0.1 8000 20"
```

`plugrl_client.cpp` uses POSIX sockets (`sys/socket.h`, `arpa/inet.h`), so that
build needs Linux, macOS or WSL. The Python reference client has no such
constraint and goes through the same checker:

```bash
uv run --extra conformance plugrl-conformance --port 8000 --steps 20 \
    --client "python examples/raw_client.py --host 127.0.0.1 --port 8000 --steps 20"
```

Its report has two severities. A **violation** is something the real server
would reject or mishandle. A **note** is something it accepts that differs
from what the Python client does — a portability risk, not a breach.

By default the checker watches one connection, so it sees the messages and
not what the client did with them: framing, alternation, environment
indices, observation shape, and the `feedback` payload's keys, dtypes and
lengths.

To check the rest, have the client run the **probe environment** of
[SPEC.md §8.1](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#81-the-probe-environment),
a few lines in any language and no simulator, and add `--probe`:

```bash
uv run --extra conformance plugrl-conformance --probe --scenario all \
    --client "./my_client --probe 127.0.0.1 8000"
```

The checker's actions then encode their own position, so each `feedback`
says what the client did with the chunk: whether it summed the reward over
the steps it ran, sent the terminal observation on a done step, and applied
the actions time-major and in order. It also drives the connection instead
of watching it, starting the client once per scenario:

- `basic`: it speaks late, sends a `metadata` frame over 1 MiB with a key the
  client has never seen, checks that compression was not offered, and ends
  with `plugrl-server-stop`, after which the client must exit 0 and not
  reconnect;
- `resync`: it closes with `plugrl-server-resync` while the client holds a
  `feedback`; the client must reconnect and open with an `infer`;
- `text`: it answers with a text frame, which the client must treat as fatal.

Four clauses of the §8 checklist stay unchecked even then, because a correct
and an incorrect client look the same from the wire: reading `env_ids`,
tolerating a `feedback` set unlike the `infer` set, requiring no particular
`metadata` key, and dropping held `feedback` after a close other than a
resync.

Two reference clients pass every scenario, each with one note: they send
`text` as a msgpack string array, the §3.4 Gap. `raw_client.py` is Python
using only `msgpack` and `websockets` — no numpy, nothing from PlugRL.
`plugrl_client.cpp` is C++17 with **no third-party libraries at all**: SHA-1,
base64, WebSocket framing and the msgpack subset the protocol needs are all
in the one file, because that is the situation an embedded controller is
actually in. Both go through the checker, with `--probe`, in
`plugrl-protocol`'s CI on every push to `main` and every pull request.

## Checking a server

The other direction is checked too. `plugrl-conformance-server` drives a
training server the way SPEC.md lets a client behave, and checks what comes
back: the action layout and `env_ids`, ragged batches, frames over 1 MiB, a
resync close on each kind of malformed message with the server staying up
for its other clients, and the stop at the end of the run
([SPEC.md §8.2](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#82-checking-a-server)):

```bash
uv run --extra conformance plugrl-conformance-server --port 8000 --state-dim 3 --until-stop
```

`examples/reference_server.py` in `plugrl-protocol` is a server written
against the specification that trains nothing, and passes. So does
`plugrl-server`, whose CI runs the checker against it.

## Optional features

The protocol is version 1. The server sends that as `protocol_version` in
`metadata`, and a client must not require the key. What changes is
negotiated as **features**: the server lists the ones it implements in
`metadata`'s `features`, a client uses one only when it is listed, and
nothing changes for either side when it is absent. So an old client works
with a new server, and the other way round
([SPEC.md §10](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#10-versioning)).

There is one so far, `reuse-feedback-obs`
([§10.1](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#101-reuse-feedback-obs)).
Without it every observation crosses the link twice: in the `feedback` that
ends a chunk, and again in the next `infer`. With it the `infer` marks those
rows `reuse` and leaves them out, so only the observation after a reset
crosses twice. `plugrl-server` offers it and `plugrl-env-client` uses it by
default. Between two machines it cut a step with a 184 KiB observation from
18.5 to 11.6 ms, and training ended on byte-identical weights
([E46](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e46-reuse-feedback-obs)).
`plugrl-conformance --features reuse-feedback-obs` offers it to a client, and
`plugrl-conformance-server` exercises it when the server lists it.

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
