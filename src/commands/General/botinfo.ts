import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { BotClient } from "@/base/Client";

export default {
    data: {
        name: "botinfo",
        enable: true,
        applicationCommandData: new SlashCommandBuilder()
            .setName("botinfo")
            .setDescription("Shows information about the bot")
    },
    async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
        const uptime = Math.floor((client.uptime ?? 0) / 1000);
        const embed = new EmbedBuilder()
            .setTitle(client.user?.username ?? "Bot")
            .addFields(
                { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
                { name: "Uptime", value: `${uptime}s`, inline: true },
                { name: "Ping", value: `${client.ws.ping}ms`, inline: true }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
}