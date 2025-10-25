# Sarge

A Discord bot for managing nerds playing in an MMO guild, tribe, or corporation.

## Running

### Configuration

Copy `.env.example` to `.env` and add your Discord bot token:

```bash
cp .env.example .env
```

Edit `.env` and replace `REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN` with your actual token.

### Without Docker

```bash
npm install
npm run build
node dist/index.js
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
