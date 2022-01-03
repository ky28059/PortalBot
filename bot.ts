import {
    Client, Message, TextChannel, Webhook,
    MessageActionRow, MessageButton, MessageComponentInteraction, CommandInteraction
} from 'discord.js';
import {author, embedMessage} from './messageUtils';
import {token} from './auth';


const prefix = 'portal';

const client = new Client({
    intents: [
        "GUILDS",
        "GUILD_MESSAGES",
        "GUILD_PRESENCES",
        "GUILD_MEMBERS",
        "GUILD_MESSAGE_REACTIONS",
        "GUILD_INTEGRATIONS",
        "GUILD_EMOJIS_AND_STICKERS",
        "GUILD_WEBHOOKS"
    ],
    presence: {activities: [{type: 'WATCHING', name: 'everything'}]},
    allowedMentions: {repliedUser: false}
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.channel.type === 'DM') return;

    if (message.content.substring(0, prefix.length) === prefix) {
        const args = message.content.slice(prefix.length).trim().split(/ +/g); // removes the prefix, then the spaces, then splits into array
        const commandName = args.shift()?.toLowerCase();

        switch (commandName) {
            // portal open [channel]
            case 'open':
                const [target] = args;
                const id = target?.match(/^<#(\d+)>$/)?.[1] ?? target;

                return conductPortal(message, id);

            // portal help
            case 'help':
                await message.channel.send({embeds: [embedMessage(
                    `Use \`${prefix} open [channel]\` to open a portal, ` +
                    `\`${prefix} info\` while a portal is open to see the destination, ` +
                    `and \`${prefix} help\` to display this message.`
                )]});
                return;
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        // /open [channel]
        case 'open':
            const channel = interaction.options.getChannel('channel')!;
            return conductPortal(interaction, channel.id);

        // /open-with-id [id]
        // Ideally this wouldn't be needed and could just be merged with /open like the text based version does, but
        // Discord's slash command API restricts channel options to only within the current server; cross server portals
        // *must* use id.
        case 'open-with-id':
            const id = interaction.options.getString('id')!;
            return conductPortal(interaction, id);

        // /help
        case 'help':
            return interaction.reply({embeds: [embedMessage(
                    `Use \`${prefix} open [channel]\` to open a portal, ` +
                    `\`${prefix} info\` while a portal is open to see the destination, ` +
                    `and \`${prefix} help\` to display this message.`
                )]});
    }
});

// Conducts a portal from a target Message or CommandInteraction to the specified channel id!
async function conductPortal(message: Message | CommandInteraction, id: string) {
    if (!message.channel) return;
    if (!(message.channel instanceof TextChannel)) return;

    console.log(`Mediating portal from ${message.channel.id} to ${id}`);

    // Infinite loop check
    if (id === message.channel.id) {
        await message.reply({embeds: [embedMessage(
                'You are about to open the portal when you realize that your destination is the exact location where ' +
                'you are standing right now! *What a silly mistake,* you think to yourself, *I\'ll make sure it never happens again.*'
            )]});
        return;
    }

    const channel = client.channels.cache.get(id);

    // Channel validity check
    if (!channel) {
        await message.reply({embeds: [embedMessage(
                'You flip through the *Compendium Of All Teleportable And Magic Wielding Dimensions* and ' +
                'can’t seem to find your desired destination listed anywhere. The *Compendium* is an old and trusted tome, ' +
                'constantly fact checked and added to by dedicated teams of adventurers and reviewers, so its ' +
                'contents are most likely reliable; though, if it is truly incorrect in missing your destination, ' +
                'perhaps you could lend the writers a hand and [expand it](https://discord.com/oauth2/authorize?client_id=827738852902043698&scope=bot&permissions=8)?'
            )]});
        return;
    }

    // Channel type check
    if (!(channel instanceof TextChannel)) {
        await message.reply({embeds: [embedMessage(
                'Your portal opens, but instantly combusts in a fiery show of sparks — ' +
                'it seems that your destination is incompatible with or otherwise unsuitable for ' +
                'message based communication.'
            )]});
        return;
    }

    const member = channel.guild.members.cache.get(author(message).id);

    // Channel perms check
    // If the portal opener is in the destination server, check if they can view or send messages in the target channel
    // Otherwise, check the channels permissions for @everyone to determine whether the channel is "public"
    if ((member && (!channel.permissionsFor(member)?.has('VIEW_CHANNEL')
            || !channel.permissionsFor(member)?.has('SEND_MESSAGES')))
        || (!member && (!channel.permissionsFor('everyone')?.has('VIEW_CHANNEL')
            || !channel.permissionsFor('everyone')?.has('SEND_MESSAGES')))) {
        await message.reply({embeds: [embedMessage(
                'Your portal opens, but instantly fizzes out — it seems that your destination is protected ' +
                'by powerful wards and anti-magic spells. Whoever resides there must want to keep its contents a secret.'
            )]});
        return;
    }

    // Current channel client perms check
    // VIEW and SEND can be omitted here as in order to see the message VIEW must be true and SEND is already checked for
    let currentChannelPerms = message.channel.permissionsFor(message.channel.guild.me!);
    if (!currentChannelPerms?.has('MANAGE_WEBHOOKS')) {
        await message.reply({embeds: [embedMessage(
                'Your portal opens, but instantly fizzes out — it seems the hold of magic in your current location are yet too weak ' +
                'for portalling. __'
            )]});
        return;
    }

    // Target channel client perms check
    let targetChannelPerms = channel.permissionsFor(channel.guild.me!);
    if (!targetChannelPerms?.has('VIEW_CHANNEL')
        || !targetChannelPerms?.has('SEND_MESSAGES')
        || !targetChannelPerms?.has('MANAGE_WEBHOOKS')) {
        await message.reply({embeds: [embedMessage(
                'Your portal opens, but instantly fizzes out — it seems the hold of magic in your destination is yet too weak ' +
                'for portalling. __'
            )]});
        return;
    }

    // Slowmode check
    // If rate limit is greater than 5 seconds, prevent portals
    if (channel.rateLimitPerUser > 5) {
        await message.reply({embeds: [embedMessage(
                'Your portal opens, but a giant blast of cold mist closes it immediately. ' +
                'It seems your destination\'s climate is too [frigid](https://support.discord.com/hc/en-us/articles/360016150952-Slowmode-Slllooowwwiiinng-down-your-channel) ' +
                'to support a live connection.'
            )]});
        return;
    }

    // Open portal!

    // Buttons!
    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('accept')
                .setLabel('Yes!')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('decline')
                .setLabel('No!')
                .setStyle('DANGER'),
        );

    const fromMessage = await message.reply({embeds: [embedMessage(
            'Raising your arms, you summon a mighty rift through time and space and materialize a portal before you. ' +
            'Before your portal can be effective though, the residents of your destination must grant you access to their lands.'
        )], fetchReply: true});
    const destMessage = await channel.send({embeds: [embedMessage(
            `You hear a loud crackling sound and see sparks fly out in a cone in front of you — ` +
            `it appears someone is trying to open a portal to your location! The insignia on their runestones ` +
            `seems to indicate they hail from **${message.channel.name}` +
            `${channel.guild.id !== message.guild?.id ? `, from the faraway lands of ${message.guild?.name}` : ''}.** ` +
            `Do you accept their intrusion and grant permission for their portal?` // fix
        )], components: [row]});

    if (!(fromMessage instanceof Message)) return;

    const buttonFilter = (interaction: MessageComponentInteraction) =>
        ['accept', 'decline'].includes(interaction.customId) /* && interaction.user.id !== message.author.id; */

    // Await response
    try {
        const result = await destMessage.awaitMessageComponent({filter: buttonFilter, time: 20000 });

        switch (result.customId) {
            case 'accept': // If they accept the portal
                await destMessage.edit({embeds: [embedMessage(
                        'You lift your hands and the portal opens in a blaze of glory. ' +
                        'Your two realms are now linked, if only temporarily.'
                    )], components: []});
                await fromMessage.edit({embeds: [embedMessage(
                        'Your portal unfurls into an array of dazzling colors. Your two realms are now linked, ' +
                        'if only temporarily.'
                    )]});
                break;
            case 'decline': // If they reject the portal
                await destMessage.edit({embeds: [embedMessage(
                        'You lift your hands and dispel the portal, shattering it into a spray of particles. ' +
                        '__' // finish
                    )], components: []});
                await fromMessage.edit({embeds: [embedMessage(
                        'Your portal shatters into a spray of particles, dispelled by the denizens beyond it. ' +
                        'It seems your intrusion was not welcomed __.'
                    )]});
                return;
        }
    } catch {
        // If the exchange timed out
        await destMessage.edit({embeds: [embedMessage(
                'It appears the portal opener caught you in a bad time, and no one was around to mediate the connection. ' +
                'The portal shimmers and fades away.'
            )], components: []});
        await fromMessage.edit({embeds: [embedMessage(
                'It appears no one was around to mediate your connection. ' +
                'Your portal shimmers and fades away.'
            )]});
        return;
    }

    // If command hasn't returned yet, both parties have reciprocated the portal exchange
    // Commence webhooks!

    const fromWebhook = await fetchPortalWebhook(message.channel);
    const destWebhook = await fetchPortalWebhook(channel);

    // Filter out webhook messages to prevent infinite loop
    const messageFilter = (m: Message) => m.webhookId === null && m.author.id !== client.user?.id;
    // Time the portal remains open, in ms
    const portalOpenLength = 90000;

    const fromCollector = message.channel.createMessageCollector({filter: messageFilter, time: portalOpenLength});
    const toCollector = channel.createMessageCollector({filter: messageFilter, time: portalOpenLength});

    fromCollector.on('collect',
        async (m: Message) => handlePortalMessage(m, destWebhook, channel));
    toCollector.on('collect',
        async (m: Message) => handlePortalMessage(m, fromWebhook, message.channel as TextChannel));

    // When the portal closes
    fromCollector.on('end', async () => {
        await message.channel!.send({embeds: [embedMessage(
                'Your portal wanes in power and then dispels. __'
            )]});
        await channel.send({embeds: [embedMessage(
                'The portal wanes in power and then dispels. __'
            )]});
    });
}

// Finds or creates a PortalBot webhook in a channel
async function fetchPortalWebhook(channel: TextChannel) {
    return (await channel.fetchWebhooks()).find(value => value.name === 'Portal')
        ?? await channel.createWebhook('Portal');
}

// Handles an incoming portal message
async function handlePortalMessage(m: Message, dest: Webhook, linkedTo: TextChannel) {
    // Catch fallthrough empty messages
    if (!m.content && !(m.attachments.size || m.embeds.length)) return;
    else if (m.content === `${prefix} info`)
        await m.reply({embeds: [embedMessage(`Connected to **${linkedTo.name}** in **${linkedTo.guild.name}**`)]});
    else await dest.send(
        {
            content: m.content ? m.content : null,
            username: m.author.username,
            avatarURL: m.author.displayAvatarURL({format: 'png', /* dynamic: true */}),
            stickers: [...m.stickers.values()], // Seems like stickers aren't fully functional yet, as PortalBot does not send them properly
            files: [...m.attachments.values()],
            embeds: m.embeds,
            allowedMentions: {parse: []}
        });
}

// Error handling
client.on('warn', info => console.log(info));
client.on('error', error => console.error(error));

client.login(token);
