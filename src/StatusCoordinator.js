const { Client, ActivityType, OAuth2Scopes, EmbedBuilder } = require('discord.js');
const StatusServer = require('./StatusServer.js');
const fs = require('fs');

const hasId = (input) => /^\d+$/.test(input);

/**
* Status coordinator class
*/
class StatusCoordinator {
    /**
    * Creates a new object of the StatusCoordinator class
    * @param {object} config - config
    * @constructor
    */
    constructor(config) {
        this.config = config;
        this.date = new Date();
        this.bot = {};
        this.message = {};
        this.servers = [];

        this.init();
    }

    /**
    * Initializing coordinator
    */
    async init() {
        const { statBot, startMsg, channelId, servers, update_ms } = this.config;

        if (statBot.token.length > 10) {
            const client = new Client({ intents: [] });
            await client.login(statBot.token);
            client.user.setPresence({ activities: [{ type: ActivityType.Watching, name: startMsg }], status: 'idle' });
            this.bot = client;

            const link = client.generateInvite({ scopes: [OAuth2Scopes.Bot] });
            console.log(`Stats bot invite link: ${link}`);

            if (hasId(channelId)) {
                const { imageUrl, color } = this.config;

                const channel = await client.channels.fetch(channelId).catch(() => {
                    console.log('Stats bot: I didnt find the channel. Maybe I was not invited to the server or permissions in channel not given. Restart after fix');
                    return;
                });

                if (channel) {
                    let message;

                    const msgObj = createStatMsg(servers, statBot, imageUrl, color);
                    if (hasId(statBot.messageId)) {
                        message = await channel.messages.fetch(statBot.messageId).catch(() => { return; });

                        if (message) message.edit(msgObj);
                        else message = await channel.send(msgObj);
                    }
                    else message = await channel.send(msgObj);

                    this.message = message;
                    statBot.messageId = message.id;
                }
            }

        }

        for (const server of servers) {
            const statServer = await (new StatusServer(server, this.config)).init();
            this.servers.push(statServer);
        }

        if (Object.keys(this.bot).length >= 0) {
            this.update();
            setInterval(() => this.update(), update_ms);
        }

        fs.writeFileSync('./config.json', JSON.stringify(this.config, null, 4));
    }

    /**
    * Updating stats
    */
    async update() {
        const { statusBotMsg } = this.config;

        let online = 0;
        for (const server of this.servers) {
            if (server) online += server.online;
        }

        if (online > this.config.maxOnline) {
            this.config.maxOnline = online;
            fs.writeFileSync('./config.json', JSON.stringify(this.config, null, 4));
        }
        if (this.date.getDay() != new Date().getDay()) {
            this.date = new Date(); this.config.maxOnline = online;
            fs.writeFileSync('./config.json', JSON.stringify(this.config, null, 4));
        }

        this.bot.user.setPresence({
            activities: [{
                type: ActivityType.Watching,
                name: statusBotMsg.replaceAll('{online}', online).replaceAll('{max}', this.config.maxOnline)
            }], status: 'online'
        });
    }
}

function createStatMsg(servers, statBot, imageUrl, color) {
    const { banner, serversText } = statBot;
    const msgObj = { embeds: [] };

    if (banner.startsWith('http')) msgObj.embeds.push(new EmbedBuilder().setImage(banner).setColor(color));

    let text = '';
    for (const server of servers) text += `${serversText}\n`.replaceAll('{name}', server.name).replaceAll('{host}', server.host);

    msgObj.embeds.push(new EmbedBuilder().setDescription(text).setImage(imageUrl).setColor(color));

    return msgObj;
}

module.exports = StatusCoordinator;