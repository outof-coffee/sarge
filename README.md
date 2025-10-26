# Sarge

A Discord bot for managing nerds playing in an MMO guild, tribe, or corporation.

## Features

- Guild monitoring with automatic status flagging (Green/Yellow/Red) based on member count and activity
- Management commands for guild oversight
- Persistent data storage with entity-based architecture

## Requirements

- Node.js v22.17.0 or higher
- Discord bot token ([create one here](https://discord.com/developers/applications))

## Running

### Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

- `DISCORD_TOKEN` - Your bot token from the Discord developer portal
- `MANAGEMENT_GUILD_ID` - Guild ID where management commands will be registered
- `MANAGEMENT_GUILD_ADMIN_USER_ID` - Your user ID (must be a member of the management guild)
- `BOT_ID` - Your bot's application ID from the Discord developer portal
- `DATABASE_PATH` - (Optional) Custom database location (default: `./data/bot-database.json`)

### Without Docker

```bash
npm install
npm run serve
```

### With Docker

Docker and Podman are both supported:

```bash
docker build -t sarge .
docker run --env-file .env -v $(pwd)/data:/app/data sarge
```

Or with Podman:

```bash
podman build -t sarge .
podman run --env-file .env -v $(pwd)/data:/app/data sarge
```

## License

MIT
