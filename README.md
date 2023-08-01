# server-status-in-discord
Simple server monitoring in discord
<br><br>

**Some** of the games where it works with are:
- Counter-Strike
- Counter-Strike: Global Offensive
- Garry's Mod
- Half-Life
- Team Fortress 2
- Day of Defeat
- The ship
<br>
**More info - [here](https://www.npmjs.com/package/@fabricio-191/valve-server-query)**

# How to use
## Fill in the configuration file
### Example
```
{
    "update_ms": 60000,
    "timeout_ms": 30000,
    "maxOnline": 0,
    "channelId": "981326671221248020", // optional, not necessarily
    "startMsg": "starting...",
    "statusMsg": "{online}/{max} on {map}",
    "statusBotMsg": "online: {online} Max: {max}",
    "unavailableMsg": "unavailable...",
    "playersLabel": "Players 👥",
    "mapLabel": "Map 🗺️",
    "nicknameLabel": "Nickname 📛",
    "scoreLabel": "Score 🏆",
    "footerText": "Connect 👇",
    "btnLabel": "Connect",
    "color": "#2b2d31",
    "imageUrl": "https://imgur.com/Yk9EZkj",
    "statBot": { "token": "MIZrNTY2NTVzNTE3Nz...", "messageId": "1135961500910096425" }, // statBot optional, not necessarily
    "servers": [
        { "name": "No url example", "host": "91.200.42.11:27022", "token": "MIZrNTY2NTVzNTE3Nz...",
            "messageId": "1135961509634248716", // optional, not necessarily
            "connectUrl": "leave this message if not" // optional, not necessarily
        },
        { "name": "No url example", "host": "91.200.42.11:27020", "token": "MIZrNTY2NTVzNTE3Nz...",
            "messageId": "messageId", // optional, not necessarily
            "connectUrl": "https://oupro.gg/servers/retake2" // optional, not necessarily
        },
        ...
    ],
    "maps": {
        "default": { "img": "https://i.imgur.com/QtxEQQE.png", "name": "MAP" },
        "mirage": {
            "img": "https://images-ext-2.discordapp.net/external/9BNYH9kMkxmN-p3TX7cZrP2TfUEWP0k03zO9JAff_aw/https/developer.valvesoftware.com/w/images/6/68/De_mirage.png",
            "name": "MIRAGE"
        },
        ...
    }
}
```
## Install packages and run
### Node
`npm install`
<br>
`npm start`
### Docker compose
`docker-compose up --build`
## Invite bots
The application will send links to invite bots to the server in the log
<br>
```
Stats bot invite link: https://discord.com/api/oauth2/authorize?client_id=...
Stats No url example bot invite link: https://discord.com/api/oauth2/authorize?client_id=...
Stats Url example bot invite link: https://discord.com/api/oauth2/authorize?client_id=...
```
Add all bots and restart
# Result
![Status ](https://i.imgur.com/08qqV39.png)
<br><br>
![Monitoring messages](https://i.imgur.com/hsgDPkY.png)