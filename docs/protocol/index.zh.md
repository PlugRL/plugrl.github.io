# 通信协议

PlugRL 把一次训练拆成两个进程。**训练服务端**持有策略与学习算法，**环境客户端**
运行环境、请求动作、汇报结果。两者通过 WebSocket 通信，线上格式是 msgpack。

这条边界正是训练栈与环境栈不必共处同一个 Python 环境的原因，也是环境客户端
根本不必是 Python 的原因 —— 一个 ROS 节点可以是，机器人上的 C++ 控制器也可以是。

!!! info "规范正本在 `plugrl-protocol`"

    **[SPEC.md](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md)**
    是规范性文件。它与所描述的代码放在一起，以免两者漂移；本页只做导览。

    规范里用 **Gap** 标注了协议自己的已知缺陷。那部分才是诚实的部分，
    在此之上开发前请先读它们。

## 一次交换

```
客户端                                      服务端
  |------------ WebSocket 握手 -------------->|
  |<---------------- metadata -----------------|   服务端先说话
  |------------------ infer ------------------>|   观测
  |<----------------- action ------------------|   一段动作块
  |----------------- feedback ---------------->|   奖励、终止标志、下一观测
```

四种消息类型 —— `metadata`、`infer`、`action`、`feedback` —— 都是带
`message_type` 字段的 msgpack map。数组的形式是

```
{b"__ndarray__": true, b"data": <bin>, b"dtype": "<f4", b"shape": [4, 1, 7]}
```

`dtype` 是 numpy 的 typestr：一个字节序字符、一个类型字符、一个元素字节数。
用任何语言解析它大约十行代码。

## 最容易实现错的几条规则

**消息严格交替。** `infer`、`action`、`feedback`、`infer`……服务端的连接处理
是一段没有分发器的顺序代码，所以连发两个 `infer` 的客户端会让第二个被当成
`feedback` 解析，然后被断开。

**动作数组是时间优先的。** `action` 的形状是 `[H, n, *da]`：先是 horizon，再是
它所回应的那条 `infer` 里的 `n` 个环境，顺序不变。服务端内部按环境优先排，发出
之前转置。按环境优先去读的客户端，执行的就是错的动作。客户端可以只用 `H` 步里
的任意前缀、提前再要一次，但不能要超过 `H` 步。

**`feedback` 的环境集合不必与 `infer` 的相同。** `infer` 携带的是动作块刚用完的
环境，`feedback` 携带的是本步结束时动作块用完的环境。只要有一个环境提前终止，
这两个集合就**永久**不再相等。（`action` 回应的永远正好是 `infer` 那一组。）
`action` 与其后 `feedback` 的配对只是流控，不是语义关联 —— 服务端按环境编号查表路由。

**奖励是整个动作块上的求和**，不是最后一步的奖励。只汇报最后一步的客户端会在
一个不同的 MDP 上训练，而且不会有任何东西报错。

**结束的那一步汇报它自己的观测。** 在置了 `terminated` 或 `truncated` 的那一步，
`feedback` 里的观测必须是这一步返回的那一帧，而不是下一个 episode 的第一帧。
这就是 Gymnasium 的 `AutoresetMode.NEXT_STEP`。在自己的 step 里就 reset 的环境
会发错这一帧，同样不会有任何报错。

**`info` 只读一个键。** 服务端只读 `info["episode"]` = `{r, l, s, mask}`（回报、
长度、是否成功、这一项是否是刚结束的 episode），每一项都是长度为 `m` 的数组，
`m` 是这条 `feedback` 里的环境数。只有在置了 `terminated` 或 `truncated` 的转移
上才读，读来的值进 `rollout/reward`、`rollout/length` 和 `rollout/success`。缺了
`mask` 就当作 true。不发 `episode`，训练完全一样，只是这三个指标一直是 0；
[E44](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e44-cpp-pendulum)
的 C++ 客户端就是这么发现它的。`info` 里的其他内容一概不读，发 `{}` 也合法。
有一个坑，是 SPEC.md 里的一条 Gap：服务端拆分非空的 `info` 时，靠的是它找到的第一个
长度为 `m` 的数组，只在顶层或往下一层的嵌套 map 里找。`m` > 1 而又没有这样的数组时
—— 比如 `{"task": "pick"}`，或者该放数组的地方放了 msgpack list —— 就会拆错。
服务端把这当作协议错误：以 `plugrl-server-resync` 为原因关闭这条连接，其他客户端
照常继续。在 plugrl-server #108 之前，连接会以 1011 `Internal server error.` 关闭，
整个服务端也随之退出。

**重连意味着从零开始。** 服务端关于一个环境的全部记忆 —— 上一帧观测、策略的
step state、终止标志 —— 只活在一条连接里。重连的客户端必须丢弃手上未发出的
`feedback`：它描述的那次转移已经无法补全。`plugrl-server` 现在遇到这种转移会打一条
`Feedback for env <i> arrived with no step state` 警告并把它丢掉；以前它会不声不响
地存下一条由空观测拼出来的转移。客户端这边仍然看不到任何报错。

## 检验一个实现

`plugrl-protocol` 附带一个服务端，它按规范给客户端打分，有违规就以非零码退出。

一条命令就够，它会替你把客户端也起起来：

```bash
uv run --extra conformance plugrl-conformance \
    --port 8000 --steps 20 \
    --client "./my_client 127.0.0.1 8000 20"
```

`--client` 接收一条 shell 命令。检验器会在**端口开始监听之后**再启动它，结束后等它退出——
这样"客户端连不上"就只可能是客户端自己的问题，而不是启动顺序。客户端以非零码退出
也会被单独记为一条失败。

不传 `--client` 时，它就等别处启动的客户端连进来，也就是原来那种两个终端的用法，依然可用。

要检验本仓库自带的参考客户端：C++ 那个是源码而非可执行文件，需要先编译。

```bash
g++ -std=c++17 -O2 -Wall -Wextra -o /tmp/plugrl_client examples/plugrl_client.cpp

uv run --extra conformance plugrl-conformance --port 8000 --steps 20 \
    --client "/tmp/plugrl_client 127.0.0.1 8000 20"
```

`plugrl_client.cpp` 用的是 POSIX socket（`sys/socket.h`、`arpa/inet.h`），
所以这一步需要 Linux、macOS 或 WSL。Python 参考客户端没有这个限制，
过的是同一个检验器：

```bash
uv run --extra conformance plugrl-conformance --port 8000 --steps 20 \
    --client "python examples/raw_client.py --host 127.0.0.1 --port 8000 --steps 20"
```

报告分两个等级。**violation** 是真服务端会拒绝或处理错的问题；**note** 是真服务端
接受、但与 Python 客户端做法不同的地方 —— 是可移植性风险，不是违约。

默认情况下，检验器旁观一条连接，所以它看得到消息，看不到客户端拿这些消息做了什么：
它查分帧、消息交替、环境编号、观测形状，以及 `feedback` 载荷的键、dtype 和长度。

其余的要让客户端跑 [SPEC.md §8.1](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#81-the-probe-environment)
里的**探针环境**（任何语言几行就能写完，不需要模拟器），再加上 `--probe`：

```bash
uv run --extra conformance plugrl-conformance --probe --scenario all \
    --client "./my_client --probe 127.0.0.1 8000"
```

这时检验器发出的动作值编码了它自己在动作块里的位置，所以每条 `feedback` 都说明了客户端
怎么处理这个动作块：奖励有没有按实际跑的步数求和，结束那一步发的是不是终止观测，动作有没有
按时间优先、按顺序执行。检验器也不再只是旁观，而是主动驱动连接，每个场景各启动一次客户端：

- `basic`：它晚一点才开口，发一个超过 1 MiB、带着客户端没见过的键的 `metadata`，检查
  握手没有提供压缩，最后用 `plugrl-server-stop` 结束，此后客户端必须以 0 退出、不再重连；
- `resync`：在客户端手上还压着一条 `feedback` 时用 `plugrl-server-resync` 关闭连接，
  客户端必须重连，并且新连接上的第一条消息必须是 `infer`；
- `text`：它用一个文本帧作答，客户端必须把它当致命错误。

即便如此，§8 清单里仍有四条查不了，因为从线上看，做对和做错的客户端表现一样：读
`env_ids`、容忍 `feedback` 的环境集合和 `infer` 不同、不要求 `metadata` 里有特定的键，
以及非 resync 关闭之后丢弃手上的 `feedback`。

两个参考客户端都能通过全部场景，各有一条 note：它们把 `text` 发成 msgpack 字符串数组，
也就是 §3.4 里的 Gap。`raw_client.py` 是只用 `msgpack` 和 `websockets` 的 Python，
不用 numpy，也不用 PlugRL 的任何东西。`plugrl_client.cpp` 是 C++17，**完全不依赖第三方库**：
SHA-1、base64、WebSocket 分帧，以及协议需要的那部分 msgpack，全都写在同一个文件里 ——
因为嵌入式控制器面对的就是这种处境。`plugrl-protocol` 的 CI 在每次推到 `main` 和每个
pull request 上，都让两者带着 `--probe` 过一遍检验器。

## 检验训练端

反方向也能检验。`plugrl-conformance-server` 按 SPEC.md 允许客户端的方式去驱动一个训练端，
检查它的回应：动作布局和 `env_ids`、参差的批次、超过 1 MiB 的帧、遇到每一种格式错误的
消息都以 resync 关闭且服务端对其他客户端照常工作，以及训练结束时的 stop
（[SPEC.md §8.2](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#82-checking-a-server)）：

```bash
uv run --extra conformance plugrl-conformance-server --port 8000 --state-dim 3 --until-stop
```

`plugrl-protocol` 里的 `examples/reference_server.py` 是照着规范写的一个什么都不训练的
训练端，能通过。`plugrl-server` 也能通过，它的 CI 每次都跑这个检验器。

## 可选特性

协议是第 1 版。服务端在 `metadata` 里以 `protocol_version` 发出版本号，客户端不得依赖
这个键。变化通过**特性**协商：服务端在 `metadata` 的 `features` 里列出自己实现了哪些，
客户端只用列出来的；某个特性不存在时，两边都和原来一样。所以旧客户端能连新服务端，反过来也行
（[SPEC.md §10](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#10-versioning)）。

目前只有一个特性：`reuse-feedback-obs`
（[§10.1](https://github.com/PlugRL/plugrl-protocol/blob/main/SPEC.md#101-reuse-feedback-obs)）。
没有它时，每个观测要过两次链路：一次在结束动作块的 `feedback` 里，一次在下一条 `infer` 里。
有了它，`infer` 把这些行标成 `reuse` 并略去，只有重置后的那个观测还要过两次。
`plugrl-server` 提供这个特性，`plugrl-env-client` 默认使用。跨两台机器时，它把带 184 KiB
观测的一步从 18.5 毫秒降到 11.6 毫秒，训练出的权重逐字节相同
（[E46](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e46-reuse-feedback-obs)）。
`plugrl-conformance --features reuse-feedback-obs` 会向客户端提供这个特性，
`plugrl-conformance-server` 则在服务端列出它时去检验它。

## 与 openpi 的关系

PlugRL 的序列化就是
[openpi](https://github.com/Physical-Intelligence/openpi) 的。`msgpack_numpy`
取自 openpi（Apache-2.0），仅重新排版，因此**数组编码逐字节相同** —— 用 C++ 或
Rust 写客户端时真正费力的那部分，可以在两个生态之间通用。

不同之处在消息层。openpi 发一个裸观测、收一个裸动作，这是**服务**一个策略所需的；
PlugRL 给两者加了信封，并加上 `feedback` 回传通道，这是**训练**一个策略所需的。
