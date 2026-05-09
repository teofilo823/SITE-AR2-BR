const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trio')
        .setDescription('Cria um trio oficial (Você + 2 membros)')
        .addUserOption(o => o.setName('membro2').setDescription('Segundo membro do trio').setRequired(true))
        .addUserOption(o => o.setName('membro3').setDescription('Terceiro membro do trio').setRequired(true)),

    async execute(interaction) {
        const roleVIP = '1489323717791187096';
        
        // 1. Verifica se quem usou o comando é VIP
        if (!interaction.member.roles.cache.has(roleVIP)) {
            return interaction.reply({ content: '❌ Apenas membros **VIP** podem ser donos de um trio oficial.', ephemeral: true });
        }

        const m2 = interaction.options.getUser('membro2');
        const m3 = interaction.options.getUser('membro3');
        
        // O Trio é formado por: Autor do comando + Membro 2 + Membro 3
        const membros = [interaction.user, m2, m3];
        const membrosIds = membros.map(u => u.id);

        // 2. Verifica se não marcou a si mesmo ou IDs repetidos
        if (new Set(membrosIds).size !== 3) {
            return interaction.reply({ content: '❌ Você precisa escolher 2 membros diferentes de você!', ephemeral: true });
        }

        await interaction.reply({ content: `⏳ Enviando convites para ${m2} e ${m3}...`, ephemeral: true });

        // Os outros 2 membros precisam aceitar
        const aceitos = new Set();
        aceitos.add(interaction.user.id); // Você já aceitou, pois deu o comando

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('aceitar_trio').setLabel('Aceitar Convite').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('recusar_trio').setLabel('Recusar').setStyle(ButtonStyle.Danger)
        );

        // Envia DM apenas para os outros dois
        const convidados = [m2, m3];

        for (const user of convidados) {
            try {
                const embedConvite = new EmbedBuilder()
                    .setTitle('⚔️ Convite de Trio Oficial')
                    .setDescription(`Olá **${user.username}**!\n\n**${interaction.user.username}** convidou você para ser um dos membros oficiais do trio dele no AR2.`)
                    .addFields({ name: '👥 Formação Proposta', value: membros.map(m => `• ${m.username}`).join('\n') })
                    .setColor('#5865F2')
                    .setFooter({ text: 'Aguardando sua confirmação...' });

                const msg = await user.send({ embeds: [embedConvite], components: [row] });

                const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

                collector.on('collect', async i => {
                    if (i.customId === 'aceitar_trio') {
                        aceitos.add(user.id);
                        await i.reply('✅ Você aceitou fazer parte do trio!');

                        // Se os 3 agora estão no Set (Você + 2 convidados)
                        if (aceitos.size === 3) {
                            const trios = JSON.parse(fs.readFileSync('./trios.json', 'utf8'));
                            
                            // Salva o trio usando o SEU ID como chave
                            trios[interaction.user.id] = membrosIds;
                            
                            fs.writeFileSync('./trios.json', JSON.stringify(trios, null, 4));

                            const embedFinal = new EmbedBuilder()
                                .setTitle('✅ Trio Registrado com Sucesso!')
                                .setColor('#2ecc71')
                                .setDescription(`O trio de ${interaction.user} agora é oficial e será priorizado no sorteio de times!`)
                                .addFields({ name: '🛡️ Membros', value: membros.map(m => `<@${m.id}>`).join('\n') });

                            interaction.channel.send({ embeds: [embedFinal] });
                        }
                    } else {
                        await i.reply('❌ Você recusou o convite.');
                        interaction.followUp({ content: `⚠️ **${user.username}** recusou o convite. O trio não foi salvo.`, ephemeral: true });
                        collector.stop();
                    }
                });
            } catch (e) {
                interaction.followUp({ content: `⚠️ Não consegui enviar DM para **${user.username}**.`, ephemeral: true });
            }
        }
    }
};