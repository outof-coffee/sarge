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
  - Current version: 0.0.1 (pre-release)
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

Note: Node.js version is pinned via `.nvmrc` (version 22.17.0).

## Architecture

### Dependencies

- **@outof-coffee/cordex** (^0.0.4) - Core data management library providing:
  - Type-safe repository pattern with lowdb (JSON file storage)
  - Entity Registry system for organizing data by guild/user/custom keys
  - Pre-built Discord entity types (GuildConfig, GuildUser, etc.)
  - Write batching and query API
  - Discord ID validation utilities

- **discord.js** (^14.24.0) - Discord API library providing:
  - Discord bot client and gateway connections
  - Slash command builders and interaction handling
  - Event handling for Discord gateway events
  - Rich embed builders and message formatting

- **dotenv** (^17.2.3) - Environment variable management:
  - Loads `.env` file into `process.env`
  - Manages bot credentials and configuration

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
│   ├── guild-info.ts     # GuildInfo entity + guild flag logic
│   └── guild-sarge-config.ts  # GuildSargeConfig entity + authorization
├── commands/
│   ├── manage.ts         # Guild management command handler
│   └── sarge.ts          # Sarge configuration command handler
└── utilities/
    ├── embed-renderer.ts      # Discord embed helpers and Embeddable interface
    ├── string-templating.ts   # Template string rendering with theme support
    └── theme/
        └── base-theme.ts      # Default theme values for string templates
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
- **GuildInfo** ([entities/guild-info.ts](src/entities/guild-info.ts)): Tracks guild state with flag system (Green/Yellow/Red) based on member count and activity. App-scoped entity implementing `IdentifiedEntity` and `Embeddable`.
  - Implements `toEmbed()` for Discord embed generation with color-coded flags
  - Includes helper functions: `getGuildFlagEmoji()`, `calculateGuildFlag()`
- **GuildSargeConfig** ([entities/guild-sarge-config.ts](src/entities/guild-sarge-config.ts)): Stores per-guild Sarge configuration including server owner (user or role-based). Guild-scoped entity implementing `IdentifiedEntity` and `Embeddable`.
  - Supports both User and Role-based ownership via `GuildOwnerType` enum
  - Implements authorization checking with `isUserAuthorized()` static method
  - Discord server owners automatically have access regardless of Sarge config
  - Includes display helpers for resolving user/role names (`resolveUserDisplay`, `resolveRoleDisplay`)
  - Implements `Embeddable` interface for Discord embed rendering via `toEmbed()`

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
- **/sarge** ([commands/sarge.ts](src/commands/sarge.ts)): Guild configuration command with subcommands:
  - `/sarge show`: Display current Sarge configuration for the server (ephemeral)
    - Creates default config on first run if none exists
    - Checks authorization before showing (requires server owner or configured Sarge owner)
    - Returns embed with server name and owner info
  - `/sarge set-owner`: Update server owner (user or role-based)
    - Validates exactly one option provided (user XOR role)
    - Prevents bots from being set as owners
    - Validates membership/role existence in the guild
    - Uses `repository.storeUnique()` to prevent duplicates
  - Registers to management guild during development (will be global later)
  - Automatically creates/validates configs on `ClientReady` and `GuildCreate` events
  - Deletes configs on `GuildDelete` event (cleanup when bot leaves guild)

**Infrastructure:**
- Bot initialization with required environment variables (see Environment Variables below)
- Discord.js client with 14 gateway intents (guilds, members, messages, reactions, DMs, message content, scheduled events, polls, etc.)
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

### String Templating System

The bot includes a lightweight string templating system for consistent messaging with theme support.

**Key Features** (see [utilities/string-templating.ts](src/utilities/string-templating.ts)):
- Template syntax: `{{variable-name}}` replaced with theme values
- Theme support with `TemplateTheme` class
- Random selection from arrays (e.g., multiple greeting variations)
- Override mechanism via `withOverride()` for custom themes
- Regex pattern: `/\{\{([a-zA-Z0-9-]+)\}\}/g`
- Missing variables resolve to empty string

**Base Theme** ([utilities/theme/base-theme.ts](src/utilities/theme/base-theme.ts)):
Provides standard message templates via `BaseThemeKeys` enum:
- **Arrays with variations**: `greeting`, `goodbye`, `dismissal` (multiple options, randomly selected)
- **Single values**: `placeholder`, `error`, `success`, `invalid-input`, `unknown`, `guild-only`, `not-found`, `sorry`, `acknowledged`

**Usage Example**:
```typescript
import { renderTemplate } from './utilities/string-templating.js';
import { BaseTheme } from './utilities/theme/base-theme.js';

// Simple replacement with default theme
const message = renderTemplate('{{greeting}}, user!');
// Returns: "Hello, user!" (randomly selected from greeting array)

// With custom theme override
const customTheme = BaseTheme.withOverride({ greeting: 'Howdy' });
const message = renderTemplate('{{greeting}}, partner!', customTheme);
// Returns: "Howdy, partner!"

// Multiple placeholders
const error = renderTemplate('{{error}}: {{invalid-input}}');
// Returns: "Error: Invalid input"
```

**Implementation Details**:
- `TemplateTheme` class with index signature `[key: string]: string | string[]`
- Arrays are normalized by `pickRandomString()` helper (random selection)
- Used throughout commands for consistent, varied messaging
- Users can create custom themes with `.withOverride({ key: value })` for context-specific messages

### Embed Rendering Utilities

Reusable helpers for Discord embed creation and manipulation (see [utilities/embed-renderer.ts](src/utilities/embed-renderer.ts)).

**Embeddable Interface**:
```typescript
export interface Embeddable {
    toEmbed(...args: any[]): Promise<EmbedBuilder>;
}
```
Entities can implement this interface to generate their own Discord embeds. Used by `GuildInfo` and `GuildSargeConfig`.

**Helper Functions**:
- `applyEmbedToReply(reply, embed)`: Adds embed to `InteractionReplyOptions`
- `truncateField(value, maxLength=1024)`: Truncates field values with ellipsis for Discord limits
- `truncateTitle(title)`: Truncates to 256 characters
- `truncateDescription(description)`: Truncates to 4096 characters
- `formatFieldValue(value, placeholder='N/A')`: Formats nullable fields with placeholder

**Usage Example**:
```typescript
import { Embeddable, applyEmbedToReply, formatFieldValue } from './utilities/embed-renderer.js';

// Entity implementing Embeddable
class MyEntity implements Embeddable {
  async toEmbed(): Promise<EmbedBuilder> {
    return new EmbedBuilder()
      .setTitle(truncateTitle(this.name))
      .addFields({
        name: 'Status',
        value: formatFieldValue(this.status)
      });
  }
}

// Apply to interaction reply
const embed = await entity.toEmbed();
const reply = applyEmbedToReply(
  { flags: MessageFlags.Ephemeral },
  embed
);
await interaction.reply(reply);
```

### Cordex Integration

**Current Implementation** (see [bot.ts](src/bot.ts)):
```typescript
import { EntityRegistry, repository } from '@outof-coffee/cordex';
import { BotConfig } from './config/bot-config.js';
import { GuildInfo } from './entities/guild-info.js';
import { GuildSargeConfig } from './entities/guild-sarge-config.js';

const registry = new EntityRegistry();
registry.register(BotConfig, () => 'app');
registry.register(GuildInfo, () => 'app');
registry.register(GuildSargeConfig, (entity) => entity.guildId);

await repository.initialize({
  databasePath: process.env.DATABASE_PATH || './data/bot-database.json',
  entityRegistry: registry
});
```

**Entity Organization Patterns:**
- **Guild-scoped**: `(entity) => entity.guildId` (for per-guild settings like channel/role configs)
  - Used by GuildSargeConfig (per-guild Sarge configuration)
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

export class GuildInfo extends DatabaseEntity implements IdentifiedEntity, Embeddable {
  static readonly storageKey = 'guild-registry';

  readonly id: string;
  readonly guildId: string;
  readonly guildName: string;
  readonly joinedAt: Date;
  readonly lastSeen: Date;
  readonly memberCount: number;
  readonly ownerId: string;
  readonly flag: GuildFlag;

  constructor(
    guildId: string,
    guildName: string,
    joinedAt: Date,
    lastSeen: Date,
    memberCount: number,
    ownerId: string,
    flag: GuildFlag = GuildFlag.Green
  ) {
    super();
    this.id = "guild-" + guildId;
    this.guildId = guildId;
    this.guildName = guildName;
    this.joinedAt = joinedAt;
    this.lastSeen = lastSeen;
    this.memberCount = memberCount;
    this.ownerId = ownerId;
    this.flag = flag;
  }

  async toEmbed(): Promise<EmbedBuilder> {
    // ... embed implementation
  }
}

// Storage: repository.storeUnique(guildInfo)
// Query: repository.query(GuildInfo, 'app', { filter: (g) => g.guildId === id })
// Retrieval: repository.getAll(GuildInfo, 'app')
```

**Entity Implementation Guidelines:**
- Extend `DatabaseEntity` for basic entities
- Implement `IdentifiedEntity` for entities with unique IDs (adds `id` property)
- Implement `Purgeable` for time-based cleanup
- Always define `static readonly storageKey`

**Repository Operations**:
```typescript
// Store entity (may create duplicates if called multiple times)
await repository.store(entity);

// Store unique entity (prevents duplicates by id - recommended for IdentifiedEntity)
await repository.storeUnique(entity);

// Query with filter
const result = await repository.query(EntityClass, scopeKey, {
  filter: (e) => e.someField === value,
  limit: 1
});
const entity = result.entities[0];

// Get all entities in scope
const entities = await repository.getAll(EntityClass, scopeKey);

// Delete unique entity by id
await repository.deleteUnique(EntityClass, scopeKey, entityId);
```

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
