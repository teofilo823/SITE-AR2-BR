const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mudarnome')
        .setDescription('Muda seu apelido e atualiza a database na Discloud.')
        .addStringOption(option => 
            option.setName('novonome')
                .setDescription('O novo nome')
                .setRequired(true)),

    async execute(i) {
        const novoNomeBase = i.options.getString('novonome');
        const membro = i.member;
        const userId = i.user.id;

        // --- LÓGICA DOS TROFÉUS ---
        let parteDosTrofeus = "";
        if (membro.displayName.includes('|')) {
            parteDosTrofeus = " | " + membro.displayName.split('|')[1].trim();
        }
        const apelidoFinal = `${novoNomeBase}${parteDosTrofeus}`;

        if (apelidoFinal.length > 32) return i.reply({ content: "❌ Nome longo demais.", ephemeral: true });

        try {
            // 1. DISCORD
            await membro.setNickname(apelidoFinal);

            // 2. DATABASE (AJUSTADO PARA DISCLOUD)
            // O process.cwd() pega a pasta raiz onde o bot iniciou
            const dbPath = path.join(process.cwd(), 'database.json');
            
            console.log(`🔍 Tentando ler database em: ${dbPath}`);

            if (!fs.existsSync(dbPath)) {
                console.log("❌ Arquivo não existe na raiz!");
                return i.reply({ content: "❌ Database não encontrada na raiz do bot.", ephemeral: true });
            }

            const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

            if (data.users && data.users[userId]) {
                data.users[userId].name = novoNomeBase;
                
                // Salva
                fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
                console.log(`✅ Database atualizada para o ID: ${userId}`);
            } else {
                console.log(`⚠️ ID ${userId} não existe na DB.`);
                return i.reply({ content: "❌ Você não tem um registro na database.", ephemeral: true });
            }

            await i.reply({ content: `✅ Sucesso! Apelido e Database atualizados.`, ephemeral: true });

        } catch (error) {
            console.error("❌ ERRO:", error);
            await i.reply({ content: "❌ Erro ao processar o comando.", ephemeral: true });
        }
    },
};