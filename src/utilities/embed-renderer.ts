import { EmbedBuilder, InteractionReplyOptions } from 'discord.js';

/**
 * Interface for entities that can be rendered as Discord embeds.
 *
 * Implement this interface to provide a standard way of converting
 * entities to rich embed representations for Discord messages.
 *
 * @example
 * ```typescript
 * class MyEntity implements Embeddable {
 *   async toEmbed(): Promise<EmbedBuilder> {
 *     return new EmbedBuilder()
 *       .setTitle('My Entity')
 *       .setDescription('Entity description')
 *       .setColor(Colors.Blue);
 *   }
 * }
 * ```
 */
export interface Embeddable {
    /**
     * Converts the entity to a Discord embed representation.
     *
     * @param args - Optional arguments that may be needed for rendering
     * @returns A promise that resolves to an EmbedBuilder configured
     *          with the entity's data.
     */
    toEmbed(...args: any[]): Promise<EmbedBuilder>;
}

/**
 * Merges an embed into interaction reply options.
 *
 * This helper function takes existing reply options and adds an embed to them,
 * handling the embeds array properly. If the reply options already contain
 * embeds, the new embed is appended to the array.
 *
 * @param reply - The existing interaction reply options
 * @param embed - The embed to add to the reply
 * @returns Updated reply options with the embed included
 *
 * @example
 * ```typescript
 * const reply: InteractionReplyOptions = {
 *   flags: MessageFlags.Ephemeral
 * };
 * const embed = new EmbedBuilder().setTitle('Hello');
 * const updatedReply = applyEmbedToReply(reply, embed);
 * ```
 */
export function applyEmbedToReply(
    reply: InteractionReplyOptions,
    embed: EmbedBuilder
): InteractionReplyOptions {
    return {
        ...reply,
        embeds: [...(reply.embeds || []), embed]
    };
}

/**
 * Truncates a string to fit within Discord's field value limit.
 *
 * Discord embed fields have a maximum length of 1024 characters.
 * This function ensures text fits within that limit, adding an
 * ellipsis if truncation occurs.
 *
 * @param value - The string value to truncate
 * @param maxLength - Maximum allowed length (default: 1024)
 * @returns Truncated string with ellipsis if needed
 *
 * @example
 * ```typescript
 * const longText = 'a'.repeat(2000);
 * const truncated = truncateField(longText, 1024);
 * // Returns: 'aaa...aaa' (1024 chars including ellipsis)
 * ```
 */
export function truncateField(value: string, maxLength: number = 1024): string {
    if (value.length <= maxLength) {
        return value;
    }
    return value.substring(0, maxLength - 3) + '...';
}

/**
 * Truncates a string to fit within Discord's embed title limit.
 *
 * Discord embed titles have a maximum length of 256 characters.
 * This function ensures titles fit within that limit, adding an
 * ellipsis if truncation occurs.
 *
 * @param title - The title string to truncate
 * @returns Truncated title with ellipsis if needed
 *
 * @example
 * ```typescript
 * const longTitle = 'Very Long Title '.repeat(50);
 * const truncated = truncateTitle(longTitle);
 * ```
 */
export function truncateTitle(title: string): string {
    const maxLength = 256;
    if (title.length <= maxLength) {
        return title;
    }
    return title.substring(0, maxLength - 3) + '...';
}

/**
 * Truncates a string to fit within Discord's embed description limit.
 *
 * Discord embed descriptions have a maximum length of 4096 characters.
 * This function ensures descriptions fit within that limit, adding an
 * ellipsis if truncation occurs.
 *
 * @param description - The description string to truncate
 * @returns Truncated description with ellipsis if needed
 *
 * @example
 * ```typescript
 * const longDesc = 'Content '.repeat(1000);
 * const truncated = truncateDescription(longDesc);
 * ```
 */
export function truncateDescription(description: string): string {
    const maxLength = 4096;
    if (description.length <= maxLength) {
        return description;
    }
    return description.substring(0, maxLength - 3) + '...';
}

/**
 * Safely formats a value for use in embed fields, handling null/undefined.
 *
 * Converts null or undefined values to a placeholder string, and ensures
 * the result is truncated to fit Discord's field value limit.
 *
 * @param value - The value to format (may be null/undefined)
 * @param placeholder - Text to use for null/undefined values (default: 'N/A')
 * @returns Formatted and truncated string safe for embed fields
 *
 * @example
 * ```typescript
 * formatFieldValue(null) // Returns: 'N/A'
 * formatFieldValue('') // Returns: 'N/A'
 * formatFieldValue('value') // Returns: 'value'
 * ```
 */
export function formatFieldValue(value: string | null | undefined, placeholder: string = 'N/A'): string {
    if (!value || value.trim().length === 0) {
        return placeholder;
    }
    return truncateField(value);
}
