export default {
    data: {
        name: "ping"
    },
    async execute(interaction: any) {
        await interaction.reply("Pong!");
    }
}