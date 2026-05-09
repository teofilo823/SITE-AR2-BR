const { EmbedBuilder } = require('discord.js');

async function enviarRegras(interaction) {
    const regrasEmbed = new EmbedBuilder()
        .setTitle("📜 Regras do Sistema Ranqueado")
        .setDescription("Estas regras garantem um ambiente justo e competitivo. O descumprimento resultará em penalidades.")
        .setColor("#2B2D31")
        .addFields(
            { 
                name: '1. Modo de Jogo', 
                value: 'Formato mata-mata em equipe (1v1, 2v2, 3v3, 4v4 ou 5v5)\nDuração: 5 ou 10 minutos por rodada\nVitória: Primeira equipe com 5 a 10 vitórias\nAs regras do modo são fixas e não podem ser alteradas.' 
            },
            { 
                name: '2. AFK, Abandono e Desconexão', 
                value: 'Ficar AFK intencionalmente ou abandonar a partida é proibido.\nDesconexões devem ser resolvidas retornando o mais rápido possível.\n\n**Punições:** Derrota automática, perda de ranking/troféus, suspensão temporária, banimento em casos reincidentes.' 
            },
            { 
                name: '3. Sabotagem de Partida', 
                value: 'Proibido prejudicar sua própria equipe:\n• Matar companheiros de equipe\n• Bloquear ou atrapalhar aliados\n• Jogar propositalmente mal\n• Recusar participação nas rodadas\n\n**Punição:** Desclassificação imediata da partida, suspensão, podendo evoluir para banimento permanente.' 
            },
            { 
                name: '4. Exploração de Bugs', 
                value: 'Explorar bugs, glitches ou mecânicas não intencionais para obter vantagem é proibido, mesmo que outros estejam usando.\n\n**Punições:** Anulação da partida, suspensão do ranqueado, banimento conforme gravidade.\n\nRelatar bugs é permitido e incentivado.' 
            },
            { 
                name: '5. Uso de Cheats', 
                value: 'Proibido o uso de qualquer ferramenta de terceiros:\nAimbot, Wallhack, Speed Hack, ESP, injeções externas, modificações não autorizadas.\n\n**Punição:** Banimento permanente imediato, sem aviso prévio e sem possibilidade de recurso.' 
            },
            { 
                name: '6. Macros, Scripts e Automação', 
                value: 'Qualquer tipo de macro, script ou alteração de arquivos que gere vantagem injusta é proibido.\nExemplos: Scripts de no-recoil, automação de ações, softwares auxiliares de input.\n\n**Punições:** Suspensão temporária, reset de ranking ou banimento permanente conforme gravidade.' 
            },
            { 
                name: '7. Sistema de Denúncia', 
                value: 'Denúncias podem ser feitas durante ou após a partida pela área de suporte.\nTodas as denúncias são analisadas pela administração.\n\nDenúncias falsas ou feitas de má-fé resultarão em punições, incluindo suspensão.' 
            },
            { 
                name: '8. Contas Alternativas', 
                value: 'Criar ou utilizar contas alternativas para evitar punições, manipular ranking ou obter vantagem injusta é proibido.\n\n**Punições:** Banimento das contas envolvidas, banimento por IP, bloqueio permanente no sistema ranqueado.' 
            }
        );

    return await interaction.reply({ 
        embeds: [regrasEmbed], 
        ephemeral: false
    });
}

module.exports = { enviarRegras };