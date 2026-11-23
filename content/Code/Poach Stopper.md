---
publish: true
status: finished
description: Inline soft-start / relay protection for MIT Mini Cheetah motor controllers
tags:
  - pcb
  - robotics
repo: 'https://github.com/TheCodedKid/poachstopper'
---
_"cause it's a cheetah"_

## Intro

[Poach Stopper](https://github.com/TheCodedKid/poachstopper) is an inline soft-start / relay protection circuit for MIT Mini Cheetah motor controllers.

Cheap Mini Cheetah clones have undersized input caps and no inrush limiting. Hot-plug a charged battery and the current spike into the FETs kills the caps — dead cheetah. Poach Stopper splices inline on the battery lead, pre-charges through a resistor, then hands over full current. No MCU, no firmware, no buttons.

## The cheese

| Block | Parts | Job |
|---|---|---|
| Soft-start bypass | G2RL-1A relay + R3 (10 Ω 5 W) | limits inrush; relay shorts it once charged |
| Delay timer | NE555 monostable | ~0.24 s pre-charge before handover |
| 5 V rail | LMR16006 buck, 24 V → 5 V | powers the 555 + relay coil off the pack |
| Protection | Blade fuse F1, 1N4007 flyback D3 | fault current + coil kickback |

Delay is ~`0.24 s`. It's a safety number — the knockoff motor's cap bank size is basically undocumented, so the real value is a guess. A quarter second should be plenty.

## Resources

- [Repo](https://github.com/TheCodedKid/poachstopper)
- [MIT Mini Cheetah](https://github.com/mit-biomimetics/Cheetah-Software)

---
[[main/Code|Code]]
