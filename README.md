# PortalBot
Bot for cross pollination and epicness.

### What does it do?
PortalBot links two channels together using the power of portals! Use `portal open [channel]` to open a cross-dimensional 
portal, causing messages sent in one channel to be broadcast to the other. Portals can be between any two channels in the
same or even different servers, so long as the ID provided is valid.

![image](https://user-images.githubusercontent.com/60120929/147906789-faaf2d97-a0f5-4a8c-9008-a23ba9cfc877.png)

### Why didn't my portal open?
To ensure PortalBot doesn't crash, PortalBot checks to make sure it has the permissions required to open a portal. PortalBot
disallows a portal if:

- The channel is invalid.
- PortalBot cannot manage webhooks in the current channel.
- PortalBot cannot view, send messages in, or manage webhooks in the target channel.
- The channel is not a text channel.

Beyond that, PortalBot performs a list of checks to try to mitigate portal spam as much as possible. PortalBot disallows 
a portal if:

- The target channel is the same as the current channel.
- The person requesting the portal is a member of the server it is going to and doesn't have access to the target channel.
- The person requesting the portal isn't a member of the server it is going to, and `@everyone` doesn't have access to the target channel.
- The target channel has a slowmode greater than 5s.

And of course, PortalBot asks nicely before opening a portal. If someone clicks decline on the portal embed (or simply 
ignores it), the portal will not open.

### Why?
Because it's fun! Also, it encourages "cross pollination" -- interaction between isolated, established friend groups on 
different servers -- which I consider to be a big upside.

### Where do I sign up?
https://discord.com/oauth2/authorize?client_id=827738852902043698&scope=bot+applications.commands&permissions=8

### Using the PortalBot template
PortalBot is also a template repository for quickly bootstrapping djs13 + TypeScript discord bots. To create your own bot
from this template, replace the commands and client ID in `registerSlashCommands.ts` and create `auth.ts` exporting your 
bot token:
```ts
export const token = 'discord-bot-token';
```
Add your own custom logic to `bot.ts`, register slash commands with `npm run registerSlashCommands`, and run the bot 
with `npm start`! `util` may not be relevant to your bot, so feel free to modify at will.
