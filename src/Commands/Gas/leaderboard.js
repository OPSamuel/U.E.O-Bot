const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View leaderboard by gas production')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of production to rank by')
        .setRequired(true)
        .addChoices(
          { name: 'Online Gas', value: 'online' },
          { name: 'Offline Gas', value: 'offline' }
        )),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const type = interaction.options.getString('type');
    
    const allProfiles = await db.getAllProfiles();
    const leaderboardData = [];
    
    for (const profile of allProfiles) {
      const allocations = await db.getAreaAllocation(profile.userId);
      
      let totalBoostedGas = 0;
      let totalBaseGas = 0;
      const plots = db.plots;
      
      for (const plot of plots) {
        const boostedAmount = allocations ? allocations[`plot${plot.id}`] || 0 : 0;
        totalBoostedGas += boostedAmount;
        const baseAmount = boostedAmount / plot.multiplier;
        totalBaseGas += baseAmount;
      }
      
      if (totalBoostedGas === 0) continue;
      
      let score = 0;
      if (type === 'online') {
        score = totalBoostedGas;
      } else if (type === 'offline') {
        const offlineBoost = profile.offline_gas_boost || 100;
        score = totalBaseGas * 36 * (offlineBoost / 100);
      }
      
      leaderboardData.push({
        userId: profile.userId,
        username: profile.username,
        score: score,
        totalBoostedGas: totalBoostedGas,
        totalBaseGas: totalBaseGas,
        offlineBoost: profile.offline_gas_boost || 100
      });
    }
    
    leaderboardData.sort((a, b) => b.score - a.score);
    
    const topUsers = leaderboardData.slice(0, 10);
    
    if (topUsers.length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ No Data Available')
        .setDescription('No users have set their gas production yet.\nUse `/area map` to set your plot production.')
        .setFooter({ text: 'U.E.O | Leaderboard' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    let leaderboardText = '';
    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      let displayValue = '';
      
      if (type === 'online') {
        displayValue = `${Math.floor(user.score).toLocaleString()} gas/s`;
      } else {
        displayValue = `${Math.floor(user.score).toLocaleString()} gas/hour`;
      }
      
      let medal = '';
      if (i === 0) medal = '🥇 ';
      else if (i === 1) medal = '🥈 ';
      else if (i === 2) medal = '🥉 ';
      else medal = `${i + 1}. `;
      
      leaderboardText += `${medal}**${user.username}** - \`${displayValue}\`\n`;
    }
    
    let title = '';
    let footerText = '';
    
    if (type === 'online') {
      title = '🏆 Online Gas Production Leaderboard';
      footerText = 'Ranked by Boosted Gas/s from all plots';
    } else {
      title = '⏸️ Offline Gas Production Leaderboard';
      footerText = 'Ranked by Base Gas/s × 36 × (Offline Boost% ÷ 100) per hour';
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(title)
      .setDescription(leaderboardText)
      .setFooter({ text: footerText })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};