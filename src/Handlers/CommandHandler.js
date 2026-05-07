const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

module.exports = {
  loadCommands(client) {
    console.log('🔧 Loading commands...');
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'Commands');
    
    client.commands.clear();
    
    if (!fs.existsSync(commandsPath)) {
      console.error('❌ Commands folder not found!');
      return [];
    }
    
    const categories = fs.readdirSync(commandsPath);
    let commandCount = 0;
    
    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      
      if (!fs.statSync(categoryPath).isDirectory()) continue;
      
      const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        
        try {
          delete require.cache[require.resolve(filePath)];
          
          const command = require(filePath);
          
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            commandCount++;
          } else {
            console.warn(`  ⚠️ Skipping ${file}: Missing "data" or "execute" property`);
          }
        } catch (error) {
          console.error(`  ❌ Failed to load command from ${file}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Loaded ${commandCount} commands`);
    client.commandArray = commands;
    
    return commands;
  },
  
  async deployCommands(client) {
    if (!client.commandArray || client.commandArray.length === 0) {
      console.error('❌ No commands to deploy!');
      return { success: false, error: 'No commands loaded' };
    }
    
    const rest = new REST().setToken(config.token);
    
    try {
      console.log(`🔄 Deploying ${client.commandArray.length} commands...`);
      
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: client.commandArray }
      );
      
      console.log(`✅ Successfully deployed ${data.length} commands`);
      
      return { success: true, count: data.length };
    } catch (error) {
      console.error('❌ Failed to deploy commands:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  async reloadAllCommands(client) {
    console.log('🔄 Reloading all commands...');
    const commandsPath = path.join(__dirname, '..', 'Commands');
    
    if (!fs.existsSync(commandsPath)) {
      console.error('❌ Commands folder not found!');
      return { success: false, error: 'Commands folder not found' };
    }
    
    const categories = fs.readdirSync(commandsPath);
    
    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;
      
      const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        delete require.cache[require.resolve(path.join(categoryPath, file))];
      }
    }
    
    const commands = this.loadCommands(client);
    
    if (commands.length === 0) {
      return { success: false, error: 'No commands loaded' };
    }
    
    const result = await this.deployCommands(client);
    return result;
  }
};