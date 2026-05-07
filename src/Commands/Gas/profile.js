const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View or manage your profile')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your profile')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to view (defaults to yourself)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set your profile stats')
        .addNumberOption(option =>
          option.setName('cash_boost')
            .setDescription('Your cash boost percentage (100-485)')
            .setMinValue(100)
            .setMaxValue(485))
        .addNumberOption(option =>
          option.setName('offline_gas_boost')
            .setDescription('Your offline gas boost percentage (100-1300)')
            .setMinValue(100)
            .setMaxValue(1300))
        .addNumberOption(option =>
          option.setName('gas_per_second')
            .setDescription('Your base gas per second')
            .setMinValue(0)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset your profile to defaults')),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      await viewProfile(interaction, client);
    } else if (subcommand === 'set') {
      await setProfile(interaction, client);
    } else if (subcommand === 'reset') {
      await resetProfile(interaction, client);
    }
  }
};

async function viewProfile(interaction, client) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const profile = await db.getProfile(targetUser.id);
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${targetUser.username}'s Profile`)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: '💰 Cash Boost', value: profile ? `\`${profile.cash_boost}%\`` : '`Not set`', inline: true },
      { name: '⏸️ Offline Gas Boost', value: profile ? `\`${profile.offline_gas_boost}%\`` : '`Not set`', inline: true },
      { name: '⛽ Base Gas/sec', value: profile ? `\`${Math.floor(profile.base_gas_per_second).toLocaleString()} gas/s\`` : '`Not set`', inline: true }
    )
    .setFooter({ text: 'Use /profile set to update your stats' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

async function setProfile(interaction, client) {
  const cashBoost = interaction.options.getNumber('cash_boost');
  const offlineGasBoost = interaction.options.getNumber('offline_gas_boost');
  const gasPerSecond = interaction.options.getNumber('gas_per_second');
  
  const updates = {};
  if (cashBoost !== null) updates.cash_boost = cashBoost;
  if (offlineGasBoost !== null) updates.offline_gas_boost = offlineGasBoost;
  if (gasPerSecond !== null) updates.base_gas_per_second = gasPerSecond;
  
  await db.createOrUpdateProfile(interaction.user.id, interaction.user.username, updates);
  
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Profile Updated')
    .setDescription('Your stats have been saved!')
    .addFields(
      { name: '💰 Cash Boost', value: cashBoost !== null ? `\`${cashBoost}%\`` : '`Unchanged`', inline: true },
      { name: '⏸️ Offline Gas Boost', value: offlineGasBoost !== null ? `\`${offlineGasBoost}%\`` : '`Unchanged`', inline: true },
      { name: '⛽ Gas/sec', value: gasPerSecond !== null ? `\`${Math.floor(gasPerSecond).toLocaleString()} gas/s\`` : '`Unchanged`', inline: true }
    )
    .setFooter({ text: 'Use /profile view to see your stats' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

async function resetProfile(interaction, client) {
  await db.createOrUpdateProfile(interaction.user.id, interaction.user.username, {
    cash_boost: 100,
    offline_gas_boost: 100,
    base_gas_per_second: 0
  });
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🔄 Profile Reset')
    .setDescription('Your profile has been reset to default values.')
    .addFields(
      { name: '💰 Cash Boost', value: '`100%`', inline: true },
      { name: '⏸️ Offline Gas Boost', value: '`100%`', inline: true },
      { name: '⛽ Base Gas/sec', value: '`0 gas/s`', inline: true }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}