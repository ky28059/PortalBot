import {MessageEmbed} from 'discord.js';

export function embedMessage(desc: string) {
    return new MessageEmbed()
        .setColor(0xf6b40c)
        .setDescription(desc)
}
