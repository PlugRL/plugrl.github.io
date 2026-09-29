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

检验器看的是一条规规矩矩的连接，所以它只查这条连接看得到的东西：分帧、消息交替、
环境编号、观测形状，以及 `feedback` 载荷的键、dtype 和长度。SPEC.md §8 清单里的其余
条款它不查，而且没被触及的条款在报告里不留任何痕迹。下面这些全违反的客户端，照样
打印 "no violations"：

- 连接选项（关闭压缩、不限帧大小）；
- 发任何东西之前先读 `metadata`；
- 按动作块求和的奖励，以及结束那一步的终止观测；
- 区别对待 `plugrl-server-stop` 和 `plugrl-server-resync` 两种关闭原因、重连时丢弃
  手上的 `feedback`、把文本帧当致命错误；
- 客户端拿到 `action` 之后怎么用：时间优先的布局，以及读 `env_ids`。

两个参考客户端都能通过。`raw_client.py` 是 275 行 Python，只用 `msgpack` 和
`websockets`，不用 numpy，也不用 PlugRL 的任何东西。`plugrl_client.cpp` 是 C++17，
**完全不依赖第三方库**：SHA-1、base64、WebSocket 分帧，以及协议需要的那部分
msgpack，全都写在同一个文件里 —— 因为嵌入式控制器面对的就是这种处境。

`plugrl-protocol` 的 CI 在每次推到 `main` 和每个 pull request 上都让两者过一遍检验器。
CI 还会给 C++ 客户端发 float64、时间优先的动作，再从它打印的输出核对它解对了。
这是对 C++ 客户端的检查，检验器没法替你的客户端做。除此之外，上面清单里的各条对
两个客户端都没有被检查。

## 与 openpi 的关系

PlugRL 的序列化就是
[openpi](https://github.com/Physical-Intelligence/openpi) 的。`msgpack_numpy`
取自 openpi（Apache-2.0），仅重新排版，因此**数组编码逐字节相同** —— 用 C++ 或
Rust 写客户端时真正费力的那部分，可以在两个生态之间通用。

不同之处在消息层。openpi 发一个裸观测、收一个裸动作，这是**服务**一个策略所需的；
PlugRL 给两者加了信封，并加上 `feedback` 回传通道，这是**训练**一个策略所需的。
