const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

async function executarDespunir(interaction) {
    // Pega o que foi escrito (pode ser @Menção ou o ID puro)
    const input = interaction.options.getString('jogador');
    
    // LIMPEZA AUTOMÁTICA: 
    // Se for menção <@12345>, vira 12345. Se for ID 12345, continua 12345.
    const userId = input.replace(/\D/g, '');

    if (!userId || userId.length < 17) {
        return interaction.reply({ 
            content: "❌ Entrada inválida! Mencione o jogador ou cole o ID dele.", 
            ephemeral: true 
        });
    }

    await interaction.deferReply();

    let acoes = [];
    const bansPath = './bans.json';

    try {
        // 1. LIMPAR DO ARQUIVO DE BANIMENTOS (bans.json)
        if (fs.existsSync(bansPath)) {
            let bans = JSON.parse(fs.readFileSync(bansPath, 'utf8'));
            if (bans[userId]) {
                delete bans[userId];
                fs.writeFileSync(bansPath, JSON.stringify(bans, null, 4));
                acoes.push("✅ Removido da lista de **Banidos das Ranqueadas**.");
            }
        }

        // 2. TIRAR BANIMENTO DO SERVIDOR (Caso ele tenha sido banido do Discord todo)
        const serverBan = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (serverBan) {
            await interaction.guild.members.unban(userId, `Despunido por ${interaction.user.tag}`);
            acoes.push("✅ **Unban** realizado no servidor.");
        }

        // 3. TIRAR CASTIGO (Timeout)
        const membro = await interaction.guild.members.fetch(userId).catch(() => null);
        if (membro) {
            if (membro.communicationDisabledUntilTimestamp && membro.communicationDisabledUntilTimestamp > Date.now()) {
                await membro.timeout(null, `Castigo removido por ${interaction.user.tag}`);
                acoes.push("✅ **Castigo (Timeout)** encerrado.");
            }
        }

        // RESPOSTA
        if (acoes.length === 0) {
            return interaction.editReply({ content: `ℹ️ O jogador <@${userId}> não possuía nenhuma punição ativa encontrada.` });
        }

        const embed = new EmbedBuilder()
            .setTitle("🛡️ Limpeza de Punições")
            .setColor("#00ff7f")
            .setDescription(`Punições removidas para: <@${userId}>\n\n${acoes.join('\n')}`)
            .setFooter({ text: `Hoster: ${interaction.user.tag}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: "❌ Erro ao processar a despunição." });
    }
}

module.exports = { executarDespunir };