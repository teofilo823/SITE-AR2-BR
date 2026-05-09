const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const ms = require('ms');

const VIP_ROLE_ID = '1489323717791187096';

module.exports = {
    // REGISTRO EXATAMENTE COMO VOCÊ PEDIU
    data: new SlashCommandBuilder()
        .setName('ativarvip')
        .setDescription('Ativa o VIP de um usuário (Apenas Mestres)')
        .addUserOption(o => o.setName('jogador').setDescription('Jogador que receberá VIP').setRequired(true))
        .addStringOption(o => o.setName('tempo').setDescription('Ex: 30d, 7d').setRequired(true)),

    async execute(interaction) {
        // 1. Verificação de Staff via .env
        const staffRolesStr = process.env.STAFF_ROLES || "";
        const staffRoles = staffRolesStr.split(',').map(id => id.trim());
        
        const hasPermission = interaction.member.roles.cache.some(role => staffRoles.includes(role.id)) 
                              || interaction.member.permissions.has('Administrator');

        if (!hasPermission) {
            return interaction.reply({ 
                content: '❌ Você não tem permissão para usar este comando.', 
                ephemeral: true 
            });
        }

        // 2. Coleta de dados (Usando os nomes EXATOS do seu registro)
        const user = interaction.options.getUser('jogador');
        const tempoInput = interaction.options.getString('tempo');
        const tempoMs = ms(tempoInput);

        if (!tempoMs) {
            return interaction.reply({ 
                content: '❌ Formato de tempo inválido. Use ex: `30d`, `7d`, `1h`.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            // 3. Busca o membro no servidor (Fetch para garantir que o bot o encontre)
            const member = await interaction.guild.members.fetch(user.id);

            // 4. Lógica do Arquivo JSON
            const filePath = './vips.json';
            let vips = {};
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.trim()) vips = JSON.parse(content);
                } catch (e) { vips = {}; }
            }

            const expiresAt = Date.now() + tempoMs;
            vips[user.id] = {
                username: user.username,
                expiresAt: expiresAt,
                activatedAt: Date.now()
            };
            
            fs.writeFileSync(filePath, JSON.stringify(vips, null, 4));

            // 5. Aplicação do Cargo
            await member.roles.add(VIP_ROLE_ID);

            // 6. Resposta Final
            const embed = new EmbedBuilder()
                .setTitle('💎 VIP ATIVADO')
                .setColor('#f1c40f')
                .setDescription(`O jogador ${user} recebeu VIP com sucesso!`)
                .addFields(
                    { name: '⏳ Duração', value: `\`${tempoInput}\``, inline: true },
                    { name: '📅 Expira em', value: `<t:${Math.floor(expiresAt / 1000)}:F>`, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // 7. Remoção Automática (Timeout)
            setTimeout(async () => {
                try {
                    const refMember = await interaction.guild.members.fetch(user.id).catch(() => null);
                    if (refMember && refMember.roles.cache.has(VIP_ROLE_ID)) {
                        await refMember.roles.remove(VIP_ROLE_ID);
                        
                        // Remove do JSON para manter limpo
                        const currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        delete currentData[user.id];
                        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 4));
                    }
                } catch (err) {
                    console.log(`Erro na remoção automática de ${user.tag}:`, err);
                }
            }, tempoMs);

        } catch (error) {
            console.error(error);
            return interaction.editReply('❌ Não foi possível encontrar o jogador no servidor ou houve um erro ao aplicar o cargo.');
        }
    }
};