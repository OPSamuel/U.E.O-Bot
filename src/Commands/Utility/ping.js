const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const sent = await interaction.fetchReply();
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Roundtrip Latency', value: `${latency}ms`, inline: true },
        { name: 'WebSocket Heartbeat', value: `${apiLatency}ms`, inline: true }
      )
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};