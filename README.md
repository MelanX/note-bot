# Note Bot

This is mainly a Twitch Bot to note certain messages in a Twitch channel. It detects the messages, writes them down,
and sends them for approval in Discord to a defined user.

## How to use
1. Clone the repository
2. Create the `twitch.env` file (see below)
3. Execute `start.sh`

## `twitch.env`

```env
TWITCH_CLIENT_ID=<client id of twitch token>
TWITCH_TOKEN=<token of twitch bot>
BOT_NAME=<twitch bot name>
CHANNEL=<twitch listening channel name>
DISCORD=<discord bot token>
DM_CHANNEL_ID=<the dm channel id of you and the bot>
```
