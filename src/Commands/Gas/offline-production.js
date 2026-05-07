const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('offline-production')
    .setDescription('Calculate offline gas production')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Length of time offline (e.g., 30m, 2h, 1d, 12h30m)')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const timeInput = interaction.options.getString('time');
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    const profile = await db.getProfile(targetUser.id);
    const allocations = await db.getAreaAllocation(targetUser.id);
    
    let totalBaseGas = 0;
    const plots = db.plots;
    
    for (const plot of plots) {
      const boostedAmount = allocations ? allocations[`plot${plot.id}`] || 0 : 0;
      const baseAmount = boostedAmount / plot.multiplier;
      totalBaseGas += baseAmount;
    }
    
    if (totalBaseGas === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ No Gas Production Set')
        .setDescription(`${targetUser.username} hasn't set their gas production yet.\nUse \`/area map\` to set your plot production.`)
        .setFooter({ text: 'U.E.O | Offline Production Calculator' });
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const timeInHours = parseTimeToHours(timeInput);
    
    if (timeInHours === null) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ Invalid Time Format')
        .setDescription('Please use formats like: 30m, 2h, 1d, 12h30m, or combinations')
        .setFooter({ text: 'U.E.O | Offline Production Calculator' });
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const offlineBoost = profile?.offline_gas_boost || 100;
    const boostSource = profile?.offline_gas_boost ? '(from profile)' : '(default: 100%)';
    const gasSource = '(base gas/s from area allocations)';
    
    const baseOfflinePerHour = totalBaseGas * 36;
    const boostedOfflinePerHour = baseOfflinePerHour * (offlineBoost / 100);
    const totalGas = boostedOfflinePerHour * timeInHours;
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`⏸️ ${targetUser.username}'s Offline Gas Production`)
      .setDescription(`**Time Offline:** \`${formatTimeHours(timeInHours)}\``)
      .addFields(
        { name: '⛽ Base Gas/s', value: `\`${Math.floor(totalBaseGas).toLocaleString()} gas/s ${gasSource}\``, inline: true },
        { name: '📊 Offline Boost', value: `\`${offlineBoost}% ${boostSource}\``, inline: true },
        { name: '📦 Base Offline/Hour', value: `\`${Math.floor(baseOfflinePerHour).toLocaleString()} gas/hour\``, inline: true },
        { name: '✨ Boosted Offline/Hour', value: `\`${Math.floor(boostedOfflinePerHour).toLocaleString()} gas/hour\``, inline: true },
        { name: '💰 Total Gas Earned', value: `\`${Math.floor(totalGas).toLocaleString()} gas\``, inline: true }
      )
      .setFooter({ text: 'Formula: Base Gas/s × 36 × (Boost% ÷ 100) × Hours' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};

function parseTimeToHours(input) {
  input = input.toString().toLowerCase().trim();
  
  const timeUnits = {
    'm': 1 / 60,
    'h': 1,
    'd': 24
  };
  
  let totalHours = 0;
  let currentNumber = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (!isNaN(char) || char === '.') {
      currentNumber += char;
    } else if (timeUnits[char]) {
      if (currentNumber === '') return null;
      
      const number = parseFloat(currentNumber);
      if (isNaN(number)) return null;
      
      totalHours += number * timeUnits[char];
      currentNumber = '';
    } else {
      return null;
    }
  }
  
  if (currentNumber !== '') return null;
  if (totalHours === 0) return null;
  
  return totalHours;
}

function formatTimeHours(hours) {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const minutes = (remainingHours % 1) * 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours >= 1) parts.push(`${Math.floor(remainingHours)}h`);
  if (minutes > 0) parts.push(`${Math.floor(minutes)}m`);
  
  if (parts.length === 0 && hours > 0) parts.push(`${hours}h`);
  
  return parts.join(' ');
}