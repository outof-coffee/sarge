import { CacheType, CommandInteraction } from "discord.js";
import { EventManager } from './event-manager.js';
import { EntityRegistry } from "@outof-coffee/cordex";

// CommandHandler interface for types to implement the discord.js command handling structure
export interface CommandHandler<T extends CommandInteraction<CacheType> = CommandInteraction<CacheType>> {
    data: any; // Command data structure, typically a SlashCommandBuilder or similar
    execute: (interaction: T) => Promise<void>; // Execute method to handle the command interaction
    registerCommandEntities?: (registry: EntityRegistry) => void; // Optional method to register any entities related to the command
    registerCommandEvents?: (eventManager: EventManager) => void; // Optional method to register additional command events, will default to data.name and execute if not provided
}