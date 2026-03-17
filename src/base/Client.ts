import { Handler } from "@/base/Handler";
import { Client, IntentsBitField } from "discord.js";
import { configDotenv } from "dotenv";

export class BotClient extends Client {
    handler: Handler;
    constructor() {
        super({
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.MessageContent,
            ]
        });
        this.handler = new Handler();
    }

    async setUp() {
        configDotenv();
        await this.login(process.env.Discord_Bot_Token);
        await this.handler.setUp(this); //setup handlers
    }


}

