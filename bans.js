const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const BANS_PATH = './bans.json';

function loadBans() {
    if (!fs.existsSync(BANS_PATH)) fs.writeFileSync(BANS_PATH, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(BANS_PATH));
}

function saveBans(data) {
    fs.writeFileSync(BANS_PATH, JSON.stringify(data, null, 4));
}

async function executarBan(interaction) {
    const listBans = loadBans();
    const targetUser = interaction.options.getUser('jogador');
    const targetMember = interaction.options.getMember('jogador');
    const motivo = interaction.options.getString('motivo');

    // 1. Salva no banco de dados interno
    listBans[targetUser.id] = { 
        motivo: motivo, 
        data: new Date().toLocaleDateString('pt-BR') 
    };
    saveBans(listBans);

    // 2. Executa o Ban no Servidor
    if (targetMember) {
        if (!targetMember.bannable) {
            return interaction.reply({ content: "❌ Eu não tenho permissão para banir este usuário.", ephemeral: true });
        }
        try {
            await targetMember.ban({ reason: motivo });
        } catch (err) {
            console.error("Erro ao banir:", err);
            return interaction.reply({ content: "❌ Erro ao tentar banir o jogador.", ephemeral: true });
        }
    } else {
        await interaction.guild.members.ban(targetUser.id, { reason: motivo }).catch(() => {});
    }

    // --- ALTERAÇÃO AQUI ---
    const embed = new EmbedBuilder()
        .setTitle("🚫 JOGADOR BANIDO DO SERVIDOR")
        // Aqui ele vai marcar a pessoa:
        .setDescription(`<@${targetUser.id}> foi banido permanentemente do servidor e das ranqueadas.`)
        .addFields(
            { name: "📝 Motivo", value: motivo },
            { name: "📅 Data", value: listBans[targetUser.id].data }
        )
        .setColor("#FF0000")
        .setThumbnail(targetUser.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
}

// ... restinho das funções (executarUnban, listarPunidos, etc) seguem iguais ...

async function executarUnban(interaction) {
    const listBans = loadBans();
    const target = interaction.options.getUser('jogador');

    if (listBans[target.id]) {
        delete listBans[target.id];
        saveBans(listBans);
    }

    try {
        await interaction.guild.members.unban(target.id);
    } catch (err) {
        console.error("Erro ao desbanir:", err);
        return interaction.reply({ content: "❌ Não foi possível encontrar este banimento.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle("✅ PUNIÇÃO REMOVIDA")
        // No unban também é bom marcar para confirmar:
        .setDescription(`<@${target.id}> foi desbanido do servidor e pode voltar a participar.`)
        .setColor("#00FF00")
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function listarPunidos(interaction) {
    const bans = loadBans();
    const ids = Object.keys(bans);

    if (ids.length === 0) {
        return interaction.reply({ content: "✅ Não há nenhum jogador na lista de punidos.", flags: [64] });
    }

    const listaFormatada = ids.map(id => `• <@${id}> | Motivo: \`${bans[id].motivo}\` (${bans[id].data})`).join('\n');

    const embed = new EmbedBuilder()
        .setTitle("🚫 HISTÓRICO DE BANIMENTOS")
        .setDescription(listaFormatada)
        .setColor("#2B2D31")
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: [64] });
}

module.exports = { 
    executarBan, 
    executarUnban, 
    loadBans, 
    listarPunidos 
};