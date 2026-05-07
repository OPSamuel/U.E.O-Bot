const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    
    client.user.setPresence({
      activities: [{ 
        name: 'Online', 
        type: 0 
      }],
      status: 'online',
    });
    
    console.log(`✅ Bot is ready in ${client.guilds.cache.size} servers`);
  }
};