const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
    .setName('drill')
    .setDescription('View drill stats and information')
    .addStringOption(option =>
      option.setName('drill')
        .setDescription('Select the drill you want to view')
        .setRequired(true)
        .addChoices(
          ...drills.map(drill => ({ name: drill.name, value: drill.name }))
        )),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const drillName = interaction.options.getString('drill');
    const drill = drills.find(d => d.name === drillName);
    
    if (!drill) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ Drill Not Found')
        .setDescription('The selected drill does not exist.')
        .setFooter({ text: 'U.E.O | Drill Information' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const embed = createDrillEmbed(drill);
    await interaction.editReply({ embeds: [embed] });
  }
};

function createDrillEmbed(drill) {
  const costPer100 = drill.cost * 100;
  const gasPer100 = drill.oilPerSec * 100;
  const costPer1000 = drill.cost * 1000;
  const gasPer1000 = drill.oilPerSec * 1000;
  
  const roiPerSecond = (drill.oilPerSec * 3) / drill.cost * 100;
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${drill.name}`)
    .setDescription(`**Stats & Information**`)
    .addFields(
      { name: '⛽ Gas per Second', value: `\`${formatNumber(drill.oilPerSec)}/s\``, inline: true },
      { name: '💰 Cost', value: `\`$${formatNumber(drill.cost)}\``, inline: true },
      { name: '📊 Cost per 100', value: `\`$${formatNumber(costPer100)}\` (${formatNumber(gasPer100)} gas/s)`, inline: false },
      { name: '📊 Cost per 1,000', value: `\`$${formatNumber(costPer1000)}\` (${formatNumber(gasPer1000)} gas/s)`, inline: false },
      { name: '⚡ Efficiency', value: `\`${roiPerSecond.toFixed(2)}% ROI per second\``, inline: true },
      { name: '💎 Tier', value: `\`${getDrillTier(drill)}\``, inline: true }
    )
    .setFooter({ text: 'U.E.O | Drill Information' })
    .setTimestamp();
  
  return embed;
}

function getDrillTier(drill) {
  if (drill.cost < 10000) return 'Tier 1 - Starter';
  if (drill.cost < 100000) return 'Tier 2 - Basic';
  if (drill.cost < 1000000) return 'Tier 3 - Advanced';
  if (drill.cost < 10000000) return 'Tier 4 - Industrial';
  if (drill.cost < 100000000) return 'Tier 5 - Massive';
  if (drill.cost < 1000000000) return 'Tier 6 - Mega';
  if (drill.cost < 10000000000) return 'Tier 7 - Ultra';
  if (drill.cost < 100000000000) return 'Tier 8 - Extreme';
  return 'Tier 9 - Legendary';
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