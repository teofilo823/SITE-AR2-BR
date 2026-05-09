const { EmbedBuilder } = require('discord.js');

async function executarLimpar(interaction) {
    // 1. Pega os IDs permitidos do .env e transforma em um Array
    const staffRolesStr = process.env.STAFF_ROLES || "";
    const allowedRoles = staffRolesStr.split(',').map(id => id.trim());

    // 2. Verifica se o usuário tem pelo menos um desses cargos
    const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));

    if (!hasPermission) {
        return interaction.reply({ 
            content: "❌ Você não tem permissão para usar este comando.", 
            ephemeral: true 
        });
    }

    const quantidade = interaction.options.getInteger('numero');

    // O Discord só permite apagar entre 1 e 100 mensagens por vez
    if (quantidade < 1 || quantidade > 100) {
        return interaction.reply({ 
            content: "❌ Você só pode limpar entre 1 e 100 mensagens.", 
            ephemeral: true 
        });
    }

    try {
        // 3. Deleta as mensagens
        const messages = await interaction.channel.bulkDelete(quantidade, true);

        // 4. Envia a confirmação apenas para quem enviou o comando (ephemeral)
        return interaction.reply({ 
            content: `✅ Limpei **${messages.size}** mensagens deste canal com sucesso!`, 
            ephemeral: true 
        });

    } catch (error) {
        console.error("Erro ao limpar mensagens:", error);
        return interaction.reply({ 
            content: "❌ Ocorreu um erro ao tentar limpar as mensagens. (Mensagens com mais de 14 dias não podem ser apagadas em massa pelo Discord).", 
            ephemeral: true 
        });
    }
}

module.exports = { executarLimpar };