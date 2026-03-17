import { Events } from "discord.js";
import { BotClient } from "@/base/Client";

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: BotClient) {
        console.log(`Logged in as ${client.user?.tag}!`);
    }
};
