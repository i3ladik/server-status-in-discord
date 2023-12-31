const StatusCoordinator = require('./src/StatusCoordinator.js');
const fs = require('fs');

const configPath = './config.json';

let config = {};
if (fs.existsSync(configPath)) {
    try {
        const data = fs.readFileSync(configPath);
        config = JSON.parse(data);
    }
    catch {
        config = {};
    }
}

config = initConfig(config);
fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

setInterval(async () => {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}, 5 * 60 * 1000);

const _ = new StatusCoordinator(config);


function initConfig(config) {
    const statBotType = {
        token: 'token',
        messageId: 'messageId',
        serversText: '- **{name} - {host}**',
        additionalInfo: '\nLocation - your location (leave it clean if its not necessary)',
        banner: 'https://i.imgur.com/xN4r7PN.png'
    };
    const serverType = {
        name: 'name',
        host: 'host',
        token: 'token',
        messageId: 'messageId',
        buttons: [
            { emoji: '👇', label: 'Connect', url: 'leave this if not' },
            { emoji: '', label: 'Site', url: 'leave this if not' }
        ]
    };
    const graph = {
        generalGraph: true,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.2)',
        scalesColor: 'white',
        timeLabel: '{time}h',
        timeNow: 'Now'
    }

    if (typeof config.useGraphs !== 'boolean') config.useGraphs = true;
    config.graph = config.graph || graph;
    if (typeof config.countBots !== 'boolean') config.countBots = true;
    config.update_ms = Number(config.update_ms) || 60000;
    config.timeout_ms = Number(config.timeout_ms) || config.update_ms;
    if (config.timeout_ms > config.update_ms) config.timeout_ms = config.update_ms;
    config.maxOnline = config.maxOnline || 0;
    config.channelId = config.channelId || 'channelId';
    config.startMsg = config.startMsg || 'Starting...';
    config.statusMsg = config.statusMsg || 'Players {online}/{max} on {map}';
    config.statusBotMsg = config.statusBotMsg || 'Online: {online} Max online: {max}';
    config.unavailableMsg = config.unavailableMsg || 'Unavailable...';
    config.playersLabel = config.playersLabel || 'Players 👥';
    config.mapLabel = config.mapLabel || 'Map 🗺️';
    config.nicknameLabel = config.nicknameLabel || 'Nickname 📛';
    config.scoreLabel = config.scoreLabel || 'Score 🏆';
    config.footerText = config.footerText || 'Connect 👇';
    config.color = config.color || '#2b2d31';
    config.imageUrl = config.imageUrl || 'https://imgur.com/Yk9EZkj';
    config.statBot = config.statBot || statBotType;
    config.servers = config.servers || [serverType, serverType];
    config.maps = config.maps || { default: { img: 'https://i.imgur.com/QtxEQQE.png', name: 'MAP' } };
    return config;
}