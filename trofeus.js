const { EmbedBuilder } = require('discord.js');

async function executarTrofeus(interaction, db, saveDB, updateNick) {
    // Quantidade é número (Integer), então getInteger está correto
    const quantidade = interaction.options.getInteger('quantidade');
    
    // MOTIVO É TEXTO! Mudado de getInteger para getString
    const motivo = interaction.options.getString('motivo') || "Não informado";
    
    const targetUser = interaction.options.getUser('jogador');

    // Inicializa o usuário no banco se ele não existir
    if (!db.users[targetUser.id]) {
        db.users[targetUser.id] = { 
            name: targetUser.username, 
            trophies: 0, 
            wins: 0, 
            losses: 0, 
            total: 0 
        };
    }

    const antigoSaldo = db.users[targetUser.id].trophies;
    
    // Aplica a matemática
    db.users[targetUser.id].trophies += quantidade;

    // Trava para não deixar troféus negativos
    if (db.users[targetUser.id].trophies < 0) {
        db.users[targetUser.id].trophies = 0;
    }

    const novoSaldo = db.users[targetUser.id].trophies;

    // Salva no JSON
    saveDB(db);

    // Atualiza o apelido
    await updateNick(interaction.guild, targetUser.id, novoSaldo);

    const embed = new EmbedBuilder()
        .setTitle("🏆 MANIPULAÇÃO DE TROFÉUS")
        .setColor(quantidade > 0 ? "#F1C40F" : "#E74C3C")
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(`Os troféus de ${targetUser} foram atualizados pela Staff.`)
        .addFields(
            { name: "Saldo Anterior", value: `\`${antigoSaldo}\` 🏆`, inline: true },
            { name: "Alteração", value: `\`${quantidade > 0 ? '+' : ''}${quantidade}\``, inline: true },
            { name: "Saldo Atual", value: `\`${novoSaldo}\` 🏆`, inline: true },
            { name: "Motivo", value: `\`${motivo}\``, inline: false } 
        )
        .setTimestamp()
        .setFooter({ text: `Operador: ${interaction.user.tag}` });

    return interaction.reply({ embeds: [embed] });
}

module.exports = { executarTrofeus };