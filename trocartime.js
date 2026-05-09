const { EmbedBuilder } = require('discord.js');



async function executarTrocaTime(i, db, saveDB) {

    const pAzul = i.options.getUser('azul');

    const pVermelho = i.options.getUser('vermelho');

    const matchId = i.options.getInteger('id');



    const m = db.matches.find(x => x.id === matchId && x.status === 'PROGRESS');

    if (!m) return i.reply({ content: "❌ Partida em andamento não encontrada.", ephemeral: true });



    // Verifica se os jogadores estão nos times correspondentes

    const indexAzul = m.blue.indexOf(pAzul.id);

    const indexVermelho = m.red.indexOf(pVermelho.id);



    if (indexAzul === -1 || indexVermelho === -1) {

        return i.reply({ content: "❌ Jogadores não encontrados nos times informados (Certifique-se que o primeiro é Azul e o segundo é Vermelho).", ephemeral: true });

    }



    // 1. Troca no Banco de Dados

    m.blue[indexAzul] = pVermelho.id;

    m.red[indexVermelho] = pAzul.id;

    saveDB(db);



    // 2. Troca nas Calls de Voz (Físico)

    const memberAzul = await i.guild.members.fetch(pAzul.id).catch(() => null);

    const memberVermelho = await i.guild.members.fetch(pVermelho.id).catch(() => null);



    if (memberAzul && m.callV) await memberAzul.voice.setChannel(m.callV).catch(() => {});

    if (memberVermelho && m.callA) await memberVermelho.voice.setChannel(m.callA).catch(() => {});



    // 3. Atualizar o Embed da partida no canal

    try {

        const messages = await i.channel.messages.fetch({ limit: 50 });

        const msgOriginal = messages.find(msg => 

            msg.embeds.length > 0 && 

            msg.embeds[0].title === "⚔️ CONFRONTO INICIADO" && 

            msg.embeds[0].fields[2].value.includes(`ID: #${matchId}`)

        );



        if (msgOriginal) {

            const embedEditado = EmbedBuilder.from(msgOriginal.embeds[0]);

            embedEditado.setFields(

                { name: '🟦 TIME AZUL', value: m.blue.map(id => `<@${id}>`).join('\n'), inline: true },

                { name: '🟥 TIME VERMELHO', value: m.red.map(id => `<@${id}>`).join('\n'), inline: true },

                { name: '📋 INFO', value: msgOriginal.embeds[0].fields[2].value }

            );

            await msgOriginal.edit({ embeds: [embedEditado] });

        }

    } catch (e) {

        console.error("Erro ao editar embed original:", e);

    }



    // 4. ENVIA O EMBED PÚBLICO DA TROCA

    const embedTroca = new EmbedBuilder()

        .setTitle("🔄 TROCA DE TIMES - #" + matchId)

        .setColor("#E67E22") // Laranja para destacar a mudança

        .setDescription(`Houve uma alteração nos times da partida **#${matchId}**.`)

        .addFields(

            { name: "⬅️ Saiu do Azul", value: `${pAzul} ➔ foi para **Vermelho** 🔴`, inline: false },

            { name: "⬅️ Saiu do Vermelho", value: `${pVermelho} ➔ foi para **Azul** 🔵`, inline: false }

        )

        .setFooter({ text: `Alteração feita por ${i.user.tag}`, iconURL: i.user.displayAvatarURL() })

        .setTimestamp();



    // Removido o ephemeral para que todos vejam

    return i.reply({ embeds: [embedTroca] });

}



module.exports = { executarTrocaTime };