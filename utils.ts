import axios from 'axios';
import * as fs from 'fs';
import {checkMessage} from "./discord";

require('dotenv').config({path: 'twitch.env'});

const note_ids: string[] = [];
const note_ids_by_year = {};

export function addNote(id: string, entry: DataEntry) {
    note_ids.push(id);
    const year = new Date(entry.timestamp).getFullYear().toString();

    if (!note_ids_by_year[year]) {
        note_ids_by_year[year] = [];
    }

    note_ids_by_year[year].push(id);
}

export function getNote(year: number): DataEntry {
    let notes: string[];
    if (!isNaN(year)) {
        notes = note_ids_by_year[year.toString()];
        if (notes === undefined || notes.length === 0) {
            return null;
        }
    } else {
        notes = note_ids;
        if (notes.length === 0) {
            return null;
        }
    }
    const data = loadData();

    if (Object.keys(data).length === 0) {
        return null;
    }

    return data[notes[Math.floor(Math.random() * notes.length)]];
}
async function getTwitchUsernames(userIds: string[] | number[]): Promise<{ [userId: string]: string | null }> {
    const baseUrl = 'https://api.twitch.tv/helix/users';
    const headers = {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${process.env.TWITCH_TOKEN}`,
    };

    const usernames: { [userId: string]: string | null } = {};

    for (const userId of userIds.sort()) {
        const params = {id: userId};

        try {
            const response = await axios.get(baseUrl, {params, headers});

            if (response.status === 200) {
                const data = response.data;
                if (data.data && data.data.length > 0) {
                    usernames[userId] = data.data[0].display_name;
                } else {
                    usernames[userId] = null;
                }
            } else {
                usernames[userId] = null;
            }
        } catch (error) {
            console.error(`Error fetching user data for user ID ${userId}:`, error.message);
            console.log(JSON.stringify(error));
            usernames[userId] = null;
        }
    }

    return usernames;
}

export async function updateJsonFile(userIds: string[] | number[]): Promise<void> {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/user_ids.json');
    const data = JSON.parse(buf.toString());
    let lastUpdate = data["updated_on"];
    if (lastUpdate && Object.keys(data).length - 1 === userIds.length) {
        const date = new Date(lastUpdate);
        // check if last updated over a week ago
        if (!((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) > 7)) {
            console.log('Last update is less than one week ago, skip updating usernames.');
            return;
        }
    }

    try {
        const usernames = await getTwitchUsernames(userIds);
        const sortedUserIds = Object.keys(usernames).sort();
        const sortedUsernames: { [userId: string]: string | null } = {};
        sortedUsernames["updated_on"] = new Date().toISOString();
        for (const userId of sortedUserIds) {
            sortedUsernames[userId] = usernames[userId];
        }

        // Write the sorted usernames to a JSON file
        fs.writeFileSync(__dirname + '/data/user_ids.json', JSON.stringify(sortedUsernames, null, 2));

        console.log('user_ids.json file has been updated.');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

function getApprovalData() {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/waiting_for_approval.json');
    return JSON.parse(buf.toString());
}

function setApprovalData(data) {
    fs.writeFileSync(__dirname + '/data/waiting_for_approval.json', JSON.stringify(data));
}

export async function checkApprovals() {
    const approvalData = getApprovalData();
    for (const msgId in approvalData) {
        await checkMessage(msgId);
    }
}

export function waitingForApproval(id: string, uuid: string) {
    const data = getApprovalData();
    data[id] = uuid;
    setApprovalData(data);
}

export function isWaitingForApproval(uuid: string) {
    const data = getApprovalData();
    for (const msgId in data) {
        if (data[msgId] == uuid) {
            return true;
        }
    }

    return false;
}

export function approve(id: string, emote: string) {
    const approvalData = getApprovalData();
    const data = loadData();
    let entry = data[approvalData[id]];
    entry['enabled'] = emote === '✅';
    delete approvalData[id];
    addNote(id, entry);
    saveData(data);
    setApprovalData(approvalData);
}

export function loadData(): Data {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/data.json');
    return JSON.parse(buf.toString());
}

export function saveData(data) {
    fs.writeFileSync(__dirname + '/data/data.json', JSON.stringify(data));
}

export function loadBlacklist() {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/blacklist.json');
    return JSON.parse(buf.toString());
}

export function saveBlacklist(data) {
    fs.writeFileSync(__dirname + '/data/blacklist.json', JSON.stringify(data));
}

export function username(id: number | string, fallback?: string): string {
    const buf: Buffer = fs.readFileSync(__dirname + '/data/user_ids.json');
    const name = JSON.parse(buf.toString())[id.toString()];
    return name ? name : fallback;
}

export function n(n: number) {
    return n > 9 ? "" + n : "0" + n;
}

export type Data = Record<string, DataEntry>;

export interface DataEntry {
    user: string;
    user_id: number;
    timestamp: string;
    note: string;
    enabled?: boolean;
}