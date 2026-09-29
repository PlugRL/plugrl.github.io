# pi0.5 在 LIBERO 上

主页展示了一个完整尺寸的 pi0.5 穿过 PlugRL 的边界跑通，评估结果和 openpi 公布的一致。
这一页是那份记录的其余部分：通过 PlugRL 用强化学习微调它，到目前为止做到了什么。
简单说，还没能让策略变好。前几次跑出来的崩塌都是我们自己的缺陷，修掉之后 FPO 基本让策略
停在原来的水平。

<div class="cov" data-part="vla" data-src="/media/coverage/coverage.json"></div>

三段视频都从同一个场景开始，也就是原版策略能完成的第一个场景；视频下面的数字来自 50 个
回合的评估。原版策略在七次这样的评估里得分在 28 到 37 之间。实验跑了两个种子的，视频和
数字都取分数较低的那个。点一下视频，会显示它背后的两条命令。

## 经过

第一次跑 FPO，一轮就把最难那个任务的成功率从 26/50 打到 0/50，而且跑不了第二轮：第一轮
分配的优化器状态占满了 24 GB 的卡，第二次 learn 装不下
（[E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)）。

这次归零是我们的缺陷。这里的 FPO 给一个动作块打分时，对全部 320 个元素的误差取平均，
其中大部分是补零的维度或客户端根本没执行的步。按 FPO++ 的方式打分——只算执行了的步、
只算 LIBERO 用到的维度——一次更新后 pi0.5 还有 33/50
（[E32](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e32-pi0-fpo-plus-plus)）。
两者之间的 E14 到 E26，就是找这个原因的过程。

训练得更久，它还是会掉。五轮 FPO 把两个种子打到 5/50 和 0/50，当时我们 FPO 的其余部分
还是自己的默认设置，没换成 FPO++ 的；十轮 DPPO 后是 20/50，比原版策略的平均低了三个
标准差（[E36](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e36-pi0-longer)）。

这次下跌也是我们的问题。把 FPO++ 其余的微调设置补齐（优化器、梯度裁剪、critic 学习率、
原始奖励、lambda 和 clip）之后，同样两个种子跑十轮 FPO，分别是 40/50 和 27/50
（[E42](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e42-pi0-fpo-plus-plus)）。
两个都没达到跑之前定好的 42/50，所以这是 FPO 稳住了 pi0.5，不是把它变好了。分数较低的
那个种子（上面的视频就是它）在往 E36 那样的方向漂，只是慢得多；再往后跑还稳不稳，还不知道。

录这些视频的脚本在
[figures/coverage](https://github.com/PlugRL/plugrl-server/tree/main/figures/coverage)。
