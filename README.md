# server-status-in-discord
Simple server monitoring in discord<br><br>

**Some** of the games where it works with are:
- Counter-Strike
- Counter-Strike: Global Offensive
- Garry's Mod
- Half-Life
- Team Fortress 2
- Day of Defeat
- The ship<br>

**More info - [here](https://www.npmjs.com/package/steam-server-query)**

# How to use

## Fill in the configuration file

### Example

```
{
    "useGraphs": true,
    "countBots": true,
    "update_ms": 60000,
    "timeout_ms": 30000,
    "maxOnline": 0,
    "channelId": "981326671221248020", // optional
    "startMsg": "starting...",
    "statusMsg": "{online}/{max} on {map}",
    "statusBotMsg": "online: {online} Max: {max}",
    "unavailableMsg": "unavailable...",
    "playersLabel": "Players 👥",
    "mapLabel": "Map 🗺️",
    "nicknameLabel": "Nickname 📛",
    "scoreLabel": "Score 🏆",
    "footerText": "Connect 👇",
    "color": "#2b2d31",
    "imageUrl": "https://imgur.com/Yk9EZkj",
    "statBot": { //optional
        "token": "MIZrNTY2NTVzNTE3Nz...",
        "messageId": "messageId", // optional
        "serversText": "- **{name} - {host}**",
        "banner": "https://i.imgur.com/xN4r7PN.png"  // optional
    },
    "servers": [
        { "name": "No url example", "host": "91.200.42.11:27022", "token": "MIZrNTY2NTVzNTE3Nz...",
            "messageId": "1135961509634248716", // optional
            "buttons": [] // optional, max 5
        },
        { "name": "No url example", "host": "91.200.42.11:27020", "token": "MIZrNTY2NTVzNTE3Nz...",
            "messageId": "messageId", // optional
            "buttons": [  // optional, max 5
                {
                    "emoji": "👇",
                    "label": "Connect",
                    "url": "https://oupro.gg/servers/public1"
                },
                {
                    "emoji": "<:oupro:1136296844763349032>",
                    "label": "Site",
                    "url": "https://oupro.gg/"
                },
                {
                    "emoji": "",
                    "label": "Rules",
                    "url": "https://oupro.gg/rules"
                }
            ]
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

```
npm install
```

```
npm start
```

### Docker compose

```
docker-compose up --build
```

## Running in the Background

### Node

PM2 example<br>
Install PM2 globally if not done already
```
npm install -g pm2
```
Start your app with PM2:<br>
```
pm2 start index.js -n server-status
```

### Docker compose

Use -d flag<br>
```
docker-compose up --build -d
```

## Invite bots

The application will send links to invite bots to the server in the log<br>

```
Stats bot invite link: https://discord.com/api/oauth2/authorize?client_id=...
Stats No url example bot invite link: https://discord.com/api/oauth2/authorize?client_id=...
Stats Url example bot invite link: https://discord.com/api/oauth2/authorize?client_id=...
```

Add all bots and restart

# Result

![Status](https://i.imgur.com/08qqV39.png)<br>
![Stat bot message](https://i.imgur.com/JPRhLxg.png)<br>
![First server message](https://i.imgur.com/w1scWHb.png)<br>
![Second server message](https://i.imgur.com/cGSloLw.png)<br>