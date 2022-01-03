import {SlashCommandBuilder} from '@discordjs/builders';
import {REST} from '@discordjs/rest';
import {ChannelType, Routes} from 'discord-api-types/v9';
import {token} from './auth';


const commands = [
    new SlashCommandBuilder()
        .setName('open')
        .setDescription('Open a portal to another channel!')
        .addChannelOption(option => option
            .setName('channel')
            .setDescription('The channel to portal into!')
            .setRequired(true)
            .addChannelType(ChannelType.GuildText))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('open-with-id')
        .setDescription('Open a portal to another channel with a channel ID!')
        .addStringOption(option => option
            .setName('id')
            .setDescription('The channel id to portal into!')
            .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Sends info about this bot\'s commands.')
        .toJSON()
];

const clientId = '827738852902043698';
const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
