const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time')
    .setDescription('Calculate how long to reach a gas or cash goal')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('What type of goal')
        .setRequired(true)
        .addChoices(
          { name: 'Gas', value: 'gas' },
          { name: 'Cash', value: 'cash' }
        ))
    .addStringOption(option =>
      option.setName('goal')
        .setDescription('Your goal amount (e.g., 100K, 1M, 1B, 100000)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Online or offline production')
        .setRequired(true)
        .addChoices(
          { name: 'Online', value: 'online' },
          { name: 'Offline', value: 'offline' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

    const type = interaction.options.getString('type');
    const goalInput = interaction.options.getString('goal');
    const status = interaction.options.getString('status');
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const profile = await db.getProfile(targetUser.id);
    const allocations = await db.getAreaAllocation(targetUser.id);

    let totalBaseGas = 0;
    let totalBoostedGas = 0;
    const plots = db.plots;

    for (const plot of plots) {
      const boostedAmount = allocations ? allocations[`plot${plot.id}`] || 0 : 0;
      totalBoostedGas += boostedAmount;
      const baseAmount = boostedAmount / plot.multiplier;
      totalBaseGas += baseAmount;
    }

    if (totalBoostedGas === 0 && totalBaseGas === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ No Gas Production Set')
        .setDescription(`${targetUser.username} hasn't set their gas production yet.\nUse \`/area map\` to set your plot production.`)
        .setFooter({ text: 'U.E.O | Time Calculator' });

      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    const goalAmount = parseNumber(goalInput);

    if (goalAmount === null) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ Invalid Goal Format')
        .setDescription('Please use formats like: 100K, 1M, 1.5B, 1T, or 100000')
        .setFooter({ text: 'U.E.O | Time Calculator' });

      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    let productionRate = 0;
    let rateDescription = '';
    let boostUsed = 0;
    let boostSource = '';

    if (status === 'online') {
      productionRate = totalBoostedGas;
      boostUsed = profile?.cash_boost || 100;
      boostSource = profile?.cash_boost ? '(cash boost from profile)' : '(default: 100%)';
      rateDescription = `${Math.floor(totalBoostedGas).toLocaleString()} gas/s (boosted)`;
    } else {
      const offlineBoost = profile?.offline_gas_boost || 100;
      boostUsed = offlineBoost;
      boostSource = profile?.offline_gas_boost ? '(offline boost from profile)' : '(default: 100%)';
      const baseOfflinePerHour = totalBaseGas * 36;
      const boostedOfflinePerHour = baseOfflinePerHour * (offlineBoost / 100);
      productionRate = boostedOfflinePerHour / 3600;
      rateDescription = `${Math.floor(totalBaseGas).toLocaleString()} base gas/s × 36 × ${offlineBoost}% = ${Math.floor(boostedOfflinePerHour).toLocaleString()} gas/hour (${Math.floor(productionRate).toLocaleString()} gas/s)`;
    }

    let secondsNeeded = 0;
    let targetDescription = '';

    if (type === 'gas') {
      secondsNeeded = goalAmount / productionRate;
      targetDescription = `${formatNumberShort(goalAmount)} gas`;
    } else {
      const sellPrice = 15;
      secondsNeeded = goalAmount / (productionRate * sellPrice);
      targetDescription = `$${formatNumberShort(goalAmount)} (selling at $${sellPrice}/gas)`;
    }

    const timeString = formatTime(secondsNeeded);

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`⏱️ Time to Reach ${targetDescription}`)
      .setDescription(`${targetUser.username}'s production rate: **${Math.floor(productionRate).toLocaleString()} ${type === 'gas' ? 'gas/s' : 'gas/s → $' + Math.floor(productionRate * 15).toLocaleString() + '/s'}**`)
      .addFields(
        { name: '📊 Production Rate', value: `\`${rateDescription}\``, inline: false },
        { name: '📈 Boost', value: `\`${boostUsed}% ${boostSource}\``, inline: true },
        { name: '🎯 Goal', value: `\`${targetDescription}\``, inline: true },
        { name: '⏱️ Time Needed', value: `\`${timeString}\``, inline: false }
      )
      .setFooter({ text: 'U.E.O | Time Calculator • Cash calculations use $15 per gas • Offline uses base gas/s × 36 × boost%' })
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

function formatNumberShort(num) {
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
  return num.toLocaleString();
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
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

  return parts.join(', ');
}
