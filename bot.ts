import {Client, GuildMember, Message, MessageReaction, TextChannel, Webhook} from 'discord.js';
import {embedMessage} from './messages';
import {token} from './auth';
const prefix = 'portal';


const client = new Client({
    ws: {
        intents: [
            "GUILDS",
            "GUILD_MESSAGES",
            "GUILD_PRESENCES",
            "GUILD_MEMBERS",
            "GUILD_MESSAGE_REACTIONS",
            "GUILD_INTEGRATIONS",
        ]
    }
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    await client.user?.setActivity('everything', {type: 'WATCHING'});
});

client.on('message', async message => {
    if (message.author.bot) return;
    if (message.channel.type === 'dm') return;

    if (message.content.substring(0, prefix.length) === prefix) {
        const args = message.content.slice(prefix.length).trim().split(/ +/g); // removes the prefix, then the spaces, then splits into array
        const commandName = args.shift()?.toLowerCase();

        // Small bot so no need for scary command abstraction and dynamic imports and typescript pain
        switch (commandName) {
            case 'open':
                let [target] = args;
                let id = target?.match(/^<#(\d+)>$/)?.[1] ?? target;

                console.log(`Mediating portal from ${message.channel.id} to ${id}`);

                // Infinite loop check
                if (id === message.channel.id) return message.reply(embedMessage(
                    'You are about to open the portal when you realize that your destination is the exact location where ' +
                    'you are standing right now! *What a silly mistake,* you think to yourself, *I\'ll make sure it never happens again.*'
                ));

                let channel = client.channels.cache.get(id);

                // Channel validity check
                if (!channel) return message.reply(embedMessage(
                    'You flip through the *Compendium Of All Teleportable And Magic Wielding Dimensions* and ' +
                    'can’t seem to find your desired destination listed anywhere. The *Compendium* is an old and trusted tome, ' +
                    'constantly fact checked and added to by dedicated teams of adventurers and reviewers, so its ' +
                    'contents are most likely reliable; though, if it is truly incorrect in missing your destination, ' +
                    'perhaps you could lend the writers a hand and [expand it](https://discord.com/oauth2/authorize?client_id=827738852902043698&scope=bot&permissions=8)?'
                ));

                // Channel type check
                if (channel.type !== 'text') return message.reply(embedMessage(
                    'Your portal opens, but instantly combusts in a fiery show of sparks — ' +
                    'it seems that your destination is incompatible with or otherwise unsuitable for ' +
                    'message based communication.'
                ));

                let guildChannel = channel as TextChannel;
                let member = guildChannel.guild.member(message.author);

                // Channel perms check
                // If the portal opener is in the destination server, check if they can view or send messages in the target channel
                // Otherwise, check the channels permissions for @everyone to determine whether the channel is "public"
                if ((member && (!guildChannel.permissionsFor(member)?.has('VIEW_CHANNEL')
                    || !guildChannel.permissionsFor(member)?.has('SEND_MESSAGES')))
                    || (!member && (!guildChannel.permissionsFor('everyone')?.has('VIEW_CHANNEL')
                        || !guildChannel.permissionsFor('everyone')?.has('SEND_MESSAGES')))) {
                    return message.reply(embedMessage(
                        'Your portal opens, but instantly fizzes out — it seems that your destination is protected ' +
                        'by powerful wards and anti-magic spells. Whoever resides there must want to keep its contents a secret.'
                    ));
                }

                // Current channel client perms check
                // VIEW and SEND can be omitted here as in order to see the message VIEW must be true and SEND is already checked for
                let currentChannelPerms = message.channel.permissionsFor(message.channel.guild.me!);
                if (!currentChannelPerms?.has('MANAGE_WEBHOOKS')) {
                    return message.reply(embedMessage(
                        'Your portal opens, but instantly fizzes out — it seems the hold of magic in your current location are yet too weak ' +
                        'for portalling. __'
                    ));
                }

                // Target channel client perms check
                let targetChannelPerms = guildChannel.permissionsFor(guildChannel.guild.me!);
                if (!targetChannelPerms?.has('VIEW_CHANNEL')
                    || !targetChannelPerms?.has('SEND_MESSAGES')
                    || !targetChannelPerms?.has('MANAGE_WEBHOOKS')) {
                    return message.reply(embedMessage(
                        'Your portal opens, but instantly fizzes out — it seems the hold of magic in your destination is yet too weak ' +
                        'for portalling. __'
                    ));
                }

                // Slowmode check
                // If rate limit is greater than 5 seconds, prevent portals
                if (guildChannel.rateLimitPerUser > 5) {
                    return message.reply(embedMessage(
                        'Your portal opens, but a giant blast of cold mist closes it immediately. ' +
                        'It seems your destination\'s climate is too [frigid](https://support.discord.com/hc/en-us/articles/360016150952-Slowmode-Slllooowwwiiinng-down-your-channel) ' +
                        'to support a live connection.'
                    ));
                }

                // Open portal!

                let fromMessage = await message.reply(embedMessage(
                    'Raising your arms, you summon a mighty rift through time and space and materialize a portal before you. ' +
                    'Before your portal can be effective though, the residents of your destination must grant you access to their lands.'
                ));
                let destMessage = await guildChannel.send(embedMessage(
                    `You hear a loud crackling sound and see sparks fly out in a cone in front of you — ` +
                    `it appears someone is trying to open a portal to your location! The insignia on their runestones ` +
                    `seems to indicate they hail from **${message.channel.name}` +
                    `${guildChannel.guild.id !== message.guild?.id ? `, from the faraway lands of ${message.guild?.name}` : ''}.** ` +
                    `Do you accept their intrusion and grant permission for their portal?` // fix
                ));

                await destMessage.react('✅');
                await destMessage.react('❎');
                const reactionFilter = (reaction: MessageReaction, member: GuildMember) =>
                    ['✅', '❎'].includes(reaction.emoji.name) && member.id !== message.author.id /*&& !member.user.bot*/;

                // Await response
                const result = await destMessage.awaitReactions(reactionFilter, { max: 1, time: 20000 })

                await destMessage.reactions.removeAll();
                switch (result.first()?.emoji.name) {
                    case '✅': // If they accept the portal
                        await destMessage.edit(embedMessage(
                            'You lift your hands and the portal opens in a blaze of glory. ' +
                            'Your two realms are now linked, if only temporarily.'
                        ));
                        await fromMessage.edit(embedMessage(
                            'Your portal unfurls into an array of dazzling colors. Your two realms are now linked, ' +
                            'if only temporarily.'
                        ));
                        break;
                    case '❎': // If they reject the portal
                        await destMessage.edit(embedMessage(
                            'You lift your hands and dispel the portal, shattering it into a spray of particles. ' +
                            '__' // finish
                        ));
                        return fromMessage.edit(embedMessage(
                            'Your portal shatters into a spray of particles, dispelled by the denizens beyond it. ' +
                            'It seems your intrusion was not welcomed __.'
                        ));
                    default: // If the exchange timed out
                        await destMessage.edit(embedMessage(
                            'It appears the portal opener caught you in a bad time, and no one was around to mediate the connection. ' +
                            'The portal shimmers and fades away.'
                        ));
                        return fromMessage.edit(embedMessage(
                            'It appears no one was around to mediate your connection. ' +
                            'Your portal shimmers and fades away.'
                        ));
                }

                // If command hasn't returned yet, both parties have reciprocated the portal exchange
                // Commence webhooks!

                const fromWebhook = await fetchPortalWebhook(message.channel as TextChannel);
                const destWebhook = await fetchPortalWebhook(guildChannel);

                // Filter out webhook messages to prevent infinite loop
                const messageFilter = (m: Message) => m.webhookID === null && m.author.id !== client.user?.id;
                // Time the portal remains open, in ms
                const portalOpenLength = 90000;

                const fromCollector = message.channel.createMessageCollector(messageFilter, {time: portalOpenLength});
                const toCollector = guildChannel.createMessageCollector(messageFilter, {time: portalOpenLength});

                fromCollector.on('collect',
                    async (m: Message) => handlePortalMessage(m, destWebhook, guildChannel));
                toCollector.on('collect',
                    async (m: Message) => handlePortalMessage(m, fromWebhook, message.channel as TextChannel));

                // When the portal closes
                fromCollector.on('end', async () => {
                    await message.channel.send(embedMessage(
                        'Your portal wanes in power and then dispels. __'
                    ));
                    await guildChannel.send(embedMessage(
                        'The portal wanes in power and then dispels. __'
                    ));
                });
                break;

            // Help command
            case 'help':
                return message.channel.send(embedMessage(
                    `Use \`${prefix} open [channel]\` to open a portal, ` +
                    `\`${prefix} info\` while a portal is open to see the destination, ` +
                    `and \`${prefix} help\` to display this message.`
                ));
        }
    }
});

// Function to find or create a PortalBot webhook in a channel
async function fetchPortalWebhook(channel: TextChannel) {
    return (await channel.fetchWebhooks()).find(value => value.name === 'Portal')
        ?? await channel.createWebhook('Portal');
}

// Function to handle an incoming portal message
async function handlePortalMessage(m: Message, dest: Webhook, linkedTo: TextChannel) {
    if (m.content === `${prefix} info`)
        await m.reply(embedMessage(`Connected to **${linkedTo.name}** in **${linkedTo.guild.name}**`));
    else await dest.send(
        m.content,
        {
            username: m.author.username,
            avatarURL: m.author.avatarURL() ?? undefined,
            files: m.attachments.array(),
            embeds: m.embeds,
            allowedMentions: {parse: []}
        });
}

// Error handling
client.on('warn', info => console.log(info));
client.on('error', error => console.error(error));

client.login(token);
