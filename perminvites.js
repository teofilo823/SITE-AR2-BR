const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    // AQUI CRIA O COMANDO SLASH
    data: new SlashCommandBuilder()
        .setName('perminvite')
        .setDescription('Autoriza um link de convite na lista branca.')
        .addStringOption(option => 
            option.setName('convite')
                .setDescription('O link ou código do convite (Ex: discord.gg/abc)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(i) {
        // AQUI SÓ DEIXA OS STAFF_ROLES USAREM
        const staffRoles = process.env.STAFF_ROLES ? process.env.STAFF_ROLES.split(',') : [];
        const ehStaff = i.member.roles.cache.some(role => staffRoles.includes(role.id));
        const ehAdmin = i.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!ehStaff && !ehAdmin) {
            return i.reply({ 
                content: "❌ Só os lendas da Staff podem autorizar convites.", 
                ephemeral: true 
            });
        }

        const input = i.options.getString('convite');
        const codigo = input.split('/').pop().trim(); // Pega só o final do link

        const pathInvites = path.join(process.cwd(), 'invites.json');
        
        try {
            // Garante que o arquivo existe
            if (!fs.existsSync(pathInvites)) {
                fs.writeFileSync(pathInvites, JSON.stringify({ permitidos: [] }, null, 4));
            }

            const data = JSON.parse(fs.readFileSync(pathInvites, 'utf8'));

            if (data.permitidos.includes(codigo)) {
                return i.reply({ content: `⚠️ O convite \`${codigo}\` já está na lista branca.`, ephemeral: true });
            }

            // Salva o código novo
            data.permitidos.push(codigo);
            fs.writeFileSync(pathInvites, JSON.stringify(data, null, 4));

            await i.reply({ content: `✅ Convite \`${codigo}\` autorizado com sucesso!` });
        } catch (err) {
            console.error(err);
            await i.reply({ content: "❌ Erro ao salvar no invites.json.", ephemeral: true });
        }
    }
};