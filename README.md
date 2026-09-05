# Discord 50 cmds Bot

Version: 1.3.0

A Discord.js v14 bot with moderation, private tickets, verification, role tools, utility commands, and a persistent XP system.

## Requirements

- Node.js 20 or newer
- A Discord application and bot token obv
- A server where the bot has the required permissions (admin)

## Install

```powershell
npm install
Copy-Item .env.example .env
```

Open `.env` and fill in the values:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=app id
DISCORD_GUILD_ID=your_server_id
WEATHER_API_KEY= optional
XP_PERMS=role_id_allowed_to_manage_xp
STAFF_ROLE=staff_role_id
LOG_CHANNEL=channel_id_for_audit_logs
VOICE_CHANNEL=voice_channel_id_for_presence
XP_PER_MESSAGE=1
XP_COOLDOWN_SECONDS=5
ENABLE_GUILD_MEMBERS_INTENT=false
ENABLE_MESSAGE_CONTENT_INTENT=false
```

`XP_PERMS` controls `xpgive` and `xpset`. `STAFF_ROLE` controls staff-only moderation, ticket controls, `xp`, and `ticket_add`.

`LOG_CHANNEL` receives audit entries for commands, permission denials, tickets, moderation, warnings, timeouts, and XP actions. IDs may be written plainly or surrounded by spaces, quotes, or parentheses.

`XP_PER_MESSAGE` is the amount awarded per eligible message. `XP_COOLDOWN_SECONDS` controls how long a member waits before another message can award XP. Set the amount to `0` to disable message XP. `VOICE_CHANNEL` is optional; when set, the bot joins that voice channel after startup.

Enable `ENABLE_GUILD_MEMBERS_INTENT=true` only if autoroles or member join handling are needed. Enable `ENABLE_MESSAGE_CONTENT_INTENT=true` for prefix commands and passive message XP. Each enabled intent must also be enabled under the bot's Privileged Gateway Intents in the Discord Developer Portal.

## Run

Deploy the global slash commands:

```powershell
npm run deploy
```

Start the bot:

```powershell
npm start
```

Global command changes can take time to appear in every server.

## Main setup commands

- `/ticket-setup` creates the ticket category panel.
- `/verify-setup` creates the verification panel and challenge flow.
- `/autorole-set` configures the role assigned to new members.

Ticket categories are report a member, general help, and other. The configured staff role is mentioned when a ticket opens. Ticket owners cannot write until staff uses `ticket_add userId`.

## XP commands

Slash commands:

- `/xp user`
- `/xpgive user amount`
- `/xpset user amount`
- `/xpleaderboard`
- `/xp-rank user`
- `/stats` shows your XP, level, message count, and voice time.

The XP management commands are restricted to the `XP_PERMS` role at runtime and are omitted from the bot's help output for everyone else. Discord does not allow bots to change role-based command visibility through the application-command permission endpoint; Discord's own command picker may still show the names, but unauthorized users receive no access and cannot run them.

Prefix commands, when Message Content Intent is enabled:

```text
!xp userId
!xpgive userId amount
!xpset userId amount
!xpleaderboard
!xp-rank userId
!ticket_add userId
```

XP is stored in `src/data/store.json`.



Have fun :0

