const { Client, ActivityType, OAuth2Scopes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const { queryGameServerInfo, queryGameServerPlayer } = require('steam-server-query');

const hasId = (input) => /^\d+$/.test(input);

/**
* Status server class
*/
class StatusServer {
    /**
    * @param {object} serverData - server data
    * @param {object} config - config
    */
    constructor(coordinator, serverData) {
        this.coordinator = coordinator;
        this.serverData = serverData;
        this.config = coordinator.config;
        this.host = serverData.host;
        this.bot = {};
        this.message = {};
        this.online = 0;
    }

    /**
    * Initializing server
    */
    async init() {
        const { token, name } = this.serverData;
        const { channelId, update_ms, startMsg } = this.config;

        if (token.length < 10) return;

        const client = new Client({ intents: [] });
        await client.login(token);
        client.user.setPresence({ activities: [{ type: ActivityType.Watching, name: startMsg }], status: 'idle' });
        this.bot = client;

        const link = client.generateInvite({ scopes: [OAuth2Scopes.Bot] });
        console.log(`Stats ${name} bot invite link: ${link}`);

        if (hasId(channelId)) {
            const { imageUrl, color } = this.config;

            const channel = await client.channels.fetch(channelId).catch(() => {
                console.log(`${name}: I didnt find the channel. Maybe I was not invited to the server or permissions in channel not given. Restart after fix`);
                return;
            });

            if (!channel) return;

            let message;

            const servEmbed = new EmbedBuilder().setImage(imageUrl).setColor(color).setDescription('**Temp message. Wait update...**');
            if (hasId(this.serverData.messageId)) {
                message = await channel.messages.fetch(this.serverData.messageId).catch(() => { return; });
                if (!message) message = await channel.send({ embeds: [servEmbed] });
            }
            else message = await channel.send({ embeds: [servEmbed] });

            this.message = message;
            this.serverData.messageId = message.id;
        }

        console.log(`${name} ready`);
        this.update();
        setInterval(() => this.update(), update_ms);

        return this;
    }

    /**
    * Updating server info
    */
    async update() {
        const { useGraphs, maps, statusMsg, unavailableMsg, timeout_ms } = this.config;
        const timeout = Number(timeout_ms);

        try {
            const info = await queryGameServerInfo(this.host, 1, timeout);
            const map = getMap(info.map, maps);
            this.online = info.players;
            this.bot.user.setPresence({
                activities: [{
                    type: ActivityType.Playing,
                    name: statusMsg.replaceAll('{online}', info.players).replaceAll('{max}', info.maxPlayers).replaceAll('{map}', map.name)
                }],
                status: 'online'
            });

            if (Object.keys(this.message).length === 0) return;

            const { players } = await queryGameServerPlayer(this.host, 1, timeout);

            let image;
            if (useGraphs) image = this.coordinator.writeStat(this.host, info.players, info.maxPlayers);
            else image = this.config.imageUrl;

            const msgObject = createServMsg(info, players, map, this.bot.user.avatarURL(), this.config, this.serverData.buttons, image);
            this.message.edit(msgObject);
        }
        catch (e) {
            console.error(e);
            console.error(`${e}\nError ${this.host} maybe wrong server host or off`);
            this.coordinator.writeStat(this.host, 0);
            this.bot.user.setPresence({ activities: [{ type: ActivityType.Watching, name: unavailableMsg }], status: 'dnd' });

        }
    }
}

function getMap(map, maps) {
    for (const key in maps) {
        if (map.includes(key)) return maps[key];
    }
    return maps.default;
}

function createServMsg(info, players, map, avatar, config, buttons, image) {
    const msgObj = { embeds: [], components: [], files: [] };

    if (typeof image === 'string') msgObj.embeds.push(createEmbed(info, players, map, avatar, config, image));
    else {
        const imgAttch = new AttachmentBuilder(image, { name: 'stat.png' });
        msgObj.embeds.push(createEmbed(info, players, map, avatar, config, imgAttch.name));
        msgObj.files.push(imgAttch);
    }

    const aRow = new ActionRowBuilder();
    const buttonComps = createButtons(buttons);
    if (buttonComps.length > 0) {
        msgObj.components.push(aRow.addComponents(buttonComps));
    }

    return msgObj;
}

function createEmbed(info, players, map, avatar, config, image) {
    const { color, playersLabel, mapLabel, nicknameLabel, scoreLabel, footerText } = config;

    const servEmbed = new EmbedBuilder().setColor(color);
    if (image.startsWith('http')) servEmbed.setImage(image);
    else servEmbed.setImage(`attachment://${image}`);

    const sorted = players.sort((a, b) => (a.score > b.score) ? -1 : ((b.score > a.score) ? 1 : 0));
    let names = '', scores = '';
    for (const player of sorted) {
        names += player.name ? `\n${player.name}` : '\n*Player connecting*';
        scores += `\n${player.score}`;
    }

    servEmbed.setFields([
        { name: playersLabel, value: `\`\`\`${info.players}/${info.maxPlayers}\`\`\``, inline: true },
        { name: '\u200B', value: `\u200B`, inline: true },
        { name: mapLabel, value: `\`\`\`${map.name}\`\`\``, inline: true },
        { name: nicknameLabel, value: `\`\`\`${names}\`\`\``, inline: true },
        { name: scoreLabel, value: `\`\`\`${scores}\`\`\``, inline: true }
    ]);
    servEmbed.setFooter({ text: footerText, iconURL: avatar }).setThumbnail(map.img).setTimestamp();

    return servEmbed;
}

function createButtons(buttons) {
    const buttonsArr = [];

    for (const button of buttons) {
        if (!button.url.startsWith('http')) continue;
        const btn = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(button.label).setURL(button.url);
        if (button.emoji) btn.setEmoji(button.emoji);
        buttonsArr.push(btn);
    }

    return buttonsArr;
}

module.exports = StatusServer;