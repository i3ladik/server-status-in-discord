const { Client, ActivityType, OAuth2Scopes, EmbedBuilder } = require('discord.js');
const StatusServer = require('./StatusServer.js');
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');
const fs = require('fs');

const statsPath = `./stats.json`;
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
        this.stats = {};

        this.init();
    }

    /**
    * Initializing coordinator
    */
    async init() {
        const { useGraphs, statBot, startMsg, channelId, servers, update_ms } = this.config;

        if (useGraphs) {
            if (fs.existsSync(statsPath)) {
                try {
                    const data = fs.readFileSync(statsPath);
                    this.stats = JSON.parse(data);
                }
                catch {
                    this.stats = {};
                }
            }
            setInterval(() => fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 4)), update_ms);
        }


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
            const statServer = await (new StatusServer(this, server)).init();
            if (statServer) this.servers.push(statServer);
        }

        if (Object.keys(this.bot).length > 0) {
            console.log('Status bot ready');
            this.update();
            setInterval(() => this.update(), update_ms);
        }

        fs.writeFileSync('./config.json', JSON.stringify(this.config, null, 4));
        console.log(`Server-status-in-discord successfully launched. Servers: ${this.servers.length}`);
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

    writeStat(serverHost, online, maxOnline = 24) {
        if (!this.stats[serverHost]) this.stats[serverHost] = {};
        let serverStat = this.stats[serverHost];
        const time = (roundToHour(new Date())).getTime();
        if (!serverStat[time] || serverStat[time] < online) serverStat[time] = online;

        //sort and clear 24h interval
        const timeEntries = Object.entries(serverStat).map(([timestamp, value]) => [parseInt(timestamp), value]);
        timeEntries.sort((a, b) => a[0] - b[0]);
        const filteredTimeEntries = timeEntries.filter(([timestamp, value]) => time - timestamp <= 24 * 60 * 60 * 1000);
        serverStat = Object.fromEntries(filteredTimeEntries);

        const canvas = createCanvas(689, 200);
        const ctx = canvas.getContext('2d');

        const labels = [];
        const onlines = [];
        for (const statTime in serverStat) {
            labels.push(dateToTimeString(statTime));
            onlines.push(serverStat[statTime]);
        }

        const _ = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Players',
                        data: onlines,
                        borderColor: 'blue',
                        backgroundColor: 'rgba(0, 0, 255, 0.2)',
                        fill: true
                    }
                ]
            },
            options: {
                scales: {
                    x: { ticks: { color: 'white' } },
                    y: {
                        axis: 'y',
                        max: maxOnline,
                        min: 0,
                        ticks: { color: 'white' }
                    }
                },
                plugins: {
                    legend: { labels: { color: 'white' } }
                }
            }
        });

        const buffer = canvas.toBuffer('image/png');
        return buffer;
    }
}

function roundToHour(date) {
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}

function dateToTimeString(time) {
    const date = new Date(parseInt(time));
    const hours = date.getHours();

    return `${hours}h`;
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