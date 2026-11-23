---
publish: true
---
_"footsteps in the snow"_

## Intro

[desPas](https://github.com/TheCodedKid/des-pas) is a declarative TidalCycles login sound for NixOS. You define your login sound in Nix and it plays after your desktop loads.

The name comes from Debussy's *Des pas sur la neige* ("footsteps in the snow"), a classical piece I enjoy.

## The cheese

Quick start:

```bash
nix run github:TheCodedKid/des-pas
```

NixOS module:

```nix
# flake.nix
inputs.des-pas.url = "github:TheCodedKid/des-pas";

# configuration
imports = [ des-pas.nixosModules.default ];

services.desPas = {
  enable   = true;
  duration = 4;
  code     = ''
    setcps (1/2)
    d1 $ n "0 4 7 11" # sound "supersaw" # gain 0.7 # release 0.5
  '';
};
```

Requires `services.pipewire.jack.enable = true`.

### Options

| Option | Default | Description |
|---|---|---|
| `code` | — | Inline TidalCycles code (mutually exclusive with `file`) |
| `file` | — | Path to a `.tidal` file |
| `duration` | `4` | How long to play, in seconds |
| `withSamples` | `false` | Load Dirt-Samples (~3 GB) |

## Resources

- [Repo](https://github.com/TheCodedKid/des-pas)
- [TidalCycles](https://tidalcycles.org/)

---
[[main/Code|Code]]
