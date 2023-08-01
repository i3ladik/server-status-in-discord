const StatusCoordinator = require('./src/StatusCoordinator.js');
const fs = require('fs');

let config = {};
if (fs.existsSync('./config.json')) {
    const data = fs.readFileSync('./config.json');
    config = JSON.parse(data);
}

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
config.statBot = config.statBot || { token: 'token', messageId: 'messageId' };
config.servers = config.servers || [
    { name: 'name', host: 'host', token: 'token', messageId: 'messageId', connectUrl: 'leave this message if not' },
    { name: 'name', host: 'host', token: 'token', messageId: 'messageId', connectUrl: 'leave this message if not' }
];
config.maps = config.maps || { default: { img: 'https://i.imgur.com/QtxEQQE.png', name: 'MAP' } };

fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));
setInterval(async () => {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));
}, 5 * 60 * 1000);

new StatusCoordinator(config);

