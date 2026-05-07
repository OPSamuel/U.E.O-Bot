const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gas')
    .setDescription('Calculate your total gas production from all plots')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const allocations = await db.getAreaAllocation(targetUser.id);
    const plots = db.plots;
    
    let totalBoosted = 0;
    let totalBase = 0;
    let breakdownText = '';
    
    const sortedPlots = [...plots].sort((a, b) => a.id - b.id);
    
    for (const plot of sortedPlots) {
      const boostedAmount = allocations ? allocations[`plot${plot.id}`] || 0 : 0;
      totalBoosted += boostedAmount;
      
      const baseAmount = boostedAmount / plot.multiplier;
      totalBase += baseAmount;
      
      if (boostedAmount > 0) {
        let multiplierDisplay = '';
        if (plot.multiplier === 5) multiplierDisplay = '⭐ x5';
        else if (plot.multiplier === 3) multiplierDisplay = '🌟 x3';
        else if (plot.multiplier === 2) multiplierDisplay = '✨ x2';
        else multiplierDisplay = '⬜ x1';
        
        breakdownText += `**Plot ${plot.id}** ${multiplierDisplay}: ${Math.floor(boostedAmount).toLocaleString()} gas/s (base: ${Math.floor(baseAmount).toLocaleString()})\n`;
      }
    }
    
    if (breakdownText === '') {
      breakdownText = 'No gas production set. Use `/area map` to set your production.';
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`⛽ ${targetUser.username}'s Gas Production`)
      .setDescription(breakdownText)
      .addFields(
        { name: '📊 Total Boosted Gas/s', value: `\`${Math.floor(totalBoosted).toLocaleString()} gas/s\``, inline: true },
        { name: '🔧 Total Base Gas/s', value: `\`${Math.floor(totalBase).toLocaleString()} gas/s\``, inline: true },
        { name: '🔄 Boosted Per Minute', value: `\`${Math.floor(totalBoosted * 60).toLocaleString()} gas/min\``, inline: true },
        { name: '⏰ Boosted Per Hour', value: `\`${Math.floor(totalBoosted * 3600).toLocaleString()} gas/hour\``, inline: true }
      )
      .setFooter({ text: 'Base = Boosted ÷ Multiplier' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};