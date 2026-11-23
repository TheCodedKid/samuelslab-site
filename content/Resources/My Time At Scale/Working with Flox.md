---
publish: true
---
Thu, March 5th, 2026
11:05


3 Hour Workshop

- You don't want to be the person that your company calls to deal with packages
- hub.flox.dev

## Floxhub
- Main Monitizer
- Login in Floxhub creates a default enviroment, which is via the flox manager itself, which builds the flox enivorment package for all the teams
- `.bashrc` > `eval "$(flox activate -d ~ -m run)"`
- Rok is a home-nix user
- Very intutaive design

## Using dbs
You can add a section in `manifest.toml`:
```toml
[services.redis]
command = 'redis-server --port $REDISPORT'

[vars]
REDISPORT = "6379"

[profile]
common = """
alias load_data = 'redis-cli -p $REDISPORT SET datajson "$(cat quotes.json)"'
"""
```

## Building
```toml
[build.app]
buildsomething big guh

```

then invoke
`flox build`

It does the delta of the one package, instead of docker where "everything below" is redone, this cuts down aws network transfer cost

Creating SBOMs with flox i svery easy
 spdx visualizer for sbom

There are good reasons for people not to learn nix, but why do they have too

