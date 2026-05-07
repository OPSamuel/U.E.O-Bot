const { handlePlotButton, handleAllocationModal, showInteractiveMap, viewAllocations } = require('../../Commands/Gas/area.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isButton()) {
            const messageUserId = interaction.message.interaction?.user?.id;
            
            if (messageUserId && interaction.user.id !== messageUserId) {
                await interaction.reply({
                    content: '❌ You cannot interact with this menu. Only the user who ran the command can use these buttons.',
                    flags: 64
                });
                return;
            }
            
            if (interaction.customId.startsWith('plot_')) {
                await handlePlotButton(interaction, client);
            } else if (interaction.customId === 'view_allocation') {
                await viewAllocations(interaction);
            }
            return;
        }
        
        if (interaction.isModalSubmit()) {
            const messageUserId = interaction.message?.interaction?.user?.id;
            
            if (messageUserId && interaction.user.id !== messageUserId) {
                await interaction.reply({
                    content: '❌ You cannot submit this modal. Only the user who ran the command can use it.',
                    flags: 64
                });
                return;
            }
            
            if (interaction.customId.startsWith('allocate_')) {
                await handleAllocationModal(interaction, client);
            }
            return;
        }
        
        if (!interaction.isChatInputCommand()) return;
        
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            const errorMessage = { content: 'There was an error executing this command!', flags: 64 };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
};