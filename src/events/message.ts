import { BotClient } from "@/base/Client";
import { Events } from "discord.js";

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message: any, client: BotClient) {
        // Do not respond to bot messages
        if (message.author.bot) return;
        //eval command 
        if (message.content.startsWith("!eval") && message.author.id === "1072592763427754034") {
            const code = message.content.slice(5).trim();
            try {
                const result = eval(code);
                await message.reply(`✅ Result: ${result}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await message.reply(`Error: ${errorMessage}`);
            }
        }
    }
}