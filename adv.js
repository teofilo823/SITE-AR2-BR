const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'adv',
    description: 'Aplica uma advertência a um membro da equipe.',
    options: [
        {
            name: 'jogador',
            description: 'Membro da equipe que receberá a advertência',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'tipo',
            description: 'Selecione o nível da advertência',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'Advertência 1', value: 'adv1' },
                { name: 'Advertência 2', value: 'adv2' },
                { name: 'Advertência 3 (Remover Cargos)', value: 'adv3' },
            ],
        },
        {
            name: 'motivo',
            description: 'Motivo da advertência',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],

    run: async (client, interaction) => {
        // 1. Verificação de quem pode USAR o comando (Puxando do .env)
        const staffRoles = process.env.STAFF_ROLES?.split(',').map(id => id.trim()) || [];
        const hasPermission = interaction.member.roles.cache.some(role => staffRoles.includes(role.id));

        if (!hasPermission) {
            return interaction.reply({ content: "❌ Você não tem permissão para usar este comando.", ephemeral: true });
        }

        // 2. IDs de Configuração
        const cargosEquipeAlvo = ["1453046284029001859", "1451191189830369443"];
        const idsAdv = {
            adv1: "1481369133546475713",
            adv2: "1481369184007884920",
            adv3: "1481369207743578243"
        };

        const alvo = interaction.options.getMember('jogador');
        const tipoAdv = interaction.options.getString('tipo');
        const motivo = interaction.options.getString('motivo');

        if (!alvo) {
            return interaction.reply({ content: "❌ Usuário não encontrado no servidor.", ephemeral: true });
        }

        // 3. Verificação de Alvo Valido
        const eAlvoValido = cargosEquipeAlvo.some(id => alvo.roles.cache.has(id));
        if (!eAlvoValido) {
            return interaction.reply({ 
                content: "❌ Este comando só pode ser usado em membros que possuem os cargos de equipe específicos.", 
                ephemeral: true 
            });
        }

        // 4. Manipulação da Database (advs.json)
        if (!fs.existsSync('./advs.json')) fs.writeFileSync('./advs.json', '{}');
        let dbAdv = JSON.parse(fs.readFileSync('./advs.json', 'utf-8'));

        // Inicializa o objeto do usuário se não existir
        if (!dbAdv[alvo.id]) {
            dbAdv[alvo.id] = { 
                historico: [],
                stats: { adv1: 0, adv2: 0, adv3: 0 } 
            };
        }

        let nomeExibicao = "";
        if (tipoAdv === 'adv1') nomeExibicao = "Advertência 1";
        if (tipoAdv === 'adv2') nomeExibicao = "Advertência 2";
        if (tipoAdv === 'adv3') nomeExibicao = "Advertência 3";

        try {
            // Adicionar cargo da ADV
            await alvo.roles.add(idsAdv[tipoAdv]);

            // Lógica Especial para ADV 3 (Remover cargos de equipe)
            if (tipoAdv === 'adv3') {
                for (const idCargo of cargosEquipeAlvo) {
                    if (alvo.roles.cache.has(idCargo)) {
                        await alvo.roles.remove(idCargo).catch(() => {});
                    }
                }
            }

            // 5. Salvar na Database
            dbAdv[alvo.id].historico.push({
                tipo: nomeExibicao,
                staff_id: interaction.user.id,
                staff_tag: interaction.user.tag,
                motivo: motivo,
                data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            });

            // Incrementa o contador específico
            dbAdv[alvo.id].stats[tipoAdv]++;

            fs.writeFileSync('./advs.json', JSON.stringify(dbAdv, null, 2));

            // 6. Resposta Visual
            const embed = new EmbedBuilder()
                .setTitle("⚠️ PUNIÇÃO APLICADA")
                .setThumbnail(alvo.user.displayAvatarURL())
                .setColor(tipoAdv === 'adv3' ? "#FF0000" : "#F1C40F")
                .addFields(
                    { name: "👤 Usuário Punido", value: `${alvo} (\`${alvo.id}\`)`, inline: true },
                    { name: "🛡️ Staff Responsável", value: `${interaction.user}`, inline: true },
                    { name: "📋 Nível da ADV", value: `\`${nomeExibicao}\``, inline: true },
                    { name: "📝 Motivo", value: motivo, inline: false },
                    { name: "📊 Total do Usuário", value: `ADV1: ${dbAdv[alvo.id].stats.adv1} | ADV2: ${dbAdv[alvo.id].stats.adv2} | ADV3: ${dbAdv[alvo.id].stats.adv3}`, inline: false }
                )
                .setTimestamp();

            if (tipoAdv === 'adv3') {
                embed.setFooter({ text: "Os cargos de equipe foram revogados automaticamente." });
            }

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return interaction.reply({ 
                content: "❌ Erro ao aplicar cargos. Verifique a hierarquia do bot.", 
                ephemeral: true 
            });
        }
    }
};