const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../Handlers/databaseHandler');

const mapImageUrl = 'https://cdn.discordapp.com/attachments/1501649542054019185/1501977564523139072/image.png?ex=69fe091c&is=69fcb79c&hm=f30faaf5abbff892c09e033c9f32a7344a18ba842c0d7ab01164dcbb77e4fdb5&';

async function showInteractiveMap(interaction) {
  const allocations = await db.getAreaAllocation(interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🗺️ Interactive Gas Field Map')
    .setDescription('Click any plot button below to set your gas production for that area!\n\n**How it works:**\n• Each plot has a multiplier (x1, x2, x3, x5)\n• Enter the amount of gas/s you PRODUCE in that plot (already boosted)\n• The bot will store this as your actual production')
    .setImage(mapImageUrl)
    .setFooter({ text: 'U.E.O | Area Management' })
    .setTimestamp();

  const rows = createPlotButtons(allocations);
  
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: rows });
  } else {
    await interaction.reply({ embeds: [embed], components: rows });
  }
}

async function viewAllocations(interaction) {
  const allocations = await db.getAreaAllocation(interaction.user.id);
  const plots = db.plots;
  
  let totalProduction = 0;
  let allocationText = '';
  
  const sortedPlots = [...plots].sort((a, b) => a.id - b.id);
  
  for (const plot of sortedPlots) {
    const amount = allocations ? allocations[`plot${plot.id}`] || 0 : 0;
    totalProduction += amount;
    
    let multiplierDisplay = '';
    if (plot.multiplier === 5) multiplierDisplay = '⭐ x5';
    else if (plot.multiplier === 3) multiplierDisplay = '🌟 x3';
    else if (plot.multiplier === 2) multiplierDisplay = '✨ x2';
    else multiplierDisplay = '⬜ x1';
    
    if (amount > 0 || plot.id === 11) {
      allocationText += `**Plot ${plot.id}** ${multiplierDisplay}: \`${Math.floor(amount).toLocaleString()}\` gas/s\n`;
    }
  }
  
  if (allocationText === '') {
    allocationText = 'No allocations set. Click the plot buttons on the map to set your production.';
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🏭 Your Gas Field Production')
    .setDescription(allocationText)
    .addFields(
      { name: '⛽ Total Gas Production', value: `\`${Math.floor(totalProduction).toLocaleString()} gas/s\``, inline: true }
    )
    .setFooter({ text: 'Use /area map to change your production' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handlePlotButton(interaction, client) {
  const plotId = parseInt(interaction.customId.split('_')[1]);
  const plot = db.plots.find(p => p.id === plotId);
  
  if (!plot) return;
  
  const allocations = await db.getAreaAllocation(interaction.user.id);
  const currentAmount = allocations ? allocations[`plot${plotId}`] || 0 : 0;
  
  const modal = new ModalBuilder()
    .setCustomId(`allocate_${plotId}`)
    .setTitle(`Plot ${plotId} - ${plot.multiplier}x`);
  
  const gasInput = new TextInputBuilder()
    .setCustomId('gas_amount')
    .setLabel(`Gas/s (current: ${Math.floor(currentAmount).toLocaleString()})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(`Enter gas/s (e.g., 100000, 1500000, 2000000000)`)
    .setRequired(true);
  
  const actionRow = new ActionRowBuilder().addComponents(gasInput);
  modal.addComponents(actionRow);
  
  await interaction.showModal(modal);
}

async function handleAllocationModal(interaction, client) {
  const plotId = parseInt(interaction.customId.split('_')[1]);
  const plot = db.plots.find(p => p.id === plotId);
  const gasAmount = interaction.fields.getTextInputValue('gas_amount');
  
  const parsedAmount = parseNumber(gasAmount);
  
  if (parsedAmount === null) {
    await interaction.reply({
      content: '❌ Invalid format. Use raw numbers like: 100000, 1500000, 2000000000',
      flags: 64
    });
    return;
  }
  
  await db.setPlotAllocation(interaction.user.id, plotId, parsedAmount);
  
  await interaction.reply({
    content: `✅ **Plot ${plot.id}** (${plot.multiplier}x) set to \`${Math.floor(parsedAmount).toLocaleString()}\` gas/s`,
    flags: 64
  });
  
  const channel = interaction.channel;
  const messages = await channel.messages.fetch({ limit: 10 });
  const mapMessage = messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title === '🗺️ Interactive Gas Field Map');
  
  if (mapMessage) {
    const newAllocations = await db.getAreaAllocation(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🗺️ Interactive Gas Field Map')
      .setDescription('Click any plot button below to set your gas production for that area!\n\n**How it works:**\n• Each plot has a multiplier (x1, x2, x3, x5)\n• Enter the amount of gas/s you PRODUCE in that plot (already boosted)\n• The bot will store this as your actual production')
      .setImage(mapImageUrl)
      .setFooter({ text: 'U.E.O | Area Management' })
      .setTimestamp();
    
    const rows = createPlotButtons(newAllocations);
    await mapMessage.edit({ embeds: [embed], components: rows });
  }
}

function createPlotButtons(allocations) {
  const plotButtons = [
    { id: 1, row: 0, multiplier: 3, emoji: '3️⃣', label: 'P1', color: ButtonStyle.Primary },
    { id: 2, row: 0, multiplier: 5, emoji: '5️⃣', label: 'P2', color: ButtonStyle.Danger },
    { id: 3, row: 0, multiplier: 3, emoji: '3️⃣', label: 'P3', color: ButtonStyle.Primary },
    { id: 4, row: 1, multiplier: 2, emoji: '2️⃣', label: 'P4', color: ButtonStyle.Success },
    { id: 5, row: 1, multiplier: 2, emoji: '2️⃣', label: 'P5', color: ButtonStyle.Success },
    { id: 6, row: 1, multiplier: 2, emoji: '2️⃣', label: 'P6', color: ButtonStyle.Success },
    { id: 7, row: 2, multiplier: 1, emoji: '1️⃣', label: 'P7', color: ButtonStyle.Secondary },
    { id: 8, row: 2, multiplier: 1, emoji: '1️⃣', label: 'P8', color: ButtonStyle.Secondary },
    { id: 9, row: 2, multiplier: 1, emoji: '1️⃣', label: 'P9', color: ButtonStyle.Secondary },
    { id: 10, row: 3, multiplier: 1, emoji: '1️⃣', label: 'P10', color: ButtonStyle.Secondary },
    { id: 11, row: 3, multiplier: 1, emoji: '🚪', label: 'P11', color: ButtonStyle.Primary },
    { id: 12, row: 3, multiplier: 1, emoji: '1️⃣', label: 'P12', color: ButtonStyle.Secondary }
  ];
  
  const rows = [];
  let currentRow = [];
  let currentRowIndex = -1;
  
  for (const btn of plotButtons) {
    if (btn.row !== currentRowIndex) {
      if (currentRow.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(currentRow));
      }
      currentRow = [];
      currentRowIndex = btn.row;
    }
    
    const button = new ButtonBuilder()
      .setCustomId(`plot_${btn.id}`)
      .setLabel(btn.label)
      .setStyle(btn.color)
      .setEmoji(btn.emoji);
    
    currentRow.push(button);
  }
  
  if (currentRow.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(currentRow));
  }
  
  const infoRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('view_allocation')
        .setLabel('View My Production')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📊')
    );
  
  rows.push(infoRow);
  
  return rows;
}

async function getTotalProduction(userId) {
  const allocations = await db.getAreaAllocation(userId);
  if (!allocations) return 0;
  
  let total = 0;
  for (let i = 1; i <= 12; i++) {
    total += allocations[`plot${i}`] || 0;
  }
  return total;
}

function parseNumber(input) {
  input = input.toString().trim().replace(/,/g, '');
  
  const number = parseFloat(input);
  
  if (isNaN(number)) return null;
  
  return number;
}

function formatNumber(num) {
  return Math.floor(num).toLocaleString();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('area')
    .setDescription('Manage your gas field areas')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current area production'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('map')
        .setDescription('View the interactive gas field map')),
  
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      await viewAllocations(interaction);
    } else if (subcommand === 'map') {
      await showInteractiveMap(interaction);
    }
  },
  
  handlePlotButton,
  handleAllocationModal,
  showInteractiveMap,
  viewAllocations,
  getTotalProduction
};