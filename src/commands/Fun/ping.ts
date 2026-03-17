import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { BotClient } from "@/base/Client";

export default {
    data: {
        name: "ping",
        enable: true,
        applicationCommandData: new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Replies with Pong and the bot latency!")
    },
    async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
        const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong! Latency: **${latency}ms** | API: **${client.ws.ping}ms**`);
    }
}