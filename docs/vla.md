# pi0.5 on LIBERO

The home page shows a full-size pi0.5 running across PlugRL's boundary, with
its evaluations matching openpi's. This page is the rest of that record: what
fine-tuning it with reinforcement learning through PlugRL has done so far.
In short, it has not made the policy better. The collapses the first runs
showed were defects of ours, and with them fixed FPO leaves the policy about
where it started.

<div class="cov" data-part="vla" data-src="/media/coverage/coverage.json"></div>

All three clips start from the same scene, the first one the released policy
solves, and the numbers under them come from fifty-episode evaluations. Over
seven such evaluations the released policy scored between 28 and 37. Where an
experiment ran two seeds, the clip and the number are the lower-scoring
seed's. Click a clip to see the two commands behind it.

## How it went

The first FPO run took the hardest task from 26 of 50 to 0 of 50 in one
iteration, and could not run a second: the optimizer state the first one
allocates left no room for it on a 24 GB card
([E11](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e11-vla-rl-libero)).

The collapse was a defect of ours. This FPO scored an action chunk by
averaging the error over all 320 of its elements, most of them padding or
steps the client never executed. Scored as FPO++ scores it, over the executed
steps and the dimensions LIBERO uses, one update leaves pi0.5 at 33 of 50
([E32](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e32-pi0-fpo-plus-plus)).
The experiments between the two, E14 to E26, are the search for that cause.

Over more iterations it still fell. Five FPO iterations took it to 5 and 0 of
50 on two seeds, with the rest of our FPO still on its own defaults rather
than FPO++'s. Ten DPPO iterations left it at 20, three standard deviations
below the released policy's mean
([E36](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e36-pi0-longer)).

That fall was ours too. With the rest of FPO++'s fine-tuning in place (its
optimizer, gradient clipping, critic learning rate, raw rewards, lambda and
clip), ten FPO iterations left the same two seeds at 40 and 27 of 50
([E42](https://github.com/PlugRL/plugrl-server/tree/main/experiments/e42-pi0-fpo-plus-plus)).
Neither reaches the bar set before the run, 42 of 50, so this is FPO holding
pi0.5, not improving it. The lower seed, whose clip is above, was drifting
the way E36's runs fell, only far more slowly. Whether it holds past ten
iterations is open.

The scripts that recorded the clips are in
[figures/coverage](https://github.com/PlugRL/plugrl-server/tree/main/figures/coverage).
