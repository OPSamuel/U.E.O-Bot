const fs = require('fs');
const path = require('path');

module.exports = {
  async loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'Events');
    let totalEvents = 0;
    
    if (!fs.existsSync(eventsPath)) {
      console.error('❌ Events folder not found!');
      return 0;
    }
    
    function scanDirectory(currentPath) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.js')) {
          loadEventFile(itemPath);
        }
      }
    }
    
    function loadEventFile(filePath) {
      try {
        const event = require(filePath);
        
        if (!event.name || !event.execute) return;
        
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
        
        console.log(`✅ Loaded event: ${event.name}`);
        totalEvents++;
        
      } catch (error) {
        console.error(`❌ Error loading event ${path.basename(filePath)}:`, error.message);
      }
    }
    
    scanDirectory(eventsPath);
    console.log(`✅ Loaded ${totalEvents} events`);
    return totalEvents;
  }
};