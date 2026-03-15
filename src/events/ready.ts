import { Events } from "discord.js";

// let heartbeat: NodeJS.Timeout | null = null;

export default {
    name: Events.ClientReady,
    once: false,
    execute(client: any) {
        // if (heartbeat) {
        //     clearInterval(heartbeat);
        // }

        // heartbeat = setInterval(() => {
        //     console.log(`Logged in as ${client.user.tag}...`);
        // }, 2000);

        // // Optional runtime cleanup return; handler also calls module cleanup on unload.
        // return () => {
        //     if (heartbeat) {
        //         clearInterval(heartbeat);
        //         heartbeat = null;
        //     }
        // };
    },
    cleanup() {
        // if (heartbeat) {
        //     clearInterval(heartbeat);
        //     heartbeat = null;
        // }
    }
};
