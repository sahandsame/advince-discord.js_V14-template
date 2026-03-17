import { BotClient } from "@/base/Client";
import { ApplicationCommandDataResolvable, REST, Routes } from "discord.js";

export default class RegisterCommands {
    private previousHash = new Map<string, string>();

    constructor() {}

    async setUp(client: BotClient) {
        await this.registerCommands(client);
    }

    private getCommandsData(client: BotClient) {
        const commandsData: ApplicationCommandDataResolvable[] = [];
        for (const [, command] of client.handler.commands.collection) {
            if (command.data.enable && command.data.applicationCommandData) {
                commandsData.push(command.data.applicationCommandData);
            }
        }
        return commandsData;
    }

    private hashCommand(cmd: ApplicationCommandDataResolvable): string {
        return JSON.stringify(cmd);
    }

    private async registerCommands(client: BotClient) {
        const commandsData = this.getCommandsData(client);
        if (commandsData.length === 0) return;

        // Fetch existing commands from Discord so we can compare
        await client.application?.commands.fetch();

        const currentHash = new Map<string, string>();
        const changed: ApplicationCommandDataResolvable[] = [];

        for (const cmd of commandsData) {
            const name = (cmd as any).name as string;
            const hash = this.hashCommand(cmd);
            currentHash.set(name, hash);

            if (this.previousHash.get(name) !== hash) {
                changed.push(cmd);
            }
        }

        // Detect removed commands
        const removed = [...this.previousHash.keys()].filter(n => !currentHash.has(n));

        if (changed.length === 0 && removed.length === 0) {
            console.log("[registerCommands] No command changes detected, skipping.");
            return;
        }

        // If any commands were removed we need a full set to remove them from Discord
        if (removed.length > 0) {
            console.log(`[registerCommands] Removed commands: ${removed.join(", ")}. Re-registering all.`);
            await client.application?.commands.set(commandsData);
        } else {
            // Only patch the changed commands individually
            const rest = new REST().setToken(process.env.Discord_Bot_Token!);
            const appId = client.application?.id;
            if (!appId) return;

            for (const cmd of changed) {
                const name = (cmd as any).name;
                // Check if command already exists on Discord
                const existing = client.application?.commands.cache.find(c => c.name === name);
                if (existing) {
                    await rest.patch(Routes.applicationCommand(appId, existing.id), { body: cmd });
                    console.log(`[registerCommands] Updated: ${name}`);
                } else {
                    await rest.post(Routes.applicationCommands(appId), { body: cmd });
                    console.log(`[registerCommands] Created: ${name}`);
                }
            }
        }

        this.previousHash = currentHash;
    }

    async cleanup() {}
}