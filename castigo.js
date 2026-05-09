const { EmbedBuilder } = require('discord.js');

async function executarCastigo(interaction) {
    const targetMember = interaction.options.getMember('jogador');
    const tempoInput = interaction.options.getString('tempo').toLowerCase().trim(); // Ex: "1s", "2w"
    const motivo = interaction.options.getString('motivo') || "Não especificado";

    if (!targetMember) return interaction.reply({ content: "❌ Membro não encontrado.", ephemeral: true });
    if (!targetMember.moderatable) return interaction.reply({ content: "❌ Não tenho permissão para castigar este usuário.", ephemeral: true });

    // --- LÓGICA DE CONVERSÃO MANUAL (SEM BIBLIOTECAS) ---
    let tempoMs = 0;
    const valor = parseInt(tempoInput); 
    const unidade = tempoInput.replace(/[0-9]/g, ''); 

    if (isNaN(valor)) return interaction.reply({ content: "❌ Formato inválido! Use números e letras (Ex: 10m, 1h, 2s).", ephemeral: true });

    if (unidade === 'm' || unidade === 'min') {
        tempoMs = valor * 60 * 1000;
    } else if (unidade === 'h') {
        tempoMs = valor * 60 * 60 * 1000;
    } else if (unidade === 'd') {
        tempoMs = valor * 24 * 60 * 60 * 1000;
    } else if (unidade === 's' || unidade === 'sem' || unidade === 'w') { // Suporte a Semanas
        tempoMs = valor * 7 * 24 * 60 * 60 * 1000;
    } else {
        return interaction.reply({ content: "❌ Unidade inválida! Use `m` (minutos), `h` (horas), `d` (dias) ou `s` (semanas).", ephemeral: true });
    }

    // Limite técnico do Discord: 28 dias (4 semanas)
    if (tempoMs > 2419200000) {
        return interaction.reply({ content: "❌ O castigo máximo permitido pelo Discord é de 28 dias (4 semanas)!", ephemeral: true });
    }
    // ----------------------------------

    try {
        await targetMember.timeout(tempoMs, motivo);

        const embed = new EmbedBuilder()
            .setTitle("⏳ JOGADOR EM CASTIGO")
            .setDescription(`${targetMember} foi silenciado e removido das atividades.`)
            .addFields(
                { name: "🕒 Duração", value: `${tempoInput}`, inline: true },
                { name: "📝 Motivo", value: motivo, inline: true }
            )
            .setColor("#FFA500")
            .setThumbnail(targetMember.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ Ocorreu um erro ao tentar aplicar o castigo.", ephemeral: true });
    }
}

module.exports = { executarCastigo };