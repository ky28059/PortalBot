import {Client, GuildMember, Message, MessageReaction, TextChannel} from 'discord.js';
import {embedMessage} from './messages';
import {token} from './auth';


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

    const prefix = "portal";
    if (message.content.substring(0, prefix.length) === prefix) {
        const args = message.content.slice(prefix.length).trim().split(/ +/g); // removes the prefix, then the spaces, then splits into array
        const commandName = args.shift()?.toLowerCase();

        // Small bot so no need for scary command abstraction and dynamic imports and typescript pain
        switch (commandName) {
            case 'open':
                let [target] = args;
                let id = target.match(/^<#(\d+)>$/)?.[1] ?? target;

                // Infinite loop check
                if (id === message.channel.id) return message.reply(embedMessage(
                    '__'
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
                if (!member) {
                    // If the portal opener is not in the destination server, check the target's permissions for @everyone
                    // as a way to determine whether the channel is "public"
                    if (!guildChannel.permissionsFor('everyone')?.has('VIEW_CHANNEL')
                        || !guildChannel.permissionsFor('everyone')?.has('SEND_MESSAGES'))
                        return message.reply(embedMessage(
                            'Your portal opens, but instantly fizzes out — it seems that your destination is protected ' +
                            'by powerful wards and anti-magic spells. Whoever resides there must want to keep its contents a secret.'
                        ));
                } else {
                    // Otherwise, check the opener's permissions to see if they can target that channel
                    if (!guildChannel.permissionsFor(member)?.has('VIEW_CHANNEL')
                        || !guildChannel.permissionsFor(member)?.has('SEND_MESSAGES'))
                        return message.reply(embedMessage(
                            'Your portal opens, but instantly fizzes out — it seems that your destination is protected ' +
                            'by powerful wards and anti-magic spells. Whoever resides there must want to keep its contents a secret.'
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
                    `seems to indicate they hail from ${message.channel.name}` +
                    `${guildChannel.guild.id !== message.guild?.id ? `, from the faraway lands of ${message.guild?.name}` : ''}.` +
                    `Do you accept their intrusion and grant permission for their portal?` // fix
                ));

                await destMessage.react('✅');
                await destMessage.react('❎');
                const reactionFilter = (reaction: MessageReaction, member: GuildMember) =>
                    ['✅', '❎'].includes(reaction.emoji.name) && member.id !== message.author.id /*&& !member.user.bot*/;

                // Await response
                const result = await destMessage.awaitReactions(reactionFilter, { max: 1, time: 20000 })

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
                    case '❎': // If they deny the portal
                        await destMessage.edit(embedMessage(
                            'You lift your hands and dispel the portal, shattering it into a spray of particles. ' +
                            '__' // finish
                        ));
                        return fromMessage.edit(embedMessage(
                            '__'
                        ));
                }

                // If command hasn't returned yet, both parties have reciprocated the portal exchange
                // Commence webhooks

                const fromWebhook =
                    (await message.channel.fetchWebhooks()).find(value => value.name === 'Portal')
                    ?? await message.channel.createWebhook('Portal');
                const destWebhook =
                    (await guildChannel.fetchWebhooks()).find(value => value.name === 'Portal')
                    ?? await guildChannel.createWebhook('Portal');

                const messageFilter = (m: Message) => !m.author.bot;
                const fromCollector = message.channel.createMessageCollector(messageFilter, {time: 60000});
                const toCollector = guildChannel.createMessageCollector(messageFilter, {time: 60000});

                fromCollector.on('collect', async (m: Message) => {
                    await destWebhook.send(
                        m.content,
                        {
                            username: m.author.username,
                            avatarURL: m.author.avatarURL() ?? undefined,
                            allowedMentions: {parse: []}
                        });
                });

                toCollector.on('collect', async (m: Message) => {
                    await fromWebhook.send(
                        m.content,
                        {
                            username: m.author.username,
                            avatarURL: m.author.avatarURL() ?? undefined,
                            allowedMentions: {parse: []}
                        });
                });

                // When the portal closes
                fromCollector.on('end', async () => {
                    await message.channel.send(embedMessage(
                        'Your portal wanes in power and then dispels. __'
                    ));
                    await guildChannel.send(embedMessage(
                        'The portal wanes in power and then dispels. __'
                    ));
                })
        }
    }
});

// Error handling
client.on('warn', info => console.log(info));
client.on('error', error => console.error(error));

client.login(token);