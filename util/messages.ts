import {CommandInteraction, Message, EmbedBuilder, MessageOptions} from 'discord.js';


// Replies to a message or interaction.
// TODO: `options.flags` are incompatible between messages and command interactions;
// is there any fix beyond disallowing this property?
export async function reply(target: Message | CommandInteraction, content: string | Omit<MessageOptions, 'flags'>) {
    return target instanceof CommandInteraction
        ? target.reply({...(typeof content === 'string' ? {content} : content), fetchReply: true})
        : target.channel.send(content);
}

// Creates an embed to display a message.
export function embed(desc: string) {
    return new EmbedBuilder()
        .setColor(0xf6b40c)
        .setDescription(desc);
}

// Replies to a message or interaction with the specified message in the form of an embed description.
export function replyEmbed(target: Message | CommandInteraction, desc: string) {
    return reply(target, {embeds: [embed(desc)]});
}

// Returns the author of a message or interaction
export function author(target: Message | CommandInteraction) {
    return target instanceof CommandInteraction ? target.user : target.author;
}
