import * as tmi from 'tmi.js';
import * as fs from "fs";
import * as uuid from "uuid";

require('dotenv').config({path: 'twitch.env'});

let lastUsed: number = 1337
const twitchChannel: string = `#${process.env.CHANNEL.toLowerCase()}`;

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

const data: DataEntry[] = loadData("data.json")
const ids: string[] = [];
for (const entry of data) {
    if (entry.enabled) {
        ids.push(entry.id);
    } else if (entry.enabled === undefined) {
        // todo send to discord to approve
    }
}

client.connect().catch(console.error);

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    // check the bots custom commands
    if (channel === twitchChannel) {
        const user: string = tags["display-name"];
        if (user.toLowerCase() === "melanx") {
            const args: string[] = message.split(" ");
            if (message.startsWith("!blacklist ") && args.length >= 2) {
                const name = args[1];
                const data = loadData("blacklist.json");
                const blacklist = data.blacklist;
                if (!blacklist.includes(name.toLowerCase())) {
                    blacklist.push(name.toLowerCase());
                    data.blacklist = blacklist;
                    fs.writeFileSync(__dirname + "/data/blacklist.json", JSON.stringify(data));
                }
            } else if (message.startsWith("!pardon ") && args.length >= 2) {
                const name = args[1];
                const data = loadData("blacklist.json");
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
            if (message.replace(regex, "").trim() == "") {
                const blacklistData = loadData("blacklist.json");
                const blacklist = blacklistData.blacklist;

                if (blacklist.includes(user.toLowerCase())) {
                    return;
                }

                const data: DataEntry[] = loadData("data.json");
                const date = new Date(Date.now());
                data.push({
                    "id": uuid.v4(),
                    "user": user,
                    "timestamp": date.toString(),
                    "note": message as string
                });
                fs.writeFileSync(__dirname + "/data/data.json", JSON.stringify(data));
            } else {
                client.say(channel, `PepoRage ${user}`);
            }
        }
    }

    if (message.trim() === "!note" && lastUsed + 120 * 1000 <= Date.now()) {
        const data = loadData("data.json");
        const object = data[Math.floor(Math.random() * data.length)];
        const date = new Date(object.timestamp);
        // client.say(channel, `${object.user} hat sich am ${n(date.getDate())}.${n(date.getMonth() + 1)}.${date.getFullYear()} folgendes notiert: ${object.note.replace("PepoG", "").replace("NOTED", "")}`);
        client.say(channel, 'Die Notes wurden eingestellt, trotzdem danke für dein Interesse :)');

        lastUsed = Date.now();
    }
});

function loadData(file: string) {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/' + file);
    return JSON.parse(buf.toString())
}

function n(n: number) {
    return n > 9 ? "" + n : "0" + n;
}

interface DataEntry {
    id: string
    user: string
    timestamp: string
    note: string
    enabled?: boolean
}
