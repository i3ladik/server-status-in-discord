const { Client, ActivityType, OAuth2Scopes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Server } = require('@fabricio-191/valve-server-query');

/**
* Status server class
*/
class StatusServer {
    /**
    * @param {object} serverData - server data
    * @param {object} config - config
    */
    constructor(serverData, config) {
        this.serverData = serverData;
        this.config = config;
        this.server = {};
        this.bot = {};
        this.message = {};
        this.online = 0;
    }

    /**
    * Initializing server
    */
    async init() {
        const { token, host, name } = this.serverData;
        const { channelId, timeout_ms, update_ms, startMsg } = this.config;

        if (token === 'token') return;

        const ip = host.split(':')[0];
        const port = Number(host.split(':')[1]);
        const timeout = Number(timeout_ms);
        this.server = await Server({ ip, port, timeout });

        const client = new Client({ intents: [] });
        await client.login(token);
        client.user.setPresence({ activities: [{ type: ActivityType.Watching, name: startMsg }], status: 'idle' });
        this.bot = client;

        const link = client.generateInvite({ scopes: [OAuth2Scopes.Bot] });
        console.log(`Stats ${name} bot invite link: ${link}`);

        if (channelId !== 'channelId') {
            const { imageUrl, color } = this.config;

            const channel = await client.channels.fetch(channelId).catch(() => {
                throw new Error('I didnt find the channel. Maybe I was not invited to the server or permissions in channel not given');
            });
            let message;

            const servEmbed = new EmbedBuilder().setImage(imageUrl).setColor(color).setDescription('**Temp message. Wait update...**');
            if (this.serverData.messageId !== 'messageId') {
                message = await channel.messages.fetch(this.serverData.messageId).catch(() => { return; });
                if (!message) message = await channel.send({ embeds: [servEmbed] });
            }
            else message = await channel.send({ embeds: [servEmbed] });

            this.message = message;
            this.serverData.messageId = message.id;
        }

        this.update();
        setInterval(() => this.update(), update_ms);

        return this;
    }

    /**
    * Updating server info
    */
    async update() {
        const { maps, statusMsg, unavailableMsg } = this.config;
        try {
            const info = await this.server.getInfo();
            const map = getMap(info.map, maps);
            this.online = info.players.online;
            this.bot.user.setPresence({
                activities: [{
                    type: ActivityType.Playing,
                    name: statusMsg.replaceAll('{online}', info.players.online).replaceAll('{max}', info.players.max).replaceAll('{map}', map.name)
                }],
                status: 'online'
            });

            if (Object.keys(this.message).length === 0) return;

            const players = await this.server.getPlayers();
            const { connectUrl } = this.serverData;
            const msgObject = createServMsg(info, players, map, this.bot.user.avatarURL(), this.config, connectUrl);
            this.message.edit(msgObject);

        }
        catch (e) {
            this.bot.user.setPresence({ activities: [{ type: ActivityType.Watching, name: unavailableMsg }], status: 'dnd' });
            throw new Error(e);
        }


    }
}

function getMap(map, maps) {
    for (const key in maps) {
        if (map.includes(key)) return maps[key];
    }
    return maps.default;
}

function createServMsg(info, players, map, avatar, config, connectUrl) {
    const { imageUrl, color, playersLabel, mapLabel, nicknameLabel, scoreLabel, btnLabel, footerText } = config;

    const servEmbed = new EmbedBuilder().setImage(imageUrl).setColor(color);

    const sorted = players.sort((a, b) => (a.score > b.score) ? -1 : ((b.score > a.score) ? 1 : 0));
    let names = '', scores = '';
    for (const player of sorted) {
        names += player.name ? `\n${player.name}` : '\n*Player connecting*';
        scores += `\n${player.score}`;
    }

    servEmbed.setFields([
        { name: playersLabel, value: `\`\`\`${info.players.online}/${info.players.max}\`\`\``, inline: true },
        { name: '\u200B', value: `\u200B`, inline: true },
        { name: mapLabel, value: `\`\`\`${map.name}\`\`\``, inline: true },
        { name: nicknameLabel, value: `\`\`\`${names}\`\`\``, inline: true },
        { name: scoreLabel, value: `\`\`\`${scores}\`\`\``, inline: true }
    ]);
    servEmbed.setFooter({ text: footerText, iconURL: avatar }).setThumbnail(map.img).setTimestamp();

    const connectBtn = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(btnLabel);
    if (connectUrl.startsWith('http')) connectBtn.setURL(connectUrl);
    else connectBtn.setURL('https://example.com').setDisabled(true);

    return { embeds: [servEmbed], components: [new ActionRowBuilder().addComponents(connectBtn)] };
}

module.exports = StatusServer;