import {CommandInteraction, Message, MessageEmbed, MessageOptions} from 'discord.js';


// Replies to a message or interaction.
export async function reply(target: Message | CommandInteraction, content: string | MessageOptions) {
    return target instanceof CommandInteraction
        ? target.reply({...(typeof content === 'string' ? {content} : content), fetchReply: true})
        : target.reply(content);
}

// Creates an embed to display a message.
export function embed(desc: string) {
    return new MessageEmbed()
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
