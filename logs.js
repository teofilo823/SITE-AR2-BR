const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');

module.exports = (client) => {
    const canalLogsId = process.env.CANAL_LOGS?.trim();

    // Função auxiliar para enviar logs com segurança
    const enviarLog = (guild, embed) => {
        if (!guild) return;
        const canal = guild.channels.cache.get(canalLogsId);
        if (canal) canal.send({ embeds: [embed] }).catch(() => {});
    };

    // --- 1. MENSAGEM APAGADA (Texto + Fotos/Vídeos) ---
    client.on(Events.MessageDelete, async (message) => {
        if (!message.guild || message.author?.bot) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensagem Apagada')
            .setColor('#ff4757')
            .addFields(
                { name: 'Autor', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                { name: 'Canal', value: `${message.channel}`, inline: true }
            )
            .setTimestamp();

        if (message.content) {
            embed.addFields({ name: 'Conteúdo', value: message.content.slice(0, 1024) });
        }

        if (message.attachments.size > 0) {
            const anexos = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({ name: '🖼️ Anexos', value: anexos });
            
            const imagem = message.attachments.find(a => a.contentType?.startsWith('image/'));
            if (imagem) embed.setImage(imagem.url);
        }

        enviarLog(message.guild, embed);
    });

    // --- 2. MENSAGEM EDITADA ---
    client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
        if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;

        const embed = new EmbedBuilder()
            .setTitle('📝 Mensagem Editada')
            .setColor('#eccc68')
            .addFields(
                { name: 'Autor', value: `${oldMsg.author}`, inline: true },
                { name: 'Canal', value: `${oldMsg.channel}`, inline: true },
                { name: 'Antes', value: oldMsg.content?.slice(0, 1024) || "*(Vazio)*" },
                { name: 'Depois', value: newMsg.content?.slice(0, 1024) || "*(Vazio)*" }
            )
            .setTimestamp();

        enviarLog(oldMsg.guild, embed);
    });

    // --- 3. CALLS (Entrou, Saiu, Moveu + Quem Moveu) ---
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const usuario = newState.member?.user;
        if (!usuario) return;

        const embed = new EmbedBuilder().setTimestamp();

        // Entrou
        if (!oldState.channelId && newState.channelId) {
            embed.setTitle('🔊 Entrou em Call').setColor('#2ecc71')
                .setDescription(`${usuario} entrou em ${newState.channel}`);
        }
        // Saiu
        else if (oldState.channelId && !newState.channelId) {
            embed.setTitle('🔇 Saiu de Call').setColor('#ff4757')
                .setDescription(`${usuario} saiu de ${oldState.channel}`);
        }
        // Moveu ou Trocou
        else if (oldState.channelId !== newState.channelId) {
            // Delay para o Audit Log processar
            setTimeout(async () => {
                const logs = await newState.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberMove }).catch(() => null);
                const log = logs?.entries.first();
                
                // Verificação blindada contra erro 'id' of null
                const foiMovido = (log && log.target?.id === usuario.id && log.createdTimestamp > Date.now() - 5000);
                const responsavel = foiMovido ? `por ${log.executor}` : `sozinho(a)`;

                embed.setTitle(foiMovido ? '🔄 Membro Movido' : '🔀 Trocou de Call')
                    .setColor('#3498db')
                    .setDescription(`${usuario} mudou de canal ${responsavel}`)
                    .addFields(
                        { name: 'De', value: `${oldState.channel || 'Desconhecido'}`, inline: true },
                        { name: 'Para', value: `${newState.channel || 'Desconhecido'}`, inline: true }
                    );
                enviarLog(newState.guild, embed);
            }, 1000);
            return;
        } else return;

        enviarLog(newState.guild, embed);
    });

    // --- 4. ENTRADA E SAÍDA DE MEMBROS ---
    client.on(Events.GuildMemberAdd, (member) => {
        const embed = new EmbedBuilder()
            .setTitle('📥 Novo Membro')
            .setColor('#2ecc71')
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`${member.user} entrou no servidor.\nID: \`${member.id}\``)
            .setTimestamp();
        enviarLog(member.guild, embed);
    });

    client.on(Events.GuildMemberRemove, (member) => {
        const embed = new EmbedBuilder()
            .setTitle('📤 Membro Saiu')
            .setColor('#ff4757')
            .setDescription(`${member.user.tag} saiu do servidor.\nID: \`${member.id}\``)
            .setTimestamp();
        enviarLog(member.guild, embed);
    });

    // --- 5. BANIMENTOS ---
    client.on(Events.GuildBanAdd, async (ban) => {
        const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
        const log = logs?.entries.first();
        
        const embed = new EmbedBuilder()
            .setTitle('🔨 Usuário Banido')
            .setColor('#c0392b')
            .addFields(
                { name: 'Banido', value: `${ban.user.tag}`, inline: true },
                { name: 'Por', value: `${log?.executor || 'Desconhecido'}`, inline: true },
                { name: 'Motivo', value: `${ban.reason || 'Não informado'}` }
            )
            .setTimestamp();
        enviarLog(ban.guild, embed);
    });

    // --- 6. CARGOS E NICKNAMES ---
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const embed = new EmbedBuilder().setTimestamp().setColor('#9b59b6');

        // Nickname
        if (oldMember.nickname !== newMember.nickname) {
            embed.setTitle('👤 Nome Alterado')
                .addFields(
                    { name: 'Usuário', value: `${newMember.user}` },
                    { name: 'Antigo', value: `\`${oldMember.nickname || oldMember.user.username}\``, inline: true },
                    { name: 'Novo', value: `\`${newMember.nickname || newMember.user.username}\``, inline: true }
                );
            enviarLog(newMember.guild, embed);
        }

        // Cargos
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            const add = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            const rem = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

            if (add.size > 0 || rem.size > 0) {
                embed.setTitle('🛡️ Cargos Atualizados').setDescription(`Modificação para ${newMember.user}`);
                if (add.size > 0) embed.addFields({ name: '✅ Adicionado', value: add.map(r => r).join(', ') });
                if (rem.size > 0) embed.addFields({ name: '❌ Removido', value: rem.map(r => r).join(', ') });
                enviarLog(newMember.guild, embed);
            }
        }
    });

    console.log("✔️ [SISTEMA] Logs globais ativadas com sucesso.");
};