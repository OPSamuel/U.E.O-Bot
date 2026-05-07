const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('online-production')
    .setDescription('Calculate gas production over time')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Length of time (e.g., 30s, 5m, 2h, 1d)')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const timeInput = interaction.options.getString('time');
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    const allocations = await db.getAreaAllocation(targetUser.id);
    
    let totalBoostedGas = 0;
    const plots = db.plots;
    
    for (const plot of plots) {
      const boostedAmount = allocations ? allocations[`plot${plot.id}`] || 0 : 0;
      totalBoostedGas += boostedAmount;
    }
    
    if (totalBoostedGas === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ No Gas Production Set')
        .setDescription(`${targetUser.username} hasn't set their gas production yet.\nUse \`/area map\` to set your plot production.`)
        .setFooter({ text: 'U.E.O | Production Calculator' });
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const timeInSeconds = parseTime(timeInput);
    
    if (timeInSeconds === null) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ Invalid Time Format')
        .setDescription('Please use formats like: 30s, 5m, 2h, 1d, or combinations like 1h30m')
        .setFooter({ text: 'U.E.O | Production Calculator' });
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const totalGas = totalBoostedGas * timeInSeconds;
    const rateSource = '(from area allocations)';
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏭 ${targetUser.username}'s Production Calculator`)
      .addFields(
        { name: '⚙️ Production Rate', value: `\`${Math.floor(totalBoostedGas).toLocaleString()} gas/sec ${rateSource}\``, inline: true },
        { name: '⏱️ Time Duration', value: `\`${formatTime(timeInSeconds)}\``, inline: true },
        { name: '📦 Total Gas Produced', value: `\`${Math.floor(totalGas).toLocaleString()} gas\``, inline: false }
      )
      .setFooter({ text: 'U.E.O | Production Calculator | Use /area map to set your gas production' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};

function parseTime(input) {
  input = input.toString().toLowerCase().trim();
  
  const timeUnits = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400
  };
  
  let totalSeconds = 0;
  let currentNumber = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (!isNaN(char) || char === '.') {
      currentNumber += char;
    } else if (timeUnits[char]) {
      if (currentNumber === '') return null;
      
      const number = parseFloat(currentNumber);
      if (isNaN(number)) return null;
      
      totalSeconds += number * timeUnits[char];
      currentNumber = '';
    } else {
      return null;
    }
  }
  
  if (currentNumber !== '') return null;
  if (totalSeconds === 0) return null;
  
  return totalSeconds;
}

function formatTime(seconds) {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}