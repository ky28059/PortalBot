import {
    Client, CommandInteraction, Message, MessageActionRow, MessageButton, MessageComponentInteraction,
    TextChannel, Webhook
} from 'discord.js';
import {author, embed, replyEmbed} from './messages';
import {prefix} from '../bot';


// Conducts a portal from a target Message or CommandInteraction to the specified channel id.
export async function conductPortal(client: Client, message: Message | CommandInteraction, id: string) {
    if (!message.channel) return;
    if (!(message.channel instanceof TextChannel)) return;

    console.log(`Mediating portal from ${message.channel.id} to ${id}`);

    // Infinite loop check
    if (id === message.channel.id) return replyEmbed(
        message,
        'You are about to open the portal when you realize that your destination is the exact location where ' +
        'you are standing right now! *What a silly mistake,* you think to yourself, *I\'ll make sure it never happens again.*'
    );

    const channel = client.channels.cache.get(id);

    // Channel validity check
    if (!channel) return replyEmbed(
        message,
        'You flip through the *Compendium Of All Teleportable And Magic Wielding Dimensions* and ' +
        'can’t seem to find your desired destination listed anywhere. The *Compendium* is an old and trusted tome, ' +
        'constantly fact checked and added to by dedicated teams of adventurers and reviewers, so its ' +
        'contents are most likely reliable; though, if it is truly incorrect in missing your destination, ' +
        'perhaps you could lend the writers a hand and [expand it](https://discord.com/oauth2/authorize?client_id=827738852902043698&scope=bot&permissions=8)?'
    );

    // Channel type check
    if (!(channel instanceof TextChannel)) return replyEmbed(
        message,
        'Your portal opens, but instantly combusts in a fiery show of sparks — ' +
        'it seems that your destination is incompatible with or otherwise unsuitable for ' +
        'message based communication.'
    );

    const member = channel.guild.members.cache.get(author(message).id);

    // Channel perms check
    // If the portal opener is in the destination server, check if they can view or send messages in the target channel
    // Otherwise, check the channels permissions for @everyone to determine whether the channel is "public"
    const memberPerms = member && channel.permissionsFor(member);
    const everyonePerms = channel.permissionsFor('everyone');
    if (
        (memberPerms && !(memberPerms.has('VIEW_CHANNEL') && memberPerms.has('SEND_MESSAGES')))
        || (!member && (!everyonePerms?.has('VIEW_CHANNEL') || !everyonePerms?.has('SEND_MESSAGES')))
    ) {
        return replyEmbed(
            message,
            'Your portal opens, but instantly fizzes out — it seems that your destination is protected ' +
            'by powerful wards and anti-magic spells. Whoever resides there must want to keep its contents a secret.'
        );
    }

    // Current channel client perms check
    // VIEW and SEND can be omitted here as in order to see the message VIEW must be true and SEND is already checked for
    const currentChannelPerms = message.channel.permissionsFor(message.channel.guild.me!);
    if (!currentChannelPerms?.has('MANAGE_WEBHOOKS')) return replyEmbed(
        message,
        'Your portal opens, but instantly fizzes out — it seems the hold of magic in your current location are yet too weak ' +
        'for portalling. __'
    );

    // Target channel client perms check
    const targetChannelPerms = channel.permissionsFor(channel.guild.me!);
    if (
        !targetChannelPerms.has('VIEW_CHANNEL')
        || !targetChannelPerms.has('SEND_MESSAGES')
        || !targetChannelPerms.has('MANAGE_WEBHOOKS')
    ) {
        return replyEmbed(
            message,
            'Your portal opens, but instantly fizzes out — it seems the hold of magic in your destination is yet too weak ' +
            'for portalling. __'
        );
    }

    // Slowmode check
    // If rate limit is greater than 5 seconds, prevent portals
    if (channel.rateLimitPerUser > 5) return replyEmbed(
        message,
        'Your portal opens, but a giant blast of cold mist closes it immediately. ' +
        'It seems your destination\'s climate is too [frigid](https://support.discord.com/hc/en-us/articles/360016150952-Slowmode-Slllooowwwiiinng-down-your-channel) ' +
        'to support a live connection.'
    );

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

    const fromMessage = await replyEmbed(
        message,
        'Raising your arms, you summon a mighty rift through time and space and materialize a portal before you. ' +
        'Before your portal can be effective though, the residents of your destination must grant you access to their lands.'
    );
    const destMessage = await channel.send({
        embeds: [embed(
            `You hear a loud crackling sound and see sparks fly out in a cone in front of you — ` +
            `it appears someone is trying to open a portal to your location! The insignia on their runestones ` +
            `seems to indicate they hail from **${message.channel.name}` +
            `${channel.guild.id !== message.guild?.id ? `, from the faraway lands of ${message.guild?.name}` : ''}.** ` +
            `Do you accept their intrusion and grant permission for their portal?` // fix
        )],
        components: [row]
    });

    if (!(fromMessage instanceof Message)) return;

    const buttonFilter = (interaction: MessageComponentInteraction) =>
        ['accept', 'decline'].includes(interaction.customId) /* && interaction.user.id !== message.author.id; */

    // Await response
    try {
        const result = await destMessage.awaitMessageComponent({filter: buttonFilter, time: 20000 });

        switch (result.customId) {
            case 'accept': // If they accept the portal
                await destMessage.edit({
                    embeds: [embed(
                        'You lift your hands and the portal opens in a blaze of glory. ' +
                        'Your two realms are now linked, if only temporarily.'
                    )],
                    components: []
                });
                await fromMessage.edit({embeds: [embed(
                        'Your portal unfurls into an array of dazzling colors. Your two realms are now linked, ' +
                        'if only temporarily.'
                    )]});
                break;
            case 'decline': // If they reject the portal
                await destMessage.edit({
                    embeds: [embed(
                        'You lift your hands and dispel the portal, shattering it into a spray of particles. ' +
                        '__' // finish
                    )],
                    components: []
                });
                await fromMessage.edit({embeds: [embed(
                    'Your portal shatters into a spray of particles, dispelled by the denizens beyond it. ' +
                    'It seems your intrusion was not welcomed __.'
                )]});
                return;
        }
    } catch {
        // If the exchange timed out
        await destMessage.edit({
            embeds: [embed(
                'It appears the portal opener caught you in a bad time, and no one was around to mediate the connection. ' +
                'The portal shimmers and fades away.'
            )],
            components: []
        });
        await fromMessage.edit({embeds: [embed(
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
        await message.channel!.send({embeds: [embed(
            'Your portal wanes in power and then dispels. __'
        )]});
        await channel.send({embeds: [embed(
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
        await replyEmbed(m, `Connected to **${linkedTo.name}** in **${linkedTo.guild.name}**`);
    else await dest.send({
        content: m.content ? m.content : null,
        username: m.author.username,
        avatarURL: m.author.displayAvatarURL({format: 'png', /* dynamic: true */}),
        stickers: [...m.stickers.values()], // Seems like stickers aren't fully functional yet, as PortalBot does not send them properly
        files: [...m.attachments.values()],
        embeds: m.embeds,
        allowedMentions: {parse: []}
    });
}
