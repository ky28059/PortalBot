import {ActivityType, Client, CommandInteraction, Message} from 'discord.js';
import {conductPortal} from './util/portals';
import {replyEmbed} from './util/messages';
import {token} from './auth';


export const prefix = 'portal';

const client = new Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "GuildPresences",
        "GuildMembers",
        "GuildMessageReactions",
        "GuildIntegrations",
        "GuildEmojisAndStickers",
        "GuildWebhooks",
        "MessageContent"
    ],
    presence: {activities: [{type: ActivityType.Watching, name: 'everything'}]},
    allowedMentions: {repliedUser: false}
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.isDMBased()) return;

    if (message.content.substring(0, prefix.length) === prefix) {
        const args = message.content.slice(prefix.length).trim().split(/ +/g); // removes the prefix, then the spaces, then splits into array
        const commandName = args.shift()?.toLowerCase();

        switch (commandName) {
            // portal open [channel]
            case 'open':
                const [target] = args;
                const id = target?.match(/^<#(\d+)>$/)?.[1] ?? target;
                await conductPortal(client, message, id);
                return;

            // portal help
            case 'help':
                return helpEmbed(message);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        // /open [channel]
        case 'open':
            const channel = interaction.options.getChannel('channel')!;
            await conductPortal(client, interaction, channel.id);
            return;

        // /open-with-id [id]
        // Ideally this wouldn't be needed and could just be merged with /open like the text based version does, but
        // Discord's slash command API restricts channel options to only within the current server; cross server portals
        // *must* use id.
        case 'open-with-id':
            const id = interaction.options.getString('id')!;
            await conductPortal(client, interaction, id);
            return;

        // /help
        case 'help':
            return helpEmbed(interaction);
    }
});

async function helpEmbed(target: Message | CommandInteraction) {
    await replyEmbed(
        target,
        `Use \`${prefix} open [channel]\` to open a portal, ` +
        `\`${prefix} info\` while a portal is open to see the destination, ` +
        `and \`${prefix} help\` to display this message.`
    );
}

// Error handling
client.on('warn', (info) => console.log(info));
client.on('error', (error) => console.error(error));

client.login(token);
