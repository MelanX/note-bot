import {
    Client as DiscordClient,
    DMChannel, EmbedBuilder,
    GatewayIntentBits,
    Message,
    MessageReaction,
    Partials,
    User
} from "discord.js";
import {approve, waitingForApproval} from "./utils";

export let discord: DiscordClient;
let dmChannel: DMChannel;

export async function registerDiscord() {
    if (process.env.DISCORD === undefined) {
        throw new Error("No discord token provided");
    }

    const client = new DiscordClient({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildEmojisAndStickers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.DirectMessageTyping
        ],
        partials: [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction]
    });
    client.once('ready', async () => {
        console.log("Discord is ready");
    });
    await client.login(process.env.DISCORD);
    client.user?.setStatus('dnd');
    console.log("Connected to discord");

    discord = client;
    dmChannel = await discord.channels.fetch('1183827465102163968') as DMChannel;

    discord.on('messageReactionAdd', async (reaction: MessageReaction, user: User) => {
        if (user.bot) {
            return;
        }

        approve(reaction.message.id, reaction.emoji.name);
    });

    discord.on('messageCreate', async (message: Message) => {
        if (message.author !== discord.user && message.content === '!clear') {
            let dm: DMChannel = await discord.channels.fetch('1183827465102163968') as DMChannel;
            dm.messages.fetch().then((results) => {
                const botMessages = results.filter(msg => msg.author.bot);
                botMessages.forEach(msg => {
                    dm.messages.delete(msg.id);
                })
            })
        }
    });
}

export async function sendMessage(uuid: string, user: string, userId: number, note: string, timestamp: Date) {
    let embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(note)
        .setDescription(`By ${user} (${userId})\nID ${uuid}`)
        .setTimestamp(timestamp);
    const msg = await dmChannel.send({embeds: [embed]});
    await msg.react('✅');
    await msg.react('❌');

    waitingForApproval(msg.id, uuid);
}

export async function checkMessage(msgId: string) {
    const msg = await dmChannel.messages.fetch(msgId);
    const checkmark = msg.reactions.cache.get('✅');
    const x = msg.reactions.cache.get('❌');
    if (checkmark.count > x.count) {
        approve(msgId, '✅');
    } else if (x.count > checkmark.count) {
        approve(msgId, '❌');
    }
}