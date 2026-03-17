// add functions to discord Interaction and Message classes
import { BaseInteraction, ChatInputCommandInteraction, Message } from "discord.js";

declare module "discord.js" {
    export interface BaseInteraction {
        Error: (content: string) => Promise<void>;
    }
    export interface Message {
        Error: (content: string) => Promise<void>;
    }
}

export default class Extender {
    constructor() {

    }

    async setUp() {
        await this.extendInteraction();
        await this.extendMessage();
    }

    private async extendInteraction() {
        BaseInteraction.prototype.Error = async function (Options: InteractionErrorOption | string) {
            const { content:msg, log } = typeof Options === "string" ? { content: Options, log: true } : Options;
            // if reply or deferReply has already been called, use editReply instead of reply to avoid interaction failed errors
            if ((this as ChatInputCommandInteraction).replied || (this as ChatInputCommandInteraction).deferred) {
                await (this as ChatInputCommandInteraction).editReply({
                    content: `❌ ${msg}`
                });
            } else {
                await (this as ChatInputCommandInteraction).reply({
                    content: `❌ ${msg}`,
                    ephemeral: true
                });
            }
            if (log) console.error(msg);
        }
    }

    private async extendMessage() {
        Message.prototype.Error = async function (Options: MessageErrorOption | string) {
            const { content:msg, log } = typeof Options === "string" ? { content: Options, log: true } : Options;
            await this.reply({
                content: `❌  ${msg}`
            });
            if (log) console.error(msg);
        }
    }
}