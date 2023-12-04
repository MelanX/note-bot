import * as tmi from 'tmi.js';
import * as fs from "fs";

require('dotenv').config({path: 'twitch.env'});

let lastUsed = 1337
const twitchChannel = `#${process.env.CHANNEL.toLowerCase()}`;

// join channel
const client = new tmi.Client({
    options: {debug: true},
    connection: {
        reconnect: true
    },
    identity: {
        username: process.env.BOT_NAME,
        password: 'oauth:' + process.env.TWITCH_TOKEN,
    },
    channels: [process.env.CHANNEL]
});

client.connect().catch(console.error);

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    // check the bots custom commands
    if (channel === twitchChannel) {
        const user = tags["display-name"];
        if (user.toLowerCase() === "melanx") {
            const args = message.split(" ");
            if (message.startsWith("!blacklist ") && args.length >= 2) {
                const name = args[1];
                const file = fs.readFileSync(__dirname + "/data/blacklist.json");
                const data = JSON.parse(file.toString());
                const blacklist = data.blacklist;
                if (!blacklist.includes(name.toLowerCase())) {
                    blacklist.push(name.toLowerCase());
                    data.blacklist = blacklist;
                    fs.writeFileSync(__dirname + "/data/blacklist.json", JSON.stringify(data));
                }
            } else if (message.startsWith("!pardon ") && args.length >= 2) {
                const name = args[1];
                const file = fs.readFileSync(__dirname + "/data/blacklist.json");
                const data = JSON.parse(file.toString());
                const blacklist = data.blacklist;
                const index = blacklist.indexOf(name.toLowerCase());
                if (index > -1) {
                    blacklist.splice(index, 1);
                    data.blacklist = blacklist;
                    fs.writeFileSync(__dirname + "/data/blacklist.json", JSON.stringify(data));
                }
            }
        }

        const regex = /(PepoG|NOTED)/g;
        if (regex.test(message)) {
            if (message.replace(regex, "").trim().length > 5) {
                const blacklistFile = fs.readFileSync(__dirname + "/data/blacklist.json");
                const blacklistData = JSON.parse(blacklistFile.toString());
                const blacklist = blacklistData.blacklist;

                if (blacklist.includes(user.toLowerCase())) {
                    return;
                }

            const file = fs.readFileSync(__dirname + "/data/data.json");
            const data = JSON.parse(file.toString());
            const date = new Date(Date.now());
            data.push({
                "user": user,
                "timestamp": date,
                "note": message as string
            });
            fs.writeFileSync(__dirname + "/data/data.json", JSON.stringify(data));
        } else {
            client.say(channel, `PepoRage ${user}`);
                const file = fs.readFileSync(__dirname + "/data/data.json");
                const data = JSON.parse(file.toString());
                const date = new Date(Date.now());
                data.push({
                    "user": user,
                    "timestamp": date,
                    "note": message as string
                });
                fs.writeFileSync(__dirname + "/data/data.json", JSON.stringify(data));
            } else {
                client.say(channel, `PepoRage ${user}`);
            }
        }
    }

    if (message.trim() === "!note" && lastUsed + 120 * 1000 <= Date.now()) {
        const file = fs.readFileSync(__dirname + "/data/data.json");
        const data = JSON.parse(file.toString());
        const object = data[Math.floor(Math.random() * data.length)];
        const date = new Date(object.timestamp);
        client.say(channel, `${object.user} hat sich am ${n(date.getDate())}.${n(date.getMonth() + 1)}.${date.getFullYear()} folgendes notiert: ${object.note.replace("PepoG", "").replace("NOTED", "")}`);

        lastUsed = Date.now();
    }
});

function n(n: number) {
    return n > 9 ? "" + n : "0" + n;
}
