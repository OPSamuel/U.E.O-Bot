const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Calculate gas sell price')
    .addStringOption(option =>
      option.setName('gas')
        .setDescription('Amount of gas (e.g., 100K, 1M, 1B, 1T, or 100000)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('price')
        .setDescription('Gas price per unit ($1 - $15)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(15)),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const gasInput = interaction.options.getString('gas');
    const price = interaction.options.getInteger('price');
    
    const profile = await db.getProfile(interaction.user.id);
    const boost = profile?.cash_boost || 100;
    const boostSource = profile?.cash_boost ? '(from profile)' : '(default: 100%)';
    
    const gasAmount = parseNumber(gasInput);
    
    if (gasAmount === null) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ Invalid Gas Amount')
        .setDescription('Please use formats like: 100K, 1M, 1B, 1T, or a number like 100000')
        .setFooter({ text: 'U.E.O | Sell Price Calculator' });
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const basePrice = gasAmount * price;
    const extraBoostPercent = boost - 100;
    const bonus = basePrice * (extraBoostPercent / 100);
    const finalTotal = basePrice + bonus;
    
    const formattedGas = formatNumber(gasAmount);
    const formattedBase = formatNumber(basePrice);
    const formattedBonus = formatNumber(bonus);
    const formattedFinal = formatNumber(finalTotal);
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('💰 Sell Calculator')
      .addFields(
        { name: '⛽ Gas', value: `\`${formattedGas}\``, inline: true },
        { name: '💰 Price per Unit', value: `\`$${price}\``, inline: true },
        { name: '📊 Boost', value: `\`${boost}% ${boostSource}\``, inline: true },
        { name: '💵 Base Price', value: `\`$${formattedBase}\``, inline: false },
        { name: '✨ Bonus', value: `\`+$${formattedBonus}\``, inline: true },
        { name: '🏆 Final Total', value: `\`$${formattedFinal}\``, inline: true }
      )
      .setFooter({ text: 'U.E.O | Sell Price Calculator | Use /profile set cash_boost:VALUE' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};

function parseNumber(input) {
  input = input.toString().trim().toUpperCase();
  
  const multipliers = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000,
    'T': 1000000000000
  };
  
  const match = input.match(/^([\d,.]+)([KMBT])?$/);
  
  if (!match) return null;
  
  let numberPart = match[1].replace(/,/g, '');
  const suffix = match[2];
  
  let number = parseFloat(numberPart);
  
  if (isNaN(number)) return null;
  
  if (suffix && multipliers[suffix]) {
    number *= multipliers[suffix];
  }
  
  return number;
}

function formatNumber(num) {
  if (num >= 1000000000000) {
    return (num / 1000000000000).toFixed(2) + 'T';
  }
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}