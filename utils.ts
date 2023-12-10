import axios from 'axios';
import * as fs from 'fs';

require('dotenv').config({path: 'twitch.env'});

async function getTwitchUsernames(userIds: string[]|number[]): Promise<{ [userId: string]: string | null }> {
    const baseUrl = 'https://api.twitch.tv/helix/users';
    const headers = {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${process.env.TWITCH_TOKEN}`,
    };

    const usernames: { [userId: string]: string | null } = {};

    for (const userId of userIds.sort()) {
        const params = { id: userId };

        try {
            const response = await axios.get(baseUrl, { params, headers });

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

export async function updateJsonFile(userIds: string[]|number[]): Promise<void> {
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
