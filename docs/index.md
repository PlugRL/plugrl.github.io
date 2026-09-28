# PlugRL

PlugRL trains a policy against environments that run somewhere else: in
another process, on another machine, on a machine with no GPU, or in a
program that is not Python. A training server holds the policy and the
algorithm; env clients step the environments and ask it for actions. Between
them is a written protocol that carries the rewards and episode ends back as
well as the actions out, so the policy is trained, not only served.

## What runs on it

Every combination of the two MLP policies and the two algorithms on four
tasks, and the baseline they are measured against, a Gaussian MLP with PPO.
All sixteen learn. The border and its label say what the experiments found.
The line under each clip is the training curve of all three seeds (the
return; on square, the success rate, since those runs do not share a
reward), drawn on one scale per column, so a flat line really is flat. Hover
over a cell to play it; click or tap it to play it and see the two commands
that trained it. From one cell to the next, only the words that name the
policy, the algorithm and the task change.

<div class="cov" data-part="grid" data-src="/media/coverage/coverage.json"></div>

On square every row fine-tunes a pretrained policy: `dppo-policy` and the
Gaussian MLP start from DPPO's released checkpoints, `fpo-policy` from a
behaviour-cloned start of our own
([E35](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e35-square-bc)).
The Gaussian MLP row is CleanRL's policy and PPO on the three MuJoCo tasks,
where it ends about where CleanRL's own runs do
([E38](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e38-gaussian-ppo)),
and DPPO's Gaussian MLP with DPPO's own PPO settings on square
([E40](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e40-square-gaussian-ppo)).
`dppo-policy · FPO` is missing because it cannot exist: FPO trains flow
policies only. Each clip comes from the final checkpoint of the seed whose
last ten iterations were the median of three. That checkpoint was evaluated
for five episodes, and the clip is the episode with the median return, not
the best one. The scripts that made all of this are in
[figures/coverage](https://github.com/PlugRL/plugrl-server/tree/main/figures/coverage).

The two sides do not even share a Python environment. None of the servers
that trained these cells has MuJoCo, robosuite or gymnasium installed. The
env clients ran in two separate environments: gymnasium with MuJoCo 3 for the
MuJoCo tasks, and robosuite 1.4.1 with MuJoCo 2.3.7 for robomimic, because
robosuite 1.4.1 does not run on MuJoCo 3. One server codebase trained all
sixteen.

The same pair also learns with its env clients on another machine: a
Windows laptop on campus Wi-Fi steps HalfCheetah for a server on a Linux
workstation. Six seeds on each side fall within one band. Across the two
machines, a run took 41-53 minutes instead of 20
([E43](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e43-cross-machine-training)).

<img src="/media/cross-machine.png" style="width:100%;max-width:720px"
     alt="Episode return over 100 iterations for fpo-policy with FPO on HalfCheetah, six seeds on one machine and six across two machines. Both bands rise from about -300 to between roughly 700 and 2,300 and overlap throughout.">

## The environment side is light

The training server is 6.5G and wants a GPU. The machine running environments
needs neither. A LIBERO env client installs at **3.4G with no nvidia wheels**
instead of 7.8G with sixteen, sends byte-identical observations, and renders
on the **CPU**: ten clients at once, 30 of 30 episodes successful, at
**1.91x** the wall clock of the same run on a GPU
([E12](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e12-cuda-free-rollout),
[E13](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e13-gpu-free-rendering)).
Stepping is 10x slower in software, and most of that hides behind the queue
of clients waiting on one policy.

It does not have to be Python either. [The protocol](protocol/index.md) is
written down, with a conformance checker, and a client in C++ with nothing
beyond the standard library - no msgpack or WebSocket library - drove a real
training server through 120 training exchanges
([E2](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e2-cross-language)).

## What the split costs

On one machine, almost nothing: an exchange takes 0.1 ms with states only and
under 1 ms with a 588 KiB observation. Between two machines it becomes two
terms:
- **A fixed latency.** About 3 ms between a laptop on campus Wi-Fi and a wired
  workstation, over Tailscale.
- **Twice the observation's bytes over the link's bandwidth.** Each exchange
  carries the observation twice, once asking for the action and once in the
  feedback.

On that link, at 18 MB/s, a state-only task pays about 3 ms per step, and a
184 KiB camera observation about 21 ms
([E43](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e43-cross-machine-training)).
A faster link shrinks the second term in proportion.

## A real VLA, end to end

<video src="/media/libero-base.mp4" autoplay loop muted playsinline controls
       style="width:360px;max-width:100%"></video>

*The **unmodified** pi0.5, driven through the boundary on `libero_spatial`
task 0 - three episodes, all three successful. This is the observation stream
the policy itself sees, at its native 224x224, not an outside camera.*

The same two processes carry a full-size pi0.5. The env client steps LIBERO
and the server answers with actions; nothing about the boundary changes, only
the policy does. The unmodified checkpoint scored 99 of 100 on
`libero_spatial` and 185 of 200 on `libero_10`, against openpi's published
98.8 and 92.4, and the server's episode and step counts matched the clients'
exactly, which is what says the transport dropped nothing
([E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)).

Fine-tuning pi0.5 with reinforcement learning through PlugRL has not made it
better yet. That record, with clips, is on [its own page](vla.md).

## Quickstart

A pair that learns without a GPU: FPO on HalfCheetah-v5, CPU only, with no
assets to download. Neither package is on PyPI, so install both from
source:

```bash
git clone https://github.com/PlugRL/plugrl-server.git
git clone https://github.com/PlugRL/plugrl-env-client.git

cd plugrl-server     && uv sync && cd ..
cd plugrl-env-client && uv sync --extra mujoco && cd ..
```

Then, in two terminals:

```bash
# Terminal 1 - the training server
plugrl-run-server fpo-policy default fpo default \
    --port 8000 --policy.device cpu \
    --algo.global-steps 500000 --algo.buffer-size 4096

# Terminal 2 - the environment
plugrl-run-env-client mujoco-v1 \
    --server-host 127.0.0.1 --server-port 8000 \
    --num-envs 1 --num-episodes 600 --runner.replan-steps 1 --runner.seed 0
```

Episode return starts near -300 and reaches **1928 ± 224** by 500k steps
across three seeds, roughly a hundred minutes on the CPU-only machine that
measured it
([E6](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e6-first-learning-curve)).
[Get Started](user_guide/get_started.md) has the rest: why
`--algo.buffer-size` matters, a connectivity check, and troubleshooting.

## Components

- `plugrl-server`: training server, runs algorithm, policy, checkpoints, tracking
- `plugrl-env-client`: environment runner, collects rollouts
- `plugrl-protocol`: transport, message types, and serialization (WebSocket + msgpack)

Envs, policies and algorithms can live in your own packages, registered on the
side that uses them.

## Next steps

- [User Guide](user_guide/index.md)
- [Get Started](user_guide/get_started.md)
- [Protocol](protocol/index.md)
- [Algorithms](algorithm/index.md)
- [Environments](env/index.md)
- [Policies](policy/index.md)
- [Contributing](contributing/index.md)
