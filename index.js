const StatusCoordinator = require('./src/StatusCoordinator.js');
const fs = require('fs');

const configPath = './config.json';

let config = {};
if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath);
    config = JSON.parse(data);
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
        banner: 'https://i.imgur.com/xN4r7PN.png'
    };
    const serverType = {
        name: 'name',
        host: 'host',
        token: 'token',
        messageId: 'messageId',
        connectUrl: 'leave this message if not'
    };

    config.update_ms = Number(config.update_ms) || 60000;
    config.timeout_ms = Number(config.timeout_ms) || config.update_ms;
    if (config.timeout_ms > config.update_ms) config.timeout_ms = config.update_ms;
    config.maxOnline = config.maxOnline || 0;
    config.channelId = config.channelId || 'channelId';
    config.startMsg = config.startMsg || 'starting...';
    config.statusMsg = config.statusMsg || '{online}/{max} on {map}';
    config.statusBotMsg = config.statusBotMsg || 'online: {online} Max: {max}';
    config.unavailableMsg = config.unavailableMsg || 'unavailable...';
    config.playersLabel = config.playersLabel || 'Players 👥';
    config.mapLabel = config.mapLabel || 'Map 🗺️';
    config.nicknameLabel = config.nicknameLabel || 'Nickname 📛';
    config.scoreLabel = config.scoreLabel || 'Score 🏆';
    config.footerText = config.footerText || 'Connect 👇';
    config.btnLabel = config.btnLabel || 'Connect';
    config.color = config.color || '#2b2d31';
    config.imageUrl = config.imageUrl || 'https://imgur.com/Yk9EZkj';
    config.statBot = config.statBot || statBotType;
    config.servers = config.servers || [serverType, serverType];
    config.maps = config.maps || { default: { img: 'https://i.imgur.com/QtxEQQE.png', name: 'MAP' } };
    return config;
}