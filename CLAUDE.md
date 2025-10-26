# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sarge is a Discord bot for managing MMO guild/tribe/corporation members. The project uses TypeScript with ES modules and depends on the `@outof-coffee/cordex` library for data management.

## Development Guidelines

### Scope Control
- **CRITICAL**: Only create or change what is explicitly requested or planned
- If a planned change isn't working, STOP immediately
- Create a new plan and seek approval before proceeding
- Do not attempt to "fix" or expand scope without user approval

### Package Management
- **ALWAYS** use npm commands to modify dependencies:
  ```bash
  npm add <package> --save    # Add dependency (updates package.json)
  npm install                 # Install after adding (runs pre-install hooks)
  ```
- The sequence matters: `npm add` first (to catch warnings), then `npm install`
- **EXCEPTIONS** for manual package.json edits:
  - Metadata fields (description, keywords, tags)
  - Script commands (e.g., test framework changes, adding new scripts)

### Code Style
- **Commits**: Clean and concise - avoid gigantic commits
- **Comments**: Clean and concise - align with commit style
- **Backwards Compatibility**:
  - Pre-0.1.0: No backwards compatibility required
  - Post-0.1.0: Maintain compatibility within minor version (0.1.x)
  - Breaking changes require next minor version (0.2.0, 0.3.0, etc.)
  - Current branch: `development` targeting 0.1.0 release
- **Temporal Markers**:
  - NEVER use "new" in comments or naming conventions
  - Avoid any temporal markers indicating when something was added

## Development Commands

**Build & Run:**
```bash
npm run build         # Compile TypeScript to dist/
npm run serve         # Build and run the bot
```

**Testing:**
```bash
npm test              # Run all tests with Vitest
```

**Package Management:**
```bash
npm install           # Install dependencies
```

**Versioning:**
```bash
npm version [patch|minor|major]  # Auto-updates src/version.ts
```

Note: Node.js version is pinned via `.nvmrc` (version 22).

## Architecture

### Dependencies

- **@outof-coffee/cordex** - Core data management library providing:
  - Type-safe repository pattern with lowdb (JSON file storage)
  - Entity Registry system for organizing data by guild/user/custom keys
  - Pre-built Discord entity types (GuildConfig, GuildUser, etc.)
  - Write batching and query API
  - Discord ID validation utilities

### Project Structure

```
src/
├── index.ts              # Entry point - initializes and runs bot
├── bot.ts                # Main Bot class - core orchestration
├── version.ts            # Auto-generated version constant
├── command-handler.ts    # Command interface definition
├── event-manager.ts      # Event management singleton
├── config/
│   └── bot-config.ts     # BotConfig entity for storing bot metadata
├── entities/
│   └── guild-info.ts     # GuildInfo entity + guild flag logic
└── commands/
    └── manage.ts         # Guild management command handler
```

**Key Components:**
- **Bot class** ([bot.ts](src/bot.ts)): Central orchestrator handling Discord.js client, Cordex initialization, and lifecycle management
- **EventManager** ([event-manager.ts](src/event-manager.ts)): Singleton pattern for managing Discord events with strongly-typed handlers
- **CommandHandler** ([command-handler.ts](src/command-handler.ts)): Flexible interface for slash commands:
  - Required: `data` (SlashCommandBuilder) and `execute()` method
  - Optional: `registerCommandEvents()` for custom event registration (modals, buttons, etc.)
  - Default behavior: Registers InteractionCreate handler if `registerCommandEvents()` not provided
- Source files are in TypeScript (`.ts`)
- ES modules configured (`type: "module"`)
- Database stored in `data/` directory (gitignored)
- Build output in `dist/` directory (gitignored)

### Current Implementation

**Entities:**
- **BotConfig** ([config/bot-config.ts](src/config/bot-config.ts)): Stores bot metadata (version). App-scoped entity.
- **GuildInfo** ([entities/guild-info.ts](src/entities/guild-info.ts)): Tracks guild state with flag system (Green/Yellow/Red) based on member count and activity. App-scoped entity implementing `IdentifiedEntity`.

**Guild Flag System:**
- **Green** (safe): Default for guilds under 99 members
- **Yellow** (caution): 99+ members, 10-20% member count change, or degraded Red flags after 30 days
- **Red** (high-risk): 1000+ members on join or 20%+ member spike; degrades to Yellow after 30 days

**Commands:**
- **/manage** ([commands/manage.ts](src/commands/manage.ts)): Guild management command that:
  - Registers on startup to management guild only
  - Updates GuildInfo records for all joined guilds
  - Calculates initial guild flags based on member count
  - Returns ephemeral response with management guild info

**Infrastructure:**
- Bot initialization with required environment variables (see Environment Variables below)
- Discord.js client with 13 gateway intents (guilds, members, messages, reactions, DMs, etc.)
- Event-driven architecture via EventManager singleton
- Command framework supporting custom event registration

### Command Handler Pattern

Commands implement the `CommandHandler` interface, which provides flexibility for both simple and complex interactions:

**Simple Command** (default behavior):
```typescript
export class SimpleCommand implements CommandHandler {
  data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');

  async execute(interaction: CommandInteraction) {
    await interaction.reply('Pong!');
  }
  // No registerCommandEvents() needed - automatically handles InteractionCreate
}
```

**Complex Command** (custom event registration - see [manage.ts](src/commands/manage.ts)):
```typescript
export class ComplexCommand implements CommandHandler {
  data = new SlashCommandBuilder()
    .setName('example')
    .setDescription('Example with modals/buttons');

  async execute(interaction: CommandInteraction) {
    // Handle command interaction
  }

  registerCommandEvents(eventManager: EventManager) {
    // Register custom handlers for modals, buttons, select menus, etc.
    eventManager.registerHandler({
      event: Events.InteractionCreate,
      handle: async (interaction: Interaction) => {
        if (interaction.isModalSubmit()) {
          // Handle modal submission
        }
        if (interaction.isButton()) {
          // Handle button clicks
        }
        if (interaction.isChatInputCommand() && interaction.commandName === this.data.name) {
          await this.execute(interaction);
        }
      }
    });
  }
}
```

Commands can also implement `EventHandler` interfaces for lifecycle events (e.g., `ClientReady` for startup tasks).

### Global Command Registration (Pre-0.1.0)

**CRITICAL**: During pre-0.1.0 development, commands intended to be global after release must temporarily register only to the management guild for testing.

**Pattern** (see [sarge.ts](src/commands/sarge.ts:92-103)):
```typescript
registerCommandEvents(eventManager: EventManager) {
  eventManager.registerHandler({
    event: Events.ClientReady,
    handle: async (client: Client) => {
      // Temporary: Register to management guild only during development
      try {
        const managementGuild = await client.guilds.fetch(this.managementGuildId);
        await managementGuild.commands.set([this.data.toJSON()]);
        console.log(`Registered commands to guild: ${managementGuild.name}`);
      } catch (error) {
        console.error(`Failed to register commands to guild ${this.managementGuildId}:`, error);
      }

      // TODO: Uncomment for global registration post-0.1.0
      // await client.application?.commands.set([this.data.toJSON()]);

      // ... rest of ClientReady logic
    }
  });
}
```

**Guidelines:**
- Commands must accept `managementGuildId` and `botId` constructor parameters during pre-0.1.0
- Use guild-specific registration (`guild.commands.set()`) instead of global (`client.application?.commands.set()`)
- Include TODO comment marking the global registration code for post-0.1.0
- See [bot.ts:109](src/bot.ts#L109) TODO for future removal of these temporary constructor parameters
- Management-only commands (like `/manage`) should remain guild-scoped permanently

### Cordex Integration

**Current Implementation** (see [bot.ts](src/bot.ts)):
```typescript
import { EntityRegistry, repository } from '@outof-coffee/cordex';
import { BotConfig } from './config/bot-config.js';
import { GuildInfo } from './entities/guild-info.js';

const registry = new EntityRegistry();
registry.register(BotConfig, () => 'app');
registry.register(GuildInfo, () => 'app');

await repository.initialize({
  databasePath: process.env.DATABASE_PATH || './data/bot-database.json',
  entityRegistry: registry
});
```

**Entity Organization Patterns:**
- **Guild-scoped**: `(entity) => entity.guildId` (for per-guild settings like channel/role configs)
- **User-scoped**: `(entity) => entity.userId` (for cross-guild user data)
- **App-scoped**: `() => 'app'` (for global settings and aggregated data)
  - Used by BotConfig (single instance for bot metadata)
  - Used by GuildInfo (aggregates all guilds in one storage location)

**Available Pre-built Entities:**
- GuildConfig, GuildUser, ChannelConfig, RoleConfig
- TempMute, TempBan, Warning (with auto-purging)
- CommandUsage (for tracking)

**Custom Entity Pattern** (see [guild-info.ts](src/entities/guild-info.ts)):
```typescript
import { DatabaseEntity, IdentifiedEntity } from '@outof-coffee/cordex';

export class GuildInfo extends DatabaseEntity implements IdentifiedEntity {
  static readonly storageKey = 'guild-registry';

  id: string;  // Format: "guild-{guildId}"
  guildId: string;
  // ... other properties

  constructor(data: Partial<GuildInfo>) {
    super();
    this.id = data.id || `guild-${data.guildId}`;
    // ... initialize properties
  }
}

// Storage: repository.store(guildInfo)
// Retrieval: repository.getAll(GuildInfo, 'app')
```

**Entity Implementation Guidelines:**
- Extend `DatabaseEntity` for basic entities
- Implement `IdentifiedEntity` for entities with unique IDs (adds `id` property)
- Implement `Purgeable` for time-based cleanup
- Always define `static readonly storageKey`

## Environment Variables

**Required** (bot will throw errors if missing):
- `DISCORD_TOKEN`: Discord bot authentication token
- `MANAGEMENT_GUILD_ID`: Guild ID where management commands are registered
- `MANAGEMENT_GUILD_ADMIN_USER_ID`: User ID of the management admin
- `BOT_ID`: Discord application/bot ID

**Optional:**
- `DATABASE_PATH`: Custom database file location (default: `./data/bot-database.json`)

Create a `.env` file in the project root with these variables (see [.env.example](.env.example) for template).

## Testing

- Test framework: Vitest 4.0.3
- Tests should be colocated with source files or in a `__tests__` directory
- Use `.test.ts` or `.spec.ts` suffix for test files
