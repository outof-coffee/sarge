import { EmbedBuilder, InteractionReplyOptions } from 'discord.js';

export interface Embeddable {
    toEmbed(...args: any[]): Promise<EmbedBuilder>;
}

export function applyEmbedToReply(
    reply: InteractionReplyOptions,
    embed: EmbedBuilder
): InteractionReplyOptions {
    return {
        ...reply,
        embeds: [...(reply.embeds || []), embed]
    };
}

export function truncateField(value: string, maxLength: number = 1024): string {
    if (value.length <= maxLength) {
        return value;
    }
    return value.substring(0, maxLength - 3) + '...';
}

export function truncateTitle(title: string): string {
    const maxLength = 256;
    if (title.length <= maxLength) {
        return title;
    }
    return title.substring(0, maxLength - 3) + '...';
}

export function truncateDescription(description: string): string {
    const maxLength = 4096;
    if (description.length <= maxLength) {
        return description;
    }
    return description.substring(0, maxLength - 3) + '...';
}

export function formatFieldValue(value: string | null | undefined, placeholder: string = 'N/A'): string {
    if (!value || value.trim().length === 0) {
        return placeholder;
    }
    return truncateField(value);
}
