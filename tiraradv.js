const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'tiraradv',
    description: 'Remove uma advertência de um membro da equipe.',
    options: [
        {
            name: 'jogador',
            description: 'Membro que terá a advertência removida',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'tipo',
            description: 'Selecione o nível da advertência para remover',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'Advertência 1', value: 'adv1' },
                { name: 'Advertência 2', value: 'adv2' },
                { name: 'Advertência 3', value: 'adv3' },
            ],
        },
        {
            name: 'motivo',
            description: 'Descreva o motivo da remoção',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],

    run: async (client, interaction) => {
        // 1. Verificação de Permissão Staff
        const staffRoles = process.env.STAFF_ROLES?.split(',').map(id => id.trim()) || [];
        const hasPermission = interaction.member.roles.cache.some(role => staffRoles.includes(role.id));

        if (!hasPermission) {
            return interaction.reply({ content: "❌ Você não tem permissão para usar este comando.", ephemeral: true });
        }

        // 2. Configurações de IDs
        const idsAdv = {
            adv1: "1481369133546475713",
            adv2: "1481369184007884920",
            adv3: "1481369207743578243"
        };

        const alvo = interaction.options.getMember('jogador');
        const tipoAdv = interaction.options.getString('tipo');
        const motivo = interaction.options.getString('motivo');

        if (!alvo) return interaction.reply({ content: "❌ Usuário não encontrado.", ephemeral: true });

        // 3. Abrir Database
        if (!fs.existsSync('./advs.json')) return interaction.reply({ content: "❌ Nenhuma advertência registrada no sistema.", ephemeral: true });
        let dbAdv = JSON.parse(fs.readFileSync('./advs.json', 'utf-8'));

        if (!dbAdv[alvo.id] || dbAdv[alvo.id].stats[tipoAdv] <= 0) {
            return interaction.reply({ content: `❌ Este jogador não possui uma **${tipoAdv.toUpperCase()}** registrada.`, ephemeral: true });
        }

        try {
            // 4. Remover o cargo do Discord
            const cargoId = idsAdv[tipoAdv];
            if (alvo.roles.cache.has(cargoId)) {
                await alvo.roles.remove(cargoId);
            }

            // 5. Atualizar Database (Remover do histórico e stats)
            // Removemos a última ocorrência desse tipo de ADV no histórico
            const index = dbAdv[alvo.id].historico.map(h => h.tipo.toLowerCase().replace(" ", "")).lastIndexOf(tipoAdv);
            if (index > -1) {
                dbAdv[alvo.id].historico.splice(index, 1);
            }

            // Decrementar contador
            dbAdv[alvo.id].stats[tipoAdv]--;
            
            fs.writeFileSync('./advs.json', JSON.stringify(dbAdv, null, 2));

            // 6. Resposta
            const embed = new EmbedBuilder()
                .setTitle("✅ ADVERTÊNCIA REMOVIDA")
                .setColor("#2ECC71") // Verde
                .setThumbnail(alvo.user.displayAvatarURL())
                .addFields(
                    { name: "👤 Jogador", value: `${alvo}`, inline: true },
                    { name: "🛡️ Removido por", value: `${interaction.user}`, inline: true },
                    { name: "📋 Tipo Removido", value: `\`${tipoAdv.toUpperCase()}\``, inline: true },
                    { name: "📝 Motivo", value: motivo, inline: false }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "❌ Erro ao remover o cargo. Verifique a hierarquia.", ephemeral: true });
        }
    }
};