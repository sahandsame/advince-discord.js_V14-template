import { BotClient } from "@/base/Client";
import { Events, Interaction } from "discord.js";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction, client: BotClient) {
        if (interaction.user.bot) return;

        if (interaction.isChatInputCommand()) {
            const command = await client.handler.commands.get(interaction.commandName);
            if (!command) return;
            if (command.data.guildOnly && !interaction.inGuild()) {
                await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
                return;
            }
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[commands] Error executing ${interaction.commandName}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: "There was an error executing this command." });
                } else {
                    await interaction.reply({ content: "There was an error executing this command.", ephemeral: true });
                }
            }
        }
    }
}