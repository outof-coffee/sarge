import { CacheType, CommandInteraction } from "discord.js";

// CommandHandler interface for types to implement the discord.js command handling structure
export interface CommandHandler<T extends CommandInteraction<CacheType> = CommandInteraction<CacheType>> {
    data: any; // Command data structure, typically a SlashCommandBuilder or similar
    execute: (interaction: T) => Promise<void>; // Execute method to handle the command interaction
}