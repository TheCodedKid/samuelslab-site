---
publish: true
kind: writeup
---
_So, you want to host minecraft servers, huh?_

## Intro 

I like docker for the most part. I can be a pain, but truthfully, nothing makes me more happy than defined configs that just _work_ after some troubleshooting. Here is the workflow

- add work flow heh

## What you need 

This guide is expecting you know a bit about controlling docker via the CLI, but if not, [here](https://docs.docker.com/get-started/docker_cheatsheet.pdf).

I am using Ubuntu 24.04 inside a Proxmox VM, there is a good set of reasons why I do this, but that is for a different writeup.

- [Docker](https://docs.docker.com/engine/install/ubuntu/)
- Docker Compose via `sudo apt install docker-compose`

## The cheese 

With that being said, let's look at the `docker-compose.yml`:

```yaml
version: '3.8'

services:
  velocity:
    image: itzg/bungeecord:latest
    container_name: velocity-proxy
    environment:
      TYPE: VELOCITY
      MEMORY: 512M
    ports:
      - "10000:25577"
    volumes:
      - ./velocity:/server
    networks:
      - minecraft-network
    restart: unless-stopped

  lobby:
    image: itzg/minecraft-server:latest
    container_name: lobby-server
    environment:
      EULA: "TRUE"
      TYPE: "PAPER"
      PAPER_CHANNEL: "EXPERIMENTAL"
      MEMORY: 4G
      SERVER_NAME: "Lobby Server"
      ONLINE_MODE: "FALSE"
      # Server properties
      MOTD: "Welcome to the Lobby!"
      MAX_PLAYERS: 100
      DIFFICULTY: peaceful
      MODE: adventure
      PVP: "FALSE"
      LEVEL_TYPE: minecraft:flat
      SPAWN_PROTECTION: 0
      ALLOW_FLIGHT: "TRUE"
      # Fix spawn location
      OVERRIDE_SERVER_PROPERTIES: "TRUE"
      # Lobby specific settings
      FORCE_GAMEMODE: "TRUE"
      # Backup configuration
    volumes:
      - ./lobby:/data
    networks:
      - minecraft-network
    restart: unless-stopped

  andrew:
    image: itzg/minecraft-server:latest
    container_name: andrew-server
    environment:
      EULA: "TRUE"
      TYPE: "PAPER"
      PAPER_CHANNEL: "EXPERIMENTAL"
#      USE_AIKAR_FLAGS: "TRUE"
      MEMORY: 8G
      SERVER_NAME: "Andrew Server"
      ONLINE_MODE: "FALSE"
      # Server properties
      MOTD: "Andrew's block guh"
      MAX_PLAYERS: 50
      DIFFICULTY: hard
      MODE: survival
      PVP: "TRUE"
      SPAWN_PROTECTION: 16
      # Backup configuration
      ENABLE_ROLLING_LOGS: "TRUE"
      BACKUP_ENABLED: "TRUE"
      BACKUP_INTERVAL: "2h"
      BACKUP_PRUNE_DAYS: "7"
      BACKUP_DEST_DIR: "/backups"
    volumes:
      - ./andrew:/data
      - ./backups/andrew:/backups
    networks:
      - minecraft-network
    restart: unless-stopped

  josh:
    image: itzg/minecraft-server:latest
    container_name: josh-server
    environment:
      EULA: "TRUE"
      TYPE: "PAPER"
      PAPER_CHANNEL: "EXPERIMENTAL"
#      USE_AIKAR_FLAGS: "TRUE"
      MEMORY: 8G
      SERVER_NAME: "Josh Server"
      ONLINE_MODE: "FALSE"
      # Server properties
      MOTD: "Josh's Server - fart"
      MAX_PLAYERS: 50
      DIFFICULTY: hard
      MODE: survival
      SPAWN_PROTECTION: 0
      # Backup configuration
      ENABLE_ROLLING_LOGS: "TRUE"
      BACKUP_ENABLED: "TRUE"
      BACKUP_INTERVAL: "2h"
      BACKUP_PRUNE_DAYS: "7"
      BACKUP_DEST_DIR: "/backups"
    volumes:
      - ./josh:/data
      - ./backups/josh:/backups
    networks:
      - minecraft-network
    restart: unless-stopped

networks:
  minecraft-network:
    driver: bridge
```

## Configuring a Bit Further 

Because of the change for more agnostic operation for the minecraft docker image used above, there is a few things you need to configure outside of docker compose doing so.

### Velocity 

Inside `velocity/velocity.toml`, copy this:

```toml
# Config version. Do not change this
config-version = "2.7"

# What port should the proxy be bound to? By default, we'll bind to all addresses on port 25577.
bind = "0.0.0.0:25577"

# What should be the MOTD? This gets displayed when the player adds your server to
# their server list. Only MiniMessage format is accepted.
motd = "<#09add3>A Velocity Server"

# What should we display for the maximum number of players? (Velocity does not support a cap
# on the number of players online.)
show-max-players = 100

# Should we authenticate players with Mojang? By default, this is on.
online-mode = true

# Should the proxy enforce the new public key security standard? By default, this is on.
force-key-authentication = true

# If client's ISP/AS sent from this proxy is different from the one from Mojang's
# authentication server, the player is kicked. This disallows some VPN and proxy
# connections but is a weak form of protection.
prevent-client-proxy-connections = false

# Should we forward IP addresses and other data to backend servers?
# Available options:
# - "none":        No forwarding will be done. All players will appear to be connecting
#                  from the proxy and will have offline-mode UUIDs.
# - "legacy":      Forward player IPs and UUIDs in a BungeeCord-compatible format. Use this
#                  if you run servers using Minecraft 1.12 or lower.
# - "bungeeguard": Forward player IPs and UUIDs in a format supported by the BungeeGuard
#                  plugin. Use this if you run servers using Minecraft 1.12 or lower, and are
#                  unable to implement network level firewalling (on a shared host).
# - "modern":      Forward player IPs and UUIDs as part of the login process using
#                  Velocity's native forwarding. Only applicable for Minecraft 1.13 or higher.
player-info-forwarding-mode = "modern"

# If you are using modern or BungeeGuard IP forwarding, configure a file that contains a unique secret here.
# The file is expected to be UTF-8 encoded and not empty.
forwarding-secret-file = "forwarding.secret"

# Announce whether or not your server supports Forge. If you run a modded server, we
# suggest turning this on.
announce-forge = false

# If enabled (default is false) and the proxy is in online mode, Velocity will kick
# any existing player who is online if a duplicate connection attempt is made.
kick-existing-players = false

# Should Velocity pass server list ping requests to a backend server?
# Available options:
# - "disabled":    No pass-through will be done. The velocity configured MOTD, player count, and
#                  player sample will be used.
# - "mods":        Passes only the mod list from your backend server into the response. The first
#                  server in your try list (or forced host) with a mod list will be used. If no
#                  backend servers can be contacted, Velocity won't display any mod information.
# - "description": Uses the description and mod list from the backend server. The first server in
#                  the try list (or forced host) will be used for the description and mod list.
# - "all":         Uses the backend server's response as the proxy response. The Velocity
#                  configuration is used if no servers could be contacted.
ping-passthrough = "disabled"

# If not enabled (default is true) player IP addresses will be replaced by <ip address withheld> in logs
enable-player-address-logging = true

[servers]
# Configure your servers here. Each key represents the server's name, and the value
# represents the IP address of the server to connect to.
lobby = "lobby:25565"
a1 = "andrew:25565"
j1 = "josh:25565"

# In what order we should try servers when a player logs in or is kicked from a server.
try = ["lobby"]

[forced-hosts]
# Configure your forced hosts here.
# "lobby.example.com" = ["lobby"]

[advanced]
# How large a Minecraft packet has to be before we compress it. Setting this to zero will
# compress all packets, and setting it to -1 will disable compression entirely.
compression-threshold = 64

# How much compression should be done (from 0-9). The default is -1, which uses the
# default level of 6.
compression-level = -1

# How fast (in milliseconds) are clients allowed to connect after the last connection? By
# default, this is three seconds. Disable this by setting this to 0.
login-ratelimit = 3000

# Specify a custom timeout for connection timeouts here. The default is five seconds.
connection-timeout = 5000

# Specify a read timeout for connections here. The default is 30 seconds.
read-timeout = 30000

# Enables compatibility with HAProxy's PROXY protocol. If you don't know what this is for, then
# don't enable it.
haproxy-protocol = false

# Enables TCP fast open support on the proxy. Requires the proxy to run on Linux.
tcp-fast-open = false

# Enables BungeeCord plugin messaging channel support on Velocity.
bungee-plugin-message-channel = true

# Shows ping requests to the proxy from clients.
show-ping-requests = false

# By default, Velocity will attempt to gracefully handle situations where the user unexpectedly
# loses connection to the server without an explicit disconnect message by attempting to fall the
# user back, except in the case of read timeouts. BungeeCord will disconnect the user instead. You
# can disable this setting to use the BungeeCord behavior.
failover-on-unexpected-server-disconnect = true

# Declares the proxy commands to 1.13+ clients.
announce-proxy-commands = true

# Enables the logging of commands
log-command-executions = false

# Enables logging of player connections when connecting to the proxy, switching servers
# and disconnecting from the proxy.
log-player-connections = true

[query]
# Whether to enable responding to GameSpy 4 query responses or not.
enabled = false

# If query is enabled, on what port should the query protocol listen on?
port = 25577

# This is the map name that is reported to the query services.
map = "Velocity"

# Whether plugins should be shown in query response by default or not
show-plugins = false
```

### Proxy Info and Key Makin' 

You need to make a key for velocity to sign connections:

```bash
openssl rand -base64 32 > velocity/forwarding.secret
```

then you need to copy:

```bash
cat velocity/forwarding.secret
```

Paper needs further definition for it to use Velocity properly. Since velocity uses key authentication across connections, you need to copy the following into `/theserver/config/paper-global.yml`:

```yaml
proxies:
  velocity:
    enabled: true
    online-mode: true
    secret: 'secret-goes-here-1337'
```

There might be some other stuff in that block regarding bungeecord, leave that as default (this is needed as velocity uses the same service I think, I need to look at this further).

## Plugins!!!!11!!! 

I like to use [AdvancementAnnouncer](https://hangar.papermc.io/AltKat/AdvancementAnnouncer) as it is baller and very easy to use. All the commands can be found on that page as well.

## Resources 

[https://www.reddit.com/r/admincraft/comments/11z52zm/best_proxy_bungeecord_velocity_etc/](https://www.reddit.com/r/admincraft/comments/11z52zm/best_proxy_bungeecord_velocity_etc/)  
[https://docs.papermc.io/velocity/](https://docs.papermc.io/velocity/)  
[https://docker-minecraft-server.readthedocs.io/en/latest/](https://docker-minecraft-server.readthedocs.io/en/latest/)  
[https://github.com/itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup)

[https://prismlauncher.org/](https://prismlauncher.org/) USE PRISM LAUNCHER!

[https://modrinth.com/plugin/passwords?version=1.21.10&loader=paper](https://modrinth.com/plugin/passwords?version=1.21.10&loader=paper)

---
[[main/Writeups|Writeups]]
