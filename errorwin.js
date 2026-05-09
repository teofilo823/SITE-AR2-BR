const { EmbedBuilder } = require('discord.js');



async function executarErrorWin(interaction, db, saveDB, updateNick, calculatePoints) {

    const matchId = interaction.options.getInteger('id');

    const partida = db.matches.find(m => m.id === matchId && m.status === 'FINISHED');



    if (!partida) {

        return interaction.reply({ content: `❌ Partida **#${matchId}** não encontrada ou ainda não foi finalizada.`, ephemeral: true });

    }



    await interaction.deferReply();



    // 1. Identificar quem ganhou errado e quem deveria ter ganho

    const ganhouErrado = partida.winner; // 'blue' ou 'red'

    const novoVencedor = ganhouErrado === 'blue' ? 'red' : 'blue';

    

    const idsGanharamErrado = ganhouErrado === 'blue' ? partida.blue : partida.red;

    const idsPerderamErrado = ganhouErrado === 'blue' ? partida.red : partida.blue;



    let detalhesAzul = [];

    let detalhesVermelho = [];

    let novoRegistroPontos = {};



    // 2. REVERTER pontos de quem ganhou errado (Transformar vitória em derrota)

    for (const uid of idsGanharamErrado) {

        if (db.users[uid]) {

            // Remove o ganho anterior registrado na partida

            const ganhoAntigo = partida.registry[uid] || 0;

            db.users[uid].trophies = Math.max(0, db.users[uid].trophies - ganhoAntigo);

            db.users[uid].wins = Math.max(0, (db.users[uid].wins || 0) - 1);



            // Aplica a perda de uma derrota real

            const novaPerda = calculatePoints(db.users[uid].trophies, false);

            db.users[uid].trophies = Math.max(0, db.users[uid].trophies - novaPerda);

            db.users[uid].losses = (db.users[uid].losses || 0) + 1;



            novoRegistroPontos[uid] = novaPerda;

            updateNick(interaction.guild, uid, db.users[uid].trophies);

            

            const m = `<@${uid}> (-${ganhoAntigo} rev. / -${novaPerda} loss)`;

            if (ganhouErrado === 'blue') detalhesAzul.push(m); else detalhesVermelho.push(m);

        }

    }



    // 3. REVERTER pontos de quem perdeu errado (Transformar derrota em vitória)

    for (const uid of idsPerderamErrado) {

        if (db.users[uid]) {

            // Devolve a perda anterior

            const perdaAntiga = partida.registry[uid] || 0;

            db.users[uid].trophies += perdaAntiga;

            db.users[uid].losses = Math.max(0, (db.users[uid].losses || 0) - 1);



            // Aplica o ganho de uma vitória real

            const novoGanho = calculatePoints(db.users[uid].trophies, true);

            db.users[uid].trophies += novoGanho;

            db.users[uid].wins = (db.users[uid].wins || 0) + 1;



            novoRegistroPontos[uid] = novoGanho;

            updateNick(interaction.guild, uid, db.users[uid].trophies);



            const m = `<@${uid}> (+${perdaAntiga} rev. / +${novoGanho} win)`;

            if (novoVencedor === 'blue') detalhesAzul.push(m); else detalhesVermelho.push(m);

        }

    }



    // 4. Atualizar Database

    partida.winner = novoVencedor;

    partida.registry = novoRegistroPontos;

    partida.error_corrected = true; // Marca que houve correção

    saveDB(db);



    // 5. Embed de Resultado Corrigido

    const embed = new EmbedBuilder()

        .setTitle("🛠️ RESULTADO CORRIGIDO (#" + matchId + ")")

        .setDescription(`O resultado da partida foi invertido por erro de lançamento.`)

        .setColor(novoVencedor === 'blue' ? "#3498db" : "#e74c3c")

        .addFields(

            { name: '🟦 TIME AZUL', value: detalhesAzul.join('\n') || 'Ninguém', inline: true },

            { name: '🟥 TIME VERMELHO', value: detalhesVermelho.join('\n') || 'Ninguém', inline: true },

            { name: '🏆 Novo Vencedor', value: novoVencedor === 'blue' ? "🔵 Time Azul" : "🔴 Time Vermelho" }

        )

        .setFooter({ text: `Correção aplicada por ${interaction.user.tag}` })

        .setTimestamp();



    return interaction.editReply({ embeds: [embed] });

}



module.exports = { executarErrorWin };