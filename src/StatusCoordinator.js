const { Client, ActivityType, OAuth2Scopes, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const StatusServer = require('./StatusServer.js');
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');
const fs = require('fs');

const graphStatsPath = `./graphStats.json`;
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
        this.coordinatorBot = {};
        this.servers = [];
        this.graphStats = {};
        this.graphBuffer = {};
        this.message = {};

        this.init();
    }

    /**
    * Initializing coordinator
    */
    async init() {
        const { useGraphs, statBot, startMsg, channelId, servers, update_ms } = this.config;

        // Read or create graphs file
        if (useGraphs) {
            if (fs.existsSync(graphStatsPath)) {
                try {
                    const data = fs.readFileSync(graphStatsPath);
                    this.graphStats = JSON.parse(data);
                }
                catch {
                    this.graphStats = {};
                }
            }
            setInterval(() => fs.writeFileSync(graphStatsPath, JSON.stringify(this.graphStats, null, 4)), update_ms);
        }

        // Stat bot init
        if (statBot.token.length > 10) {
            this.coordinatorBot = new Client({ intents: [] });
            await this.coordinatorBot.login(statBot.token);
            this.coordinatorBot.user.setPresence({ activities: [{ type: ActivityType.Watching, name: startMsg }], status: 'idle' });

            const link = this.coordinatorBot.generateInvite({ scopes: [OAuth2Scopes.Bot] });
            console.log(`Stats bot invite link: ${link}`);

            if (hasId(channelId)) {
                const { imageUrl, color } = this.config;

                await this.coordinatorBot.channels.fetch(channelId).then(async channel => {
                    let statMessage;
                    const msgObj = createStatMsg(servers, statBot, imageUrl, color);

                    if (hasId(statBot.messageId)) {
                        statMessage = await channel.messages.fetch(statBot.messageId).catch(() => { return; });

                        if (statMessage) statMessage.edit(msgObj);
                        else statMessage = await channel.send(msgObj);
                    }
                    else statMessage = await channel.send(msgObj);
                    this.message = statMessage;
                    statBot.messageId = statMessage.id;
                }).catch(() => {
                    console.log('Stats bot: I didnt find the channel. Maybe I was not invited to the server or permissions in channel not given. Restart after fix');
                });
            }

        }

        // Servers stats bots init
        for (let serverNumber = 0; serverNumber < servers.length; serverNumber++) {
            const statServer = await (new StatusServer(this, serverNumber)).init();
            if (statServer) this.servers.push(statServer);
        }

        // Check if stat bot enabled
        if (Object.keys(this.coordinatorBot).length > 0) {
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
        const { generalGraph } = this.config.graph;

        let online = 0;
        let serversMOnline = 0;
        for (const server of this.servers) {
            if (server) online += server.online;
            serversMOnline += server.maxOnline;
        }

        if (this.date.getDay() != new Date().getDay()) {
            this.date = new Date(); this.config.maxOnline = online;
            fs.writeFileSync('./config.json', JSON.stringify(this.config, null, 4));
        }
        else if (online > this.config.maxOnline) {
            this.config.maxOnline = online;
            fs.writeFileSync('./config.json', JSON.stringify(this.config, null, 4));
        }

        this.coordinatorBot.user.setPresence({
            activities: [{
                type: ActivityType.Watching,
                name: statusBotMsg.replaceAll('{online}', online).replaceAll('{max}', this.config.maxOnline)
            }], status: 'online'
        });

        // Update general graph
        if (Object.keys(this.message).length === 0 || !generalGraph) return;
        const graph = this.writeAndGetGraph('general', online, serversMOnline, true);
        const graphAttch = new AttachmentBuilder(graph, { name: 'graph.png' });

        let generalEmbed = {};
        const embeds = [];
        if (this.message.embeds.length == 2) {
            embeds.push(this.message.embeds[0]);
            generalEmbed = new EmbedBuilder(this.message.embeds[1]);
        }
        else generalEmbed = new EmbedBuilder(this.message.embeds[0]);
        generalEmbed.setImage(`attachment://${graphAttch.name}`);
        embeds.push(generalEmbed);

        this.message.edit({ embeds, files: [graphAttch] });

    }

    /**
    * Writing statistics data and getting a graph
    */
    writeAndGetGraph(serverHost, online, maxOnline = 24, forceEdit = false) {
        const { borderColor, backgroundColor, scalesColor, timeLabel, timeNow } = this.config.graph;

        // Create server stats data and write
        if (!this.graphStats[serverHost]) this.graphStats[serverHost] = {};
        const time = (roundToHour(new Date())).getTime();
        let serverStat = this.graphStats[serverHost];

        let updated = false;
        if (!serverStat[time] || serverStat[time] < online) {
            serverStat[time] = online;
            updated = true;
        }

        // Sort and clear 24h interval
        const timeEntries = Object.entries(serverStat).map(([timestamp, value]) => [parseInt(timestamp), value]);
        timeEntries.sort((a, b) => a[0] - b[0]);
        const filteredTimeEntries = timeEntries.filter(([timestamp, value]) => time - timestamp <= 24 * 60 * 60 * 1000);
        serverStat = Object.fromEntries(filteredTimeEntries);

        if (!this.graphBuffer[serverHost] || forceEdit || updated) {
            // Creating graph
            const onlines = [];
            for (const statTime in serverStat) {
                onlines.push(serverStat[statTime]);
            }
            while (onlines.length < 25) onlines.unshift(null);

            const labels = [];
            const intervals = [24, 18, 12, 6, 0];
            for (const interval of intervals) {
                if (interval === 0) labels.push(timeNow);
                else labels.push(timeLabel.replaceAll('{time}', interval), '', '', '', '', '');
            }

            const canvas = createCanvas(689, 200);
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            data: onlines,
                            borderColor,
                            backgroundColor,
                            fill: true
                        }
                    ]
                },
                options: {
                    scales: {
                        x: { ticks: { color: scalesColor } },
                        y: {
                            axis: 'y',
                            max: maxOnline + 1,
                            min: 0,
                            ticks: { color: scalesColor }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
            this.graphBuffer[serverHost] = canvas.toBuffer('image/png');

            chart.destroy();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return this.graphBuffer[serverHost];
    }
}

function roundToHour(date) {
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
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