const { Client, ActivityType, OAuth2Scopes, EmbedBuilder } = require('discord.js');
const StatusServer = require('./StatusServer.js');
const fs = require('fs');

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

        if (statBot.token !== 'token') {
            const client = new Client({ intents: [] });
            await client.login(statBot.token);
            client.user.setPresence({ activities: [{ type: ActivityType.Watching, name: startMsg }], status: 'idle' });
            this.bot = client;

            const link = client.generateInvite({ scopes: [OAuth2Scopes.Bot] });
            console.log(`Stats bot invite link: ${link}`);

            if (channelId !== 'channelId') {
                const { imageUrl, color } = this.config;

                const channel = await client.channels.fetch(channelId).catch(() => {
                    throw new Error('I didnt find the channel. Perhaps I was not invited to the server or permissions in channel not given');
                });
                let message;

                const statEmbed = createStatMsg(servers, imageUrl, color);
                if (statBot.messageId !== 'messageId') {
                    message = await channel.messages.fetch(statBot.messageId).catch(() => { return; });

                    if (message) message.edit({ embeds: [statEmbed] });
                    else message = await channel.send({ embeds: [statEmbed] });
                }
                else message = await channel.send({ embeds: [statEmbed] });

                this.message = message;
                statBot.messageId = message.id;
            }

            setInterval(() => this.update(), update_ms);
        }

        for (const server of servers) {
            const statServer = await (new StatusServer(server, this.config)).init();
            this.servers.push(statServer);
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
            if(!server) continue;
            online += server.online;
        }
        if (online > this.config.maxOnline) this.config.maxOnline = online;
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

function createStatMsg(servers, imageUrl, color) {
    let serversText = '';
    for (const server of servers) serversText += `- **${server.name} - ${server.host}**\n`;
    const statEmbed = new EmbedBuilder().setDescription(serversText).setImage(imageUrl).setColor(color);
    return statEmbed;
}

module.exports = StatusCoordinator;