import { Handler } from "@/helper/handler";
import { Client, IntentsBitField } from "discord.js";
import { configDotenv } from "dotenv";

export class BotClient extends Client {
    handler: Handler;
    constructor() {
        super({
            intents: [
                IntentsBitField.Flags.Guilds
            ]
        });
        this.handler = new Handler();
    }

    async setUp() {
        configDotenv();
        await this.login(process.env.Disocrd_Bot_Token);
        await this.handler.setUp(this); //setup handlers
        
    }


}

