const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.GuildMember,
    Partials.User,
    Partials.Channel,
    Partials.Message,
    Partials.Reaction
  ]
});

client.commands = new Collection();

const EventHandler = require('./Handlers/EventHandler');
const CommandHandler = require('./Handlers/CommandHandler');

async function initializeBot() {
  try {
    await CommandHandler.loadCommands(client);
    
    const deployResult = await CommandHandler.deployCommands(client);
    if (!deployResult.success) {
      console.error('❌ Failed to deploy commands:', deployResult.error);
    }
    
    await EventHandler.loadEvents(client);
    
    console.log('🔐 Logging in to Discord...');
    await client.login(config.token);
    
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

initializeBot();