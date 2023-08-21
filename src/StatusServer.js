const { Client, ActivityType, OAuth2Scopes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const { queryGameServerInfo, queryGameServerPlayer } = require('steam-server-query');
const StatusCoordinator = require('./StatusCoordinator.js');

const hasId = (input) => /^\d+$/.test(input);

/**
* Status server class
*/
class StatusServer {
    /**
    * @param {StatusCoordinator} coordinator - server coordinator
    * @param {number} serverNumber - server number
    */
    constructor(coordinator, serverNumber) {
        this.coordinator = coordinator;
        this.config = coordinator.config;
        this.serverData = this.config.servers[serverNumber];
        this.host = this.serverData.host;
        this.serverBot = {};
        this.message = {};
        this.online = 0;
        this.maxOnline = 0;
    }

    /**
    * Initializing server
    */
    async init() {
        const { token, name } = this.serverData;
        const { channelId, update_ms, startMsg } = this.config;

        if (token.length < 10) return;

        this.serverBot = new Client({ intents: [] });
        await this.serverBot.login(token);
        this.serverBot.user.setPresence({ activities: [{ type: ActivityType.Custom, name: startMsg }], status: 'idle' });

        const link = this.serverBot.generateInvite({ scopes: [OAuth2Scopes.Bot] });
        console.log(`Stats ${name} bot invite link: ${link}`);

        if (hasId(channelId)) {
            const { imageUrl, color } = this.config;

            await this.serverBot.channels.fetch(channelId).then(async channel => {
                let serverMessage;
                const servEmbed = new EmbedBuilder().setImage(imageUrl).setColor(color).setDescription('**Temp message. Wait update...**');

                if (hasId(this.serverData.messageId)) {
                    serverMessage = await channel.messages.fetch(this.serverData.messageId).catch(() => { return; });
                    if (!serverMessage) serverMessage = await channel.send({ embeds: [servEmbed] });
                }
                else serverMessage = await channel.send({ embeds: [servEmbed] });

                this.message = serverMessage;
                this.serverData.messageId = serverMessage.id;
            }).catch(() => {
                console.log(`${name}: I didnt find the channel. Maybe I was not invited to the server or permissions in channel not given. Restart after fix`);
            });
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
        const { useGraphs, countBots, maps, statusMsg, unavailableMsg, timeout_ms } = this.config;
        const timeout = Number(timeout_ms);

        const server = await getInfoAndPlayers(this.host, timeout);
        if (!server) {
            this.coordinator.writeAndGetGraph(this.host, 0);
            this.serverBot.user.setPresence({ activities: [{ type: ActivityType.Custom, name: unavailableMsg }], status: 'dnd' });
            return;
        }

        const { info, players } = server;

        this.online = countBots ? info.players : info.players - info.bots;
        this.maxOnline = countBots ? info.maxPlayers : info.maxPlayers - info.bots;

        const map = getMap(info.map, maps);
        this.serverBot.user.setPresence({
            activities: [{
                type: ActivityType.Custom,
                name: statusMsg.replaceAll('{online}', this.online).replaceAll('{max}', this.maxOnline).replaceAll('{map}', map.name)
            }],
            status: 'online'
        });

        if (Object.keys(this.message).length === 0) return;

        let image;
        if (useGraphs) image = this.coordinator.writeAndGetGraph(this.host, this.online, this.maxOnline);
        else image = this.config.imageUrl;

        const msgObject = createServMsg(this.online, this.maxOnline, players, map, this.serverBot.user.avatarURL(), this.config, this.serverData.buttons, image);
        await this.message.edit(msgObject);
    }
}

async function getInfoAndPlayers(host, timeout) {
    try {
        const info = await queryGameServerInfo(host, 1, timeout);
        const { players } = await queryGameServerPlayer(host, 1, timeout);

        return { info, players };
    }
    catch (e) {
        console.error(e);
        console.error(`Error ${host} maybe wrong server host or off`);

        return null;
    }
}

function getMap(map, maps) {
    for (const key in maps) {
        if (map.includes(key)) return maps[key];
    }
    return maps.default;
}

function createServMsg(online, maxOnline, players, map, avatar, config, buttons, image) {
    const msgObj = { embeds: [], components: [], files: [] };

    if (typeof image === 'string') msgObj.embeds.push(createEmbed(online, maxOnline, players, map, avatar, config, image));
    else {
        const graphAttch = new AttachmentBuilder(image, { name: 'graph.png' });
        msgObj.embeds.push(createEmbed(online, maxOnline, players, map, avatar, config, graphAttch.name));
        msgObj.files.push(graphAttch);
    }

    const aRow = new ActionRowBuilder();
    const buttonComps = createButtons(buttons);
    if (buttonComps.length > 0) {
        msgObj.components.push(aRow.addComponents(buttonComps));
    }

    return msgObj;
}

function createEmbed(online, maxOnline, players, map, avatar, config, image) {
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
        { name: playersLabel, value: `\`\`\`${online}/${maxOnline}\`\`\``, inline: true },
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