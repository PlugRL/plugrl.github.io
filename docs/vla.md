# pi0.5 on LIBERO

The home page shows a full-size pi0.5 running across PlugRL's boundary, with
its evaluations matching openpi's. This page is the rest of that record: what
fine-tuning it with reinforcement learning through PlugRL has done so far.
In short, it has not made the policy better.

<div class="cov" data-part="vla" data-src="/media/coverage/coverage.json"></div>

All three clips start from the same scene, the first one the released policy
solves, and the numbers under them come from fifty-episode evaluations. Over
seven such evaluations the released policy scored between 28 and 37. Click a
clip to see the two commands behind it.

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

A run with FPO++'s fine-tuning in full is under way, to check whether what
remains of the collapse is still ours.

The scripts that recorded the clips are in
[figures/coverage](https://github.com/PlugRL/plugrl-server/tree/main/figures/coverage).
