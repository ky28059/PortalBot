import {CommandInteraction, Message, MessageEmbed} from 'discord.js';


export function embedMessage(desc: string) {
    return new MessageEmbed()
        .setColor(0xf6b40c)
        .setDescription(desc)
}

// Returns the author of a message or interaction
export function author(target: Message | CommandInteraction) {
    return target instanceof CommandInteraction ? target.user : target.author;
}
