const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

const drills = [
  { name: 'Basic Drill', oilPerSec: 1, cost: 500 },
  { name: 'Strong Drill', oilPerSec: 3, cost: 1800 },
  { name: 'Enhanced Drill', oilPerSec: 4, cost: 3600 },
  { name: 'Speed Drill', oilPerSec: 6, cost: 7200 },
  { name: 'Reinforced Drill', oilPerSec: 8, cost: 12000 },
  { name: 'Industrial Drill', oilPerSec: 10, cost: 20000 },
  { name: 'Double Industrial Drill', oilPerSec: 12, cost: 30000 },
  { name: 'Turbo Drill', oilPerSec: 16, cost: 80000 },
  { name: 'Mega Drill', oilPerSec: 20, cost: 140000 },
  { name: 'Mega Emerald Drill', oilPerSec: 25, cost: 400000 },
  { name: 'Hell Drill', oilPerSec: 35, cost: 1225000 },
  { name: 'Plasma Drill', oilPerSec: 50, cost: 4500000 },
  { name: 'Huge Long Drill', oilPerSec: 220, cost: 40000000 },
  { name: 'Mega Plasma Drill', oilPerSec: 275, cost: 95000000 },
  { name: 'Multi Drill', oilPerSec: 350, cost: 280000000 },
  { name: 'Lava Drill', oilPerSec: 600, cost: 900000000 },
  { name: 'Ice Plasma Drill', oilPerSec: 800, cost: 2400000000 },
  { name: 'Crystal Drill', oilPerSec: 1500, cost: 9000000000 },
  { name: 'Diamond Drill', oilPerSec: 2750, cost: 27500000000 },
  { name: 'Ruby Drill', oilPerSec: 4500, cost: 85500000000 },
  { name: 'Fusion Drill', oilPerSec: 7500, cost: 187500000000 },
  { name: 'Uranium Drill', oilPerSec: 12500, cost: 437500000000 },
  { name: 'Radium Drill', oilPerSec: 18000, cost: 810000000000 },
  { name: 'Palladium Drill', oilPerSec: 25000, cost: 1200000000000 }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('drillafford')
    .setDescription('Calculate how long until you can afford a drill')
    .addStringOption(option =>
      option.setName('drill')
        .setDescription('Select the drill you want to buy')
        .setRequired(true)
        .addChoices(
          ...drills.map(drill => ({ name: drill.name, value: drill.name }))
        ))
    .addStringOption(option =>
      option.setName('cash')
        .setDescription('Your current cash (e.g., 100K, 1M, 1.5B, 1T)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('price')
        .setDescription('Gas price per unit ($1 - $15)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(15))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of drills you want to buy')
        .setRequired(true)
        .setMinValue(1)),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const drillName = interaction.options.getString('drill');
    const cashInput = interaction.options.getString('cash');
    const price = interaction.options.getInteger('price');
    const amount = interaction.options.getInteger('amount');
    
    const profile = await db.getProfile(interaction.user.id);
    const allocations = await db.getAreaAllocation(interaction.user.id);
    
    const drill = drills.find(d => d.name === drillName);
    const cash = parseNumber(cashInput);
    
    let totalBoostedGas = 0;
    const plots = db.plots;
    
    for (const plot of plots) {
      const boostedAmount = allocations ? allocations[`plot${plot.id}`] || 0 : 0;
      totalBoostedGas += boostedAmount;
    }
    
    const boost = profile?.cash_boost || 100;
    const boostSource = profile?.cash_boost ? '(from profile)' : '(default: 100%)';
    const gasSource = totalBoostedGas > 0 ? '(from area allocations)' : '(not set)';
    
    if (cash === null) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ Invalid Cash Format')
        .setDescription('Please use formats like: 100K, 1M, 1.5B, 1T, or 1,000,000')
        .setFooter({ text: 'U.E.O | Drill Affordability Calculator' });
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    if (totalBoostedGas === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ No Gas Production Set')
        .setDescription('You haven\'t set your gas production yet.\nUse `/area map` to set your plot production first.')
        .setFooter({ text: 'U.E.O | Drill Affordability Calculator' });
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const extraBoostPercent = boost - 100;
    const sellMultiplier = 1 + (extraBoostPercent / 100);
    const incomePerSecond = totalBoostedGas * price * sellMultiplier;
    
    const totalCost = drill.cost * amount;
    const costRemaining = totalCost - cash;
    
    if (costRemaining <= 0) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`🛢️ ${drill.name} x${amount.toLocaleString()}`)
        .setDescription('✅ You can already afford this purchase!')
        .addFields(
          { name: '💰 Total Cost', value: `\`$${formatNumber(totalCost)}\``, inline: true },
          { name: '💵 Your Cash', value: `\`$${formatNumber(cash)}\``, inline: true },
          { name: '⚙️ Per Drill', value: `\`${formatNumber(drill.oilPerSec)} gas/s | $${formatNumber(drill.cost)}\``, inline: false },
          { name: '📊 Total Gas/s Added', value: `\`+${formatNumber(drill.oilPerSec * amount)}\``, inline: true }
        )
        .setFooter({ text: 'U.E.O | Drill Affordability Calculator' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    const secondsNeeded = costRemaining / incomePerSecond;
    const timeString = formatTime(secondsNeeded);
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🛢️ ${drill.name} x${amount.toLocaleString()}`)
      .setDescription(`Time until you can afford this purchase`)
      .addFields(
        { name: '💰 Total Cost', value: `\`$${formatNumber(totalCost)}\``, inline: true },
        { name: '💵 Your Cash', value: `\`$${formatNumber(cash)}\``, inline: true },
        { name: '📉 Cash Needed', value: `\`$${formatNumber(costRemaining)}\``, inline: true },
        { name: '⛽ Your Gas/s', value: `\`${formatNumber(totalBoostedGas)} gas/s ${gasSource}\``, inline: false },
        { name: '💰 Gas Price', value: `\`$${price}\``, inline: true },
        { name: '📊 Cash Boost', value: `\`${boost}% ${boostSource}\``, inline: true },
        { name: '💵 Income Rate', value: `\`$${formatNumber(incomePerSecond)}/s\``, inline: true },
        { name: '⏱️ Time Needed', value: `\`${timeString}\``, inline: true },
        { name: '⚙️ Per Drill', value: `\`${formatNumber(drill.oilPerSec)} gas/s | $${formatNumber(drill.cost)}\``, inline: false },
        { name: '📊 Total Gas/s Added', value: `\`+${formatNumber(drill.oilPerSec * amount)}\``, inline: true }
      )
      .setFooter({ text: 'U.E.O | Drill Affordability Calculator' })
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

function formatTime(seconds) {
  const years = Math.floor(seconds / 31536000);
  seconds %= 31536000;
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}