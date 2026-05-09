const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

async function executarTrocarModo(i, db, saveDB) {
    const matchId = i.options.getInteger('id');
    const novoFormato = i.options.getString('formato');
    const novoLimite = parseInt(novoFormato.split('v')[0]);
    
    const match = db.matches.find(m => m.id === matchId && m.status === 'PROGRESS');
    if (!match) return i.reply({ content: "❌ Partida não encontrada.", ephemeral: true });

    // Todos os jogadores atuais da partida
    const todosJogadores = [...match.blue, ...match.red];

    // Criar o menu de seleção
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`select_trocar_${matchId}_${novoFormato}`)
        .setPlaceholder('Selecione os jogadores que permanecerão na partida')
        .setMinValues(novoLimite * 2) // Obriga a escolher o número exato do novo modo
        .setMaxValues(novoLimite * 2);

    // Adiciona os jogadores como opções no menu
    for (const id of todosJogadores) {
        const member = i.guild.members.cache.get(id);
        menu.addOptions({
            label: member ? member.user.username : `ID: ${id}`,
            value: id
        });
    }

    // Se o modo for MAIOR que o atual, precisamos de um botão para adicionar novos,
    // mas se for MENOR ou IGUAL (remanejamento), o menu resolve.
    
    const row = new ActionRowBuilder().addComponents(menu);

    return i.reply({ 
        content: `🔄 Você está mudando a partida #${matchId} para **${novoFormato}**. Selecione os **${novoLimite * 2}** jogadores que farão parte dela:`, 
        components: [row], 
        ephemeral: true 
    });
}