import * as tmi from 'tmi.js';
import * as fs from "fs";
import * as uuid from "uuid";
import {updateJsonFile} from "./utils";

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

const data: Data = loadData();
const note_ids: string[] = [];
const user_ids: number[] = [];
for (const id in data) {
    let entry = data[id];
    if (entry.user_id && !user_ids.includes(entry.user_id)) {
        user_ids.push(entry.user_id);
    }
    if (entry.enabled) {
        note_ids.push(id);
    } else if (entry.enabled === undefined) {
        console.log(entry);
        // todo send to discord to approve
    }
}

// noinspection JSIgnoredPromiseFromCall
updateJsonFile(user_ids);
client.connect().catch(console.error);

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    // check the bots custom commands
    if (channel === twitchChannel) {
        const user: string = tags["display-name"];
        const userId: number = Number.parseInt(tags["user-id"]);
        if (user.toLowerCase() === "melanx") {
            const args: string[] = message.split(" ");
            if (message.startsWith("!blacklist ") && args.length >= 2) {
                const name = args[1];
                const data = loadBlacklist();
                const blacklist = data.blacklist;
                if (!blacklist.includes(name.toLowerCase())) {
                    blacklist.push(name.toLowerCase());
                    data.blacklist = blacklist;
                    fs.writeFileSync(__dirname + "/data/blacklist.json", JSON.stringify(data));
                }
            } else if (message.startsWith("!pardon ") && args.length >= 2) {
                const name = args[1];
                const data = loadBlacklist();
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
            if (message.replace(regex, "").trim() !== "") {
                const blacklistData = loadBlacklist();
                const blacklist = blacklistData.blacklist;

                if (blacklist.includes(user.toLowerCase())) {
                    return;
                }

                const data: Data = loadData();
                data[uuid.v4()] = {
                    "user": user,
                    "user_id": userId,
                    "timestamp": new Date().toISOString(),
                    "note": message as string
                };
                fs.writeFileSync(__dirname + "/data/data.json", JSON.stringify(data));
            } else {
                client.say(channel, `PepoRage ${user}`);
            }
        }
    }

    if (message.trim() === "!note" && lastUsed + 120 * 1000 <= Date.now()) {
        const data = loadData();
        const object = data[note_ids[Math.floor(Math.random() * note_ids.length)]];
        const date = new Date(object.timestamp);
        client.say(channel, `${username(object.user_id, object.user)} hat sich am ${n(date.getDate())}.${n(date.getMonth() + 1)}.${date.getFullYear()} folgendes notiert: ${object.note.replace("PepoG", "").replace("NOTED", "")}`);
        // client.say(channel, 'Die Notes wurden eingestellt, trotzdem danke für dein Interesse :)');

        lastUsed = Date.now();
    }
});

function loadData(): Data {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/data.json');
    return JSON.parse(buf.toString());
}

function loadBlacklist() {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/blacklist.json');
    return JSON.parse(buf.toString());
}

function username(id: number|string, fallback?: string): string {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/user_ids.json');
    const name = JSON.parse(buf.toString())[id.toString()];
    return name ? name : fallback;
}

function n(n: number) {
    return n > 9 ? "" + n : "0" + n;
}

type Data = Record<string, DataEntry>;

interface DataEntry {
    user: string;
    user_id: number;
    timestamp: string;
    note: string;
    enabled?: boolean;
}
