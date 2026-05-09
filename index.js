require('dotenv').config();
// Adicionado PermissionFlagsBits na linha abaixo:
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, ChannelType, Events, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path'); // Recomendo adicionar isso para o sistema de arquivos
const { exec } = require('child_process');
const { executarBan, loadBans, listarPunidos } = require('./bans.js');
const { enviarRegras } = require('./regra.js');
const { executarTrocaTime } = require('./trocartime.js');
const { executarCastigo } = require('./castigo.js');
const { executarDespunir } = require('./despunir.js');
const { executarLimpar } = require('./limpar.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,   // Para ver o texto das mensagens
        GatewayIntentBits.GuildModeration   // Para ver Banimentos e Audit Log
    ]
});

require("./welcome")(client);
require("./videonovo")(client);
require('./logs.js')(client);
require('./antigolpe.js')(client);
const triosPath = './trios.json';
// No topo do index.js
const { executarMudarNome } = require('./mudarnome.js');
require('./ia_interacao.js')(client);

const DB_PATH = './database.json';

// --- FUNÇÃO DE SINCRONIZAÇÃO COM AVISO EM WEBHOOK ---
async function syncToGitHub(detalhesErro = null) {
    const WEBHOOK_ALERTA = "https://discord.com/api/webhooks/1500929968702492674/oYoSNWQ6Oe-dbOnR9Nwcg3Z-rrZAcur05XIvzk_V5MLAxdWFJR4pmuhhokcMa1X3HHhK";

    // Função interna para mandar o erro pro seu Discord
    const avisarNoDiscord = async (msg, erroBruto) => {
        const conteudo = {
            embeds: [{
                title: "⚠️ Alerta de Erro no Bot",
                description: msg,
                color: 16711680, // Vermelho
                fields: [
                    { name: "Erro Técnico:", value: `\`\`\`js\n${erroBruto.toString().slice(0, 500)}\n\`\`\`` }
                ],
                timestamp: new Date()
            }]
        };
        await fetch(WEBHOOK_ALERTA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conteudo)
        }).catch(() => console.log("Falha ao enviar log para o Webhook."));
    };

    try {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            return console.log("⚠️ GITHUB_TOKEN não configurado.");
        }

        const REPO_URL = `https://${GITHUB_TOKEN}@github.com/teofilo823/SITE-AR2-BR.git`;
        const command = `git config user.email "bot@discloud.app" && git config user.name "AR2-Bot" && git add database.json && git commit -m "Auto-update" && git push ${REPO_URL} main`;

        exec(command, (err, stdout, stderr) => {
            if (err) {
                // Ignora se for apenas "nada para commitar"
                if (stderr.includes("nothing to commit") || stdout.includes("up-to-date")) return;
                
                // Se for erro real, avisa no Webhook mas não trava o bot
                avisarNoDiscord("Falha ao atualizar o site no GitHub.", stderr || err.message);
                return;
            }
            console.log("✅ Site atualizado.");
        });

    } catch (error) {
        // Captura qualquer erro de código e manda pro webhook
        avisarNoDiscord("Erro interno na função de sincronização.", error);
    }
}

// --- SISTEMA ANTI-CRASH GLOBAL ---
process.on('uncaughtException', async (err) => {
    console.error('Capturado erro não tratado:', err);
    const WEBHOOK_ALERTA = "https://discord.com/api/webhooks/1500929968702492674/oYoSNWQ6Oe-dbOnR9Nwcg3Z-rrZAcur05XIvzk_V5MLAxdWFJR4pmuhhokcMa1X3HHhK";
    
    // Tenta avisar no Discord antes de seguir
    try {
        await fetch(WEBHOOK_ALERTA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "🚨 **O BOT SOFREU UM ERRO CRÍTICO, MAS CONTINUA ONLINE:**\n```js\n" + err.stack.slice(0, 1500) + "\n```"
            })
        });
    } catch (e) { console.log("Erro ao enviar para o webhook"); }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Rejeição não tratada em:', promise, 'motivo:', reason);
});

const ELO_ROLES = {
    LENDA: "1489554010443612160", // Único
    
    MESTRE_III: "1502323938762428517",
    MESTRE_II: "1502323919296790748",
    MESTRE_I: "1489532036325576725",

    DIAMANTE_III: "1502323873146867923",
    DIAMANTE_II: "1502323852749832346",
    DIAMANTE_I: "1489372849256005775",

    PLATINA_III: "1502323800346198097",
    PLATINA_II: "1502323780863655957",
    PLATINA_I: "1489373482251718888",

    OURO_III: "1502323732537016540",
    OURO_II: "1502323712580518030",
    OURO_I: "1475532118632169738",

    PRATA_III: "1502323664186638336",
    PRATA_II: "1502323644972666972",
    PRATA_I: "1475532232839135315",

    BRONZE_III: "1502323590073417858",
    BRONZE_II: "1502323548377710605",
    BRONZE_I: "1475532508056653905"
};

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        const schema = { users: {}, matches: [], lastMatchId: 0 };
        fs.writeFileSync(DB_PATH, JSON.stringify(schema, null, 4));
        return schema;
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) { 
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4)); 
    syncToGitHub(); // Envia para o site toda vez que salvar
}

const IMAGES = {
    INICIO: "https://cdn.discordapp.com/attachments/1306345894085525545/1451243127410262148/AR2.png",
    FIM: "https://cdn.discordapp.com/attachments/1306345894085525545/1451243214093815808/AR2_1.png",
    CANCELADO: "https://cdn.discordapp.com/attachments/1306345894085525545/1451460518588973108/AR2_2.png",
    TROCA: "https://cdn.discordapp.com/attachments/1306345894085525545/1451461658428833836/AR2_4.png",
    ANULADO: "https://cdn.discordapp.com/attachments/1306345894085525545/1451460703172165723/AR2_3.png"
};

function calculatePoints(currentTrophies, win) {
    const trophies = currentTrophies || 0;

    if (win) {
        // --- LÓGICA DE GANHO ---
        let gain = 30 - Math.floor(trophies / 60); 
        return Math.max(10, gain); 
    } else {
        // --- LÓGICA DE PERDA ---
        let loss = 15 + Math.floor(trophies / 35); 
        return Math.min(60, loss); 
    }
}

async function updateEloRoles(member, trophies) {
    try {
        // Verifica se o membro existe e se o bot pode mexer nele (hierarquia)
        if (!member || !member.manageable) return;

        // 1. Determina qual o cargo correto baseado nos troféus
        let roleToAdd;
        let eloNome;
        let eloCor;

        // --- LENDA ---
        if (trophies >= 4000) { roleToAdd = ELO_ROLES.LENDA; eloNome = "LENDA 🏆"; eloCor = "#ff0000"; }

        // --- MESTRE ---
        else if (trophies >= 3500) { roleToAdd = ELO_ROLES.MESTRE_III; eloNome = "MESTRE III 🔥"; eloCor = "#9b59b6"; }
        else if (trophies >= 3000) { roleToAdd = ELO_ROLES.MESTRE_II; eloNome = "MESTRE II 🔥"; eloCor = "#9b59b6"; }
        else if (trophies >= 2500) { roleToAdd = ELO_ROLES.MESTRE_I; eloNome = "MESTRE I 🔥"; eloCor = "#9b59b6"; }

        // --- DIAMANTE ---
        else if (trophies >= 2200) { roleToAdd = ELO_ROLES.DIAMANTE_III; eloNome = "DIAMANTE III 💎"; eloCor = "#3498db"; }
        else if (trophies >= 1900) { roleToAdd = ELO_ROLES.DIAMANTE_II; eloNome = "DIAMANTE II 💎"; eloCor = "#3498db"; }
        else if (trophies >= 1600) { roleToAdd = ELO_ROLES.DIAMANTE_I; eloNome = "DIAMANTE I 💎"; eloCor = "#3498db"; }

        // --- PLATINA ---
        else if (trophies >= 1350) { roleToAdd = ELO_ROLES.PLATINA_III; eloNome = "PLATINA III ❄️"; eloCor = "#2ecc71"; }
        else if (trophies >= 1100) { roleToAdd = ELO_ROLES.PLATINA_II; eloNome = "PLATINA II ❄️"; eloCor = "#2ecc71"; }
        else if (trophies >= 900)  { roleToAdd = ELO_ROLES.PLATINA_I; eloNome = "PLATINA I ❄️"; eloCor = "#2ecc71"; }

        // --- OURO ---
        else if (trophies >= 780)  { roleToAdd = ELO_ROLES.OURO_III; eloNome = "OURO III ⭐"; eloCor = "#f1c40f"; }
        else if (trophies >= 660)  { roleToAdd = ELO_ROLES.OURO_II; eloNome = "OURO II ⭐"; eloCor = "#f1c40f"; }
        else if (trophies >= 550)  { roleToAdd = ELO_ROLES.OURO_I; eloNome = "OURO I ⭐"; eloCor = "#f1c40f"; }

        // --- PRATA ---
        else if (trophies >= 450)  { roleToAdd = ELO_ROLES.PRATA_III; eloNome = "PRATA III 🥈"; eloCor = "#95a5a6"; }
        else if (trophies >= 350)  { roleToAdd = ELO_ROLES.PRATA_II; eloNome = "PRATA II 🥈"; eloCor = "#95a5a6"; }
        else if (trophies >= 250)  { roleToAdd = ELO_ROLES.PRATA_I; eloNome = "PRATA I 🥈"; eloCor = "#95a5a6"; }

        // --- BRONZE ---
        else if (trophies >= 160)  { roleToAdd = ELO_ROLES.BRONZE_III; eloNome = "BRONZE III 🥉"; eloCor = "#e67e22"; }
        else if (trophies >= 80)   { roleToAdd = ELO_ROLES.BRONZE_II; eloNome = "BRONZE II 🥉"; eloCor = "#e67e22"; }
        else { roleToAdd = ELO_ROLES.BRONZE_I; eloNome = "BRONZE I 🥉"; eloCor = "#e67e22"; }

        // 2. Filtra apenas IDs válidos para evitar o erro de "InvalidType"
        const allEloRoles = Object.values(ELO_ROLES).filter(id => id && typeof id === 'string');

        // 3. Verifica se o cargo destino é válido
        if (!roleToAdd) {
            console.log(`[ELO] Erro: Cargo para ${trophies} troféus não definido.`);
            return;
        }

        // 4. Só executa se o membro NÃO tiver o cargo que deveria ter
        if (!member.roles.cache.has(roleToAdd)) {
            
            // Remove todos os cargos de ELO que o usuário possui atualmente
            const rolesToRemove = allEloRoles.filter(roleID => member.roles.cache.has(roleID));
            
            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove).catch(e => console.error("Erro ao remover elos antigos:", e.message));
            }

            // Adiciona o novo cargo
            await member.roles.add(roleToAdd).catch(err => {
                console.error(`[ELO] Erro ao dar cargo ${roleToAdd} para ${member.user.username}:`, err.message);
            });

            console.log(`[ELO] ${member.user.username} atualizado! Troféus: ${trophies} | Cargo: ${eloNome}`);

            // --- SISTEMA DE NOTIFICAÇÃO NO PV ---
            const { EmbedBuilder } = require('discord.js');
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎊 ALTERAÇÃO DE RANK!')
                .setColor(eloCor)
                .setDescription(`Parabéns! Você demonstrou habilidade e acaba de subir de nível no servidor.`)
                .addFields(
                    { name: '📈 Novo Elo', value: `**${eloNome}**`, inline: true },
                    { name: '🏆 Troféus', value: `\`${trophies}\``, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Continue assim e chegue ao topo!' })
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] }).catch(() => {
                console.log(`[ELO] Não foi possível enviar PV para ${member.user.username} (DMs fechadas).`);
            });
            // -------------------------------------
        }
    } catch (e) {
        console.error("Erro crítico ao atualizar elo:", e);
    }
}

client.once(Events.ClientReady, async () => {
    console.log(`🚀 Sistema AR2 Online: ${client.user.tag}`);
    
    // Lista de comandos para registro
    const commands = [
        // Comando Jogo
        new SlashCommandBuilder()
            .setName('jogo')
            .setDescription('Inicia uma partida ranqueada')
            .addStringOption(o => o.setName('formato').setDescription('Tamanho dos times').setRequired(true).addChoices(
                {name:'1v1',value:'1v1'},{name:'2v2',value:'2v2'},{name:'3v3',value:'3v3'},{name:'4v4',value:'4v4'},{name:'5v5',value:'5v5'}
            ))
            .addStringOption(o => o.setName('link').setDescription('Link privado da sala').setRequired(true))
            .addBooleanOption(o => o.setName('participar').setDescription('O Hoster irá jogar?').setRequired(true)),
            
        // Comando Trio
        new SlashCommandBuilder()
            .setName('trio')
            .setDescription('Cria um trio oficial (Você + 2 membros)')
            .addUserOption(o => o.setName('membro2').setDescription('Segundo membro do trio').setRequired(true))
            .addUserOption(o => o.setName('membro3').setDescription('Terceiro membro do trio').setRequired(true)),

        // Comando PermInvite
        new SlashCommandBuilder()
            .setName('perminvite')
            .setDescription('Autoriza um link de convite na lista branca.')
            .addStringOption(o => o.setName('convite').setDescription('O link ou código').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

        // Comando AtivarVIP
        new SlashCommandBuilder().setName('ativarvip').setDescription('Ativa o VIP de um usuário (Apenas Mestres)')
            .addUserOption(o => o.setName('jogador').setDescription('Jogador que receberá VIP').setRequired(true))
            .addStringOption(o => o.setName('tempo').setDescription('Ex: 30d, 7d').setRequired(true)),
        
        // Comando Finalizar
        new SlashCommandBuilder().setName('finalizar').setDescription('Define o vencedor e computa os pontos')
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))
            .addStringOption(o => o.setName('vencedor').setDescription('Time campeão').setRequired(true).addChoices({name:'Time Azul 🔵',value:'blue'},{name:'Time Vermelho 🔴',value:'red'})),
        
        // Comando Anular
        new SlashCommandBuilder().setName('anular').setDescription('Cancela pontos de uma partida já finalizada')
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true)),
            
        // Comando ErrorWin
        new SlashCommandBuilder()
            .setName('errorwin')
            .setDescription('Corrige o vencedor de uma partida lançada errada')
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida finalizada').setRequired(true)),
            
        // Comando TirarADV
        new SlashCommandBuilder()
            .setName('tiraradv')
            .setDescription('Remove uma advertência de um membro da equipe')
            .addUserOption(o => o.setName('jogador').setDescription('Membro que terá a ADV removida').setRequired(true))
            .addStringOption(o => 
                o.setName('tipo')
                    .setDescription('Selecione o nível da advertência para remover')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Advertência 1', value: 'adv1' },
                        { name: 'Advertência 2', value: 'adv2' },
                        { name: 'Advertência 3', value: 'adv3' }
                    ))
            .addStringOption(o => o.setName('motivo').setDescription('Motivo da remoção').setRequired(true)),

        // Comando Castigo
        new SlashCommandBuilder()
            .setName('castigo')
            .setDescription('Aplica um castigo (timeout) no jogador')
            .addUserOption(o => o.setName('jogador').setDescription('Alvo do castigo').setRequired(true))
            .addStringOption(o => 
                o.setName('tempo')
                    .setDescription('Ex: 30m, 1h, 7d, 1s (Máximo 28 dias)')
                    .setRequired(true))
            .addStringOption(o => 
                o.setName('motivo')
                    .setDescription('Descreva o motivo da punição')
                    .setRequired(true)),

        // Comando Regras
        new SlashCommandBuilder().setName('regras').setDescription('Exibe as regras oficiais do sistema ranqueado'),
        
        // Comando MudarNome
        new SlashCommandBuilder()
            .setName('mudarnome')
            .setDescription('Muda o seu próprio apelido no servidor.')
            .addStringOption(option => 
                option.setName('novonome')
                    .setDescription('O novo nome que você deseja usar')
                    .setRequired(true)),

        // Comando Despunir
        new SlashCommandBuilder()
            .setName('despunir')
            .setDescription('Remove banimentos e castigos de um jogador')
            .addStringOption(o => 
                o.setName('jogador')
                    .setDescription('Mencione ou cole o ID do jogador (útil para quem já foi banido)')
                    .setRequired(true)),

        // Comando Punidos
        new SlashCommandBuilder().setName('punidos').setDescription('Lista todos os jogadores banidos das ranqueadas'),
        
        // Comando Cancelar
        new SlashCommandBuilder().setName('cancelar').setDescription('Cancela uma partida em andamento')
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true)),
        
        // Comando Leaderboard
        new SlashCommandBuilder().setName('leaderboard').setDescription('Mostra o Top 10 da temporada'),
        
        // Comando Stats
        new SlashCommandBuilder().setName('stats').setDescription('Ver o perfil de troféus')
            .addUserOption(o => o.setName('jogador').setDescription('Selecione o jogador').setRequired(true)),

        // Comando Ban
        new SlashCommandBuilder().setName('ban').setDescription('Bane o jogador das ranqueadas')
            .addUserOption(o => o.setName('jogador').setDescription('Alvo').setRequired(true))
            .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true)),

        // Comando TrocaTime
        new SlashCommandBuilder().setName('trocatime').setDescription('Inverte dois jogadores de time (Azul <-> Vermelho)')
            .addUserOption(o => o.setName('azul').setDescription('Jogador que está no AZUL').setRequired(true))
            .addUserOption(o => o.setName('vermelho').setDescription('Jogador que está no VERMELHO').setRequired(true))
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true)),
            
        // Comando ADV
        new SlashCommandBuilder()
            .setName('adv')
            .setDescription('Aplica uma advertência a um membro da equipe')
            .addUserOption(o => 
                o.setName('jogador')
                    .setDescription('Membro da equipe que receberá a punição')
                    .setRequired(true))
            .addStringOption(o => 
                o.setName('tipo')
                    .setDescription('Selecione o nível da advertência')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Advertência 1', value: 'adv1' },
                        { name: 'Advertência 2', value: 'adv2' },
                        { name: 'Advertência 3 (Remove Cargos)', value: 'adv3' }
                    ))
            .addStringOption(o => 
                o.setName('motivo')
                    .setDescription('Descreva o motivo da advertência')
                    .setRequired(true)),
            
        // Comando Limpar
        new SlashCommandBuilder()
            .setName('limpar')
            .setDescription('Limpa mensagens do chat')
            .addIntegerOption(o => o.setName('numero').setDescription('Quantidade de mensagens (1-100)').setRequired(true)),
    
        // Comando Troféus
        new SlashCommandBuilder()
            .setName('troféus')
            .setDescription('Adiciona ou remove troféus')
            .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade').setRequired(true))
            .addUserOption(o => o.setName('jogador').setDescription('Jogador alvo').setRequired(true))
            .addStringOption(o => o.setName('motivo').setDescription('Motivo da alteração').setRequired(true)),
        
        // Comando Trocar
        new SlashCommandBuilder().setName('trocar').setDescription('Substitui jogadores em jogo')
            .addUserOption(o => o.setName('saindo').setDescription('Jogador que sairá').setRequired(true))
            .addUserOption(o => o.setName('entrando').setDescription('Jogador que entrará').setRequired(true))
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))

    ].map(command => command.toJSON()); // Agora sim, fecha o array de todos os comandos aqui!

    try {
        const guild = client.guilds.cache.get('1305832132328947743');
        if (guild) {
            await guild.commands.set(commands);
            console.log(`✅ Comandos registrados na Guild: ${guild.name}`);
        }
    } catch (error) {
        console.error("❌ Erro ao registrar comandos na Guild:", error);
    }
});

client.on(Events.InteractionCreate, async i => {
    if (!i.isChatInputCommand()) return;
    const db = loadDB();
    const listBans = loadBans();
const staffRolesStr = process.env.STAFF_ROLES || "";
    const staffRolesArray = staffRolesStr.split(',').map(id => id.trim());
    const isStaff = i.member.roles.cache.some(role => staffRolesArray.includes(role.id));
    const isMestre = i.member.roles.cache.has(process.env.CARGO_MESTRE_HOSTER?.trim());
    const isHost = i.member.roles.cache.has(process.env.CARGO_HOSTER?.trim()) || isMestre;

    if (i.commandName === 'ban') {
        if (!isMestre) return i.reply("❌ Apenas mestres podem banir.");
        return executarBan(i);
    }
    
if (i.commandName === 'troféus') {
        if (!isStaff) {
            return i.reply({ content: "❌ Acesso negado. Apenas membros da Staff autorizada podem usar este comando.", ephemeral: true });
        }
        const { executarTrofeus } = require('./trofeus.js');
        return executarTrofeus(i, db, saveDB, updateNick);
    }
    
    if (i.commandName === 'errorwin') {
    if (!isMestre) return i.reply({ content: "❌ Apenas mestres podem corrigir resultados.", ephemeral: true });
    const { executarErrorWin } = require('./errorwin.js');
    return executarErrorWin(i, db, saveDB, updateNick, calculatePoints);
}

    if (i.commandName === 'punidos') {
        if (!isMestre) {
            return i.reply({ content: "❌ Apenas **Mestres** podem ver a lista de punidos.", flags: [64] });
        }
        return listarPunidos(i);
    }

    if (i.commandName === 'despunir') {
        if (!isMestre) return i.reply({ content: "❌ Apenas mestres podem despunir.", flags: [64] });
        return executarDespunir(i);
    }

    if (i.commandName === 'castigo') {
        if (!isMestre) return i.reply({ content: "❌ Apenas mestres podem aplicar castigos.", ephemeral: true });
        return executarCastigo(i);
    }
    
    if (i.commandName === 'limpar') {
    return executarLimpar(i);
}

    // Lógica do comando de regras
    if (i.commandName === 'regras') {
        return enviarRegras(i);
    }
    
if (i.commandName === 'mudarnome') {
        const comando = require('./mudarnome.js');
        // Usamos "i" porque é o nome que você deu lá no topo: async i =>
        await comando.execute(i); 
    }
    
    else if (i.commandName === 'adv') {
        // Verifica se é Staff ou Mestre antes de tentar carregar o arquivo
        const staffRoles = (process.env.STAFF_ROLES || "").split(',').map(id => id.trim());
        const isStaff = i.member.roles.cache.some(role => staffRoles.includes(role.id));
        const isMestre = i.member.roles.cache.has(process.env.CARGO_MESTRE_HOSTER?.trim());

        if (!isStaff && !isMestre) {
            return i.reply({ content: "❌ Você não tem permissão para usar este comando.", flags: [64] });
        }

        try {
            // Caminho para o arquivo adv.js
            const advModule = require('./adv.js');
            
            // Executa a função principal do arquivo (geralmente run ou execute)
            // Se o seu adv.js exportar como 'execute', mude para advModule.execute
            await advModule.run(client, i);

            // Deleta o cache para permitir atualizações no arquivo em tempo real
            delete require.cache[require.resolve('./adv.js')];
            
        } catch (error) {
            console.error("Erro ao carregar o comando adv.js:", error);
            await i.reply({ content: "❌ Ocorreu um erro ao processar a advertência. Verifique o console.", flags: [64] });
        }
    }

if (i.commandName === 'jogo') {

        if (!isHost) return i.reply({ content: "❌ Sem permissão.", flags: [64] });

        await i.deferReply();



        const formatoStr = i.options.getString('formato');

        const formatoNum = parseInt(formatoStr.split('v')[0]);

        const link = i.options.getString('link');

        const querParticipar = i.options.getBoolean('participar');

        const callPrincipal = i.guild.channels.cache.get(process.env.CALL_PRINCIPAL?.trim());



        if (!callPrincipal) return i.editReply("❌ Call principal não encontrada.");



        // Filtra membros: remove banidos

        let membrosDisponiveis = Array.from(callPrincipal.members.values()).filter(m => !listBans[m.id]);

        

        // --- LÓGICA DE TRIO CONFIGURADA ---

        const TRIOS_PATH = './trios.json';

        const triosData = fs.existsSync(TRIOS_PATH) ? JSON.parse(fs.readFileSync(TRIOS_PATH, 'utf8')) : {};

        let tAzul = [];

        let tVermelho = [];

        let sorteados = [];

        let trioParaTravarNoTime = []; // Variável para garantir que o trio fique no mesmo time



        // 1. Garante a vaga do Hoster primeiro (se ele participar)

        if (querParticipar) {

            const hosterMembro = membrosDisponiveis.find(m => m.id === i.user.id);

            if (!hosterMembro) return i.editReply("❌ Você marcou que vai jogar, mas não está na Call Principal!");

            sorteados.push(hosterMembro);

            membrosDisponiveis = membrosDisponiveis.filter(m => m.id !== i.user.id);

        } else {

            membrosDisponiveis = membrosDisponiveis.filter(m => m.id !== i.user.id);

        }



        // 2. Lógica de Agrupamento por Trio (Apenas 3v3, 4v4 e 5v5)

        // Regra: 5v5 puxa 3 juntos. 3v3 e 4v4 puxa 2 juntos. 2v2 separa tudo.

        if (formatoStr !== '1v1' && formatoStr !== '2v2') {

            for (const donoID in triosData) {

                const membrosTrioIds = triosData[donoID];

                

                // Verifica quem do trio está na call (incluindo o hoster se ele for do trio)

                const presentesDoTrio = [...sorteados, ...membrosDisponiveis].filter(m => membrosTrioIds.includes(m.id));



                if (presentesDoTrio.length >= 2) {

                    // Define quantos vão ficar juntos baseado no modo

                    let qtdTravar = (formatoStr === '5v5') ? 3 : 2;

                    let grupoParaTravar = presentesDoTrio.slice(0, qtdTravar);



                    // Adiciona os membros selecionados à lista de sorteados e reserva para o mesmo time

                    for (const player of grupoParaTravar) {

                        if (!sorteados.find(s => s.id === player.id)) {

                            if (sorteados.length < (formatoNum * 2)) {

                                sorteados.push(player);

                                membrosDisponiveis = membrosDisponiveis.filter(m => m.id !== player.id);

                            }

                        }

                    }

                    

                    // Guarda quem deve obrigatoriamente ficar no Time 1 (Azul)

                    trioParaTravarNoTime = sorteados.filter(s => grupoParaTravar.some(g => g.id === s.id));

                    break; // Processa apenas um trio por partida

                }

            }

        }



        // 3. Completar as vagas restantes aleatoriamente

        const vagasFaltantes = (formatoNum * 2) - sorteados.length;

        if (membrosDisponiveis.length < vagasFaltantes) {

            return i.editReply(`❌ Jogadores insuficientes. Faltam ${vagasFaltantes - membrosDisponiveis.length} pessoas na call.`);

        }



        if (vagasFaltantes > 0) {

            const restantesSorteados = membrosDisponiveis.sort(() => 0.5 - Math.random()).slice(0, vagasFaltantes);

            sorteados.push(...restantesSorteados);

        }



        // 4. Distribuição Final nos Times

        // Primeiro: Colocamos o trio travado no Time Azul

        tAzul.push(...trioParaTravarNoTime);



        // Segundo: Pegamos quem sobrou (que não estava no trio travado) e embaralhamos

        let sobraDoSorteio = sorteados.filter(p => !trioParaTravarNoTime.some(t => t.id === p.id));

        sobraDoSorteio = sobraDoSorteio.sort(() => 0.5 - Math.random());



        // Terceiro: Preenchemos as vagas restantes

        sobraDoSorteio.forEach(player => {

            if (tAzul.length < formatoNum) {

                tAzul.push(player);

            } else {

                tVermelho.push(player);

            }

        });



        // --- FIM DA LÓGICA DE TRIO ---



        // Criação dos Canais

        const cVermelho = await i.guild.channels.create({ 

            name: `🔴 TIME VERMELHO`, 

            type: ChannelType.GuildVoice, 

            parent: process.env.CATEGORIA_CALLS?.trim(),

            userLimit: formatoNum 

        });

        

        const cAzul = await i.guild.channels.create({ 

            name: `🔵 TIME AZUL`, 

            type: ChannelType.GuildVoice, 

            parent: process.env.CATEGORIA_CALLS?.trim(),

            userLimit: formatoNum 

        });



        // Movimentação dos membros

        for (const m of tVermelho) await m.voice.setChannel(cVermelho).catch(()=>{});

        for (const m of tAzul) await m.voice.setChannel(cAzul).catch(()=>{});



        // Registro de novos usuários no banco de dados

        sorteados.forEach(m => {

            if (!db.users[m.id]) {

                db.users[m.id] = { name: m.user.username, trophies: 0, wins: 0, losses: 0, total: 0 };

            } else {

                db.users[m.id].name = m.user.username; 

            }

        });



        // Salva a partida

        db.lastMatchId++;

        const match = { 

            id: db.lastMatchId, 

            host_id: i.user.id, 

            blue: tAzul.map(m=>m.id), 

            red: tVermelho.map(m=>m.id), 

            callA: cAzul.id, 

            callV: cVermelho.id, 

            status: 'PROGRESS', 

            format: formatoStr, 

            link: link 

        };

        db.matches.push(match);

        saveDB(db);



        // Embed Público

        const pubEmbed = new EmbedBuilder()

            .setAuthor({ name: `Hoster Responsável: ${i.user.username}`, iconURL: i.user.displayAvatarURL() })

            .setTitle("⚔️ CONFRONTO INICIADO")

            .setDescription(`A partida **#${match.id}** foi criada! Link na DM.`)

            .setColor("#2B2D31")

            .setImage(IMAGES.INICIO)

            .addFields(

                { name: '🟦 TIME AZUL', value: tAzul.join('\n') || 'Vazio', inline: true },

                { name: '🟥 TIME VERMELHO', value: tVermelho.join('\n') || 'Vazio', inline: true },

                { name: '📋 INFO', value: `\`\`\`ID: #${match.id}\nMODO: ${match.format}\nHOST: ${i.user.tag}\`\`\`` }

            );



        await i.editReply({ embeds: [pubEmbed] });



        // Envio das DMs individuais

        sorteados.forEach(m => {

            const isBlue = tAzul.some(p => p.id === m.id);

            const dmEmbed = new EmbedBuilder()

                .setTitle(`🎮 Partida V-${match.id}`)

                .setColor(isBlue ? "#3498db" : "#e74c3c")

                .addFields(

                    { name: "Formato", value: formatoStr, inline: true },

                    { name: "Seu time", value: isBlue ? "🔵 Azul" : "🔴 Vermelho", inline: true },

                    { name: "Link da partida", value: link, inline: false },

                    { name: "Call", value: `\`AR2 Brasil [BR] › # ${isBlue ? "Azul" : "Vermelho"}\``, inline: false }

                );

            m.send({ embeds: [dmEmbed] }).catch(() => {});

        });

    }
    
else if (i.commandName === 'trocatime') {
        // Verifica se é Mestre (ou Hoster, dependendo da sua regra, mas você pediu Mestre)
        if (!isMestre) return i.reply({ content: "❌ Apenas mestres podem usar este comando.", ephemeral: true });

        // Chama a função externa que já contém o sistema de logs "Tudo Mesmo"
        return executarTrocaTime(i, db, saveDB);
    }
    
else if (i.commandName === 'ativarvip') {
    const ativarVipModulo = require('./ativarvip.js');
    await ativarVipModulo.execute(i); 
}

else if (i.commandName === 'trio') {
    const roleVIP = '1489323717791187096';
    if (!i.member.roles.cache.has(roleVIP)) return i.reply({ content: '❌ Apenas membros VIP podem formar trios.', flags: [64] });
    
    // Carrega o comando externo
    const trioCmd = require('./trio.js');
    return trioCmd.execute(i);
}

else if (i.commandName === 'finalizar') {

        // 1. AVISAR O DISCORD QUE O BOT ESTÁ PROCESSANDO (EVITA TIMEOUT/UNKNOWN INTERACTION)
        await i.deferReply();

        const id = i.options.getInteger('id');
        const winner = i.options.getString('vencedor');
        const m = db.matches.find(x => x.id === id && x.status === 'PROGRESS');

        if (!m) return i.editReply("❌ Partida não encontrada.");
        if (m.host_id !== i.user.id && !isMestre) return i.editReply("❌ Sem permissão.");

        const isBlueWin = winner === 'blue';
        const winIds = isBlueWin ? m.blue : m.red;
        const loseIds = isBlueWin ? m.red : m.blue;

        let blueDetails = [];
        let redDetails = [];
        let pointRegistry = {};

        // Checa se é X1 para anular troféus
        const isX1 = m.format === '1v1';

        // --- PROCESSANDO VENCEDORES ---
        for (const uid of winIds) {
            const member = await i.guild.members.fetch(uid).catch(() => null);
            const currentName = member ? member.user.username : "Desconhecido";

            if (!db.users[uid]) db.users[uid] = { trophies: 0, wins: 0, losses: 0, total: 0 };
            db.users[uid].name = currentName; 
            
            // SALVA O AVATAR DO VENCEDOR
            if (member && member.user) db.users[uid].avatar = member.user.avatar;

            // Se for X1, ganha 0 pontos
            const gain = isX1 ? 0 : calculatePoints(db.users[uid].trophies, true);
            
            db.users[uid].trophies += gain;
            db.users[uid].wins = (db.users[uid].wins || 0) + 1;
            db.users[uid].total = (db.users[uid].total || 0) + 1;
            
            pointRegistry[uid] = gain;
            
            // Atualiza Nick e ELO (Funções blindadas)
            updateNick(i.guild, uid, db.users[uid].trophies); 
            if (member) await updateEloRoles(member, db.users[uid].trophies).catch(() => {});
            
            const mention = `<@${uid}>`;
            if (isBlueWin) blueDetails.push(`${mention} ${isX1 ? '(XP)' : `(+${gain})`}`);
            else redDetails.push(`${mention} ${isX1 ? '(XP)' : `(+${gain})`}`);
        }

        // --- PROCESSANDO PERDEDORES ---
        for (const uid of loseIds) {
            const member = await i.guild.members.fetch(uid).catch(() => null);
            const currentName = member ? member.user.username : "Desconhecido";

            if (!db.users[uid]) db.users[uid] = { trophies: 0, wins: 0, losses: 0, total: 0 };
            db.users[uid].name = currentName; 

            // SALVA O AVATAR DO PERDEDOR
            if (member && member.user) db.users[uid].avatar = member.user.avatar;

            // Se for X1, perde 0 pontos
            const loss = isX1 ? 0 : calculatePoints(db.users[uid].trophies, false);
            
            db.users[uid].trophies = Math.max(0, db.users[uid].trophies - loss);
            db.users[uid].losses = (db.users[uid].losses || 0) + 1;
            db.users[uid].total = (db.users[uid].total || 0) + 1;
            
            pointRegistry[uid] = loss;

            // Atualiza Nick e ELO (Funções blindadas)
            updateNick(i.guild, uid, db.users[uid].trophies);
            if (member) await updateEloRoles(member, db.users[uid].trophies).catch(() => {});

            const mention = `<@${uid}>`;
            if (isBlueWin) redDetails.push(`${mention} ${isX1 ? '(XP)' : `(-${loss})`}`);
            else blueDetails.push(`${mention} ${isX1 ? '(XP)' : `(-${loss})`}`);
        }

        // --- LIMPANDO CANAIS E FINALIZANDO ---
        [m.callA, m.callV].forEach(async cid => {
            const ch = i.guild.channels.cache.get(cid);
            if (ch) {
                for (const mem of ch.members.values()) await mem.voice.setChannel(process.env.CALL_PRINCIPAL).catch(()=>{});
                setTimeout(() => ch.delete().catch(()=>{}), 3000);
            }
        });

        m.status = 'FINISHED'; 
        m.winner = winner; 
        m.registry = pointRegistry;
        saveDB(db);

        // --- EMBED FINAL ---
        const endEmbed = new EmbedBuilder()
            .setImage(IMAGES.FIM)
            .setTimestamp();

        if (isX1) {
            endEmbed
                .setTitle(isBlueWin ? "⚔️ DUELO FINALIZADO: VITÓRIA AZUL" : "⚔️ DUELO FINALIZADO: VITÓRIA VERMELHA")
                .setColor("#95a5a6") 
                .setDescription("⚠️ **Esta partida de X1 não contabiliza troféus para o Ranking.**")
                .addFields(
                    { name: '🟦 DUELISTA AZUL', value: blueDetails.join('\n') || 'Vazio', inline: true },
                    { name: '🟥 DUELISTA VERMELHO', value: redDetails.join('\n') || 'Vazio', inline: true },
                    { name: '📋 INFO', value: `\`\`\`ID: #${m.id}\nMODO: X1 (TREINO)\nHOST: ${i.user.tag}\`\`\`` }
                );
        } else {
            endEmbed
                .setTitle(isBlueWin ? "🏆 VITÓRIA: TIME AZUL" : "🏆 VITÓRIA: TIME VERMELHO")
                .setColor(isBlueWin ? "#3498db" : "#e74c3c")
                .addFields(
                    { name: '🟦 TIME AZUL', value: blueDetails.join('\n') || 'Vazio', inline: true },
                    { name: '🟥 TIME VERMELHO', value: redDetails.join('\n') || 'Vazio', inline: true },
                    { name: '📋 INFO', value: `\`\`\`ID: #${m.id}\nMODO: ${m.format}\nHOST: ${i.user.tag}\`\`\`` }
                );
        }

        // 2. USAR EDITREPLY EM VEZ DE REPLY
        await i.editReply({ embeds: [endEmbed] });
    }
    
 else if (i.commandName === 'anular') {

        if (!isMestre) return i.reply("❌ Apenas mestres podem anular.");

        const id = i.options.getInteger('id');

        const m = db.matches.find(x => x.id === id && x.status === 'FINISHED');

        if (!m) return i.reply("❌ Partida não encontrada.");



        const isBlueWin = m.winner === 'blue';

        const winIds = isBlueWin ? m.blue : m.red;

        const loseIds = isBlueWin ? m.red : m.blue;



        winIds.forEach(u => { 

            if(db.users[u]) {

                db.users[u].trophies = Math.max(0, db.users[u].trophies - (m.registry[u] || 0)); 

                if(db.users[u].wins > 0) db.users[u].wins--; 

                if(db.users[u].total > 0) db.users[u].total--;

                updateNick(i.guild, u, db.users[u].trophies); 
            }
        });

        loseIds.forEach(u => { 

            if(db.users[u]) {

                db.users[u].trophies += (m.registry[u] || 0); 

                if(db.users[u].losses > 0) db.users[u].losses--; 

                if(db.users[u].total > 0) db.users[u].total--;

                updateNick(i.guild, u, db.users[u].trophies); 

            }

        });

        

        m.status = 'ANNULLED';

        saveDB(db);

        i.reply({ embeds: [new EmbedBuilder().setTitle("⚠️ PARTIDA ANULADA").setImage(IMAGES.ANULADO).setColor("#FF3E3E")] });

    }



    else if (i.commandName === 'leaderboard') {

        const sorted = Object.entries(db.users).sort((a,b) => b[1].trophies - a[1].trophies).slice(0, 10);

        const list = sorted.map(([id, d], index) => `**${index+1}º** <@${id}> — \`${d.trophies}\` 🏆`).join('\n');

        

        return i.reply({ 

            embeds: [new EmbedBuilder().setTitle("🏆 RANKING TEMPORADA").setDescription(list || "Sem dados.").setColor("#F1C40F")],

            ephemeral: true 

        });

if (i.commandName === 'stats') {
        const target = i.options.getUser('jogador');
        const data = db.users[target.id] || { trophies: 0, wins: 0, losses: 0, total: 0 };
        
        const trophies = data.trophies || 0;
        const wins = data.wins || 0;
        const losses = data.losses || 0;
        const total = data.total || 0;
        const winrate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

        // --- LÓGICA DE ELO ATUALIZADA (SISTEMA NOVO) ---
        let eloNome = "Bronze 🥉";
        let corEmbed = "#cd7f32";
        let proxEloMsg = "";

        if (trophies >= 4000) {
            eloNome = "Mestre 🟣";
            corEmbed = "#9b59b6";
            proxEloMsg = "🏆 Você atingiu o rank máximo do servidor!";
        } else if (trophies >= 2300) {
            eloNome = "Diamante 💎";
            corEmbed = "#3498db";
            proxEloMsg = `📈 Faltam **${4000 - trophies}** troféus para o **Mestre**`;
        } else if (trophies >= 1400) {
            eloNome = "Platina 🛡️";
            corEmbed = "#1abc9c";
            proxEloMsg = `📈 Faltam **${2300 - trophies}** troféus para o **Diamante**`;
        } else if (trophies >= 850) {
            eloNome = "Ouro 👑";
            corEmbed = "#f1c40f";
            proxEloMsg = `📈 Faltam **${1400 - trophies}** troféus para o **Platina**`;
        } else if (trophies >= 500) {
            eloNome = "Prata 🥈";
            corEmbed = "#95a5a6";
            proxEloMsg = `📈 Faltam **${850 - trophies}** troféus para o **Ouro**`;
        } else {
            eloNome = "Bronze 🥉";
            corEmbed = "#cd7f32";
            proxEloMsg = `📈 Faltam **${500 - trophies}** troféus para o **Prata**`;
        }

        const statsEmbed = new EmbedBuilder()
            .setTitle(`📊 Estatísticas de: ${target.username}`)
            .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
            .setThumbnail(target.displayAvatarURL())
            .setColor(corEmbed)
            .addFields(
                { name: '🎖️ Elo Atual', value: `**${eloNome}**`, inline: true },
                { name: '✨ Troféus', value: `\`${trophies}\``, inline: true },
                { name: '🔥 Winrate', value: `\`${winrate}%\``, inline: true },
                { name: '✅ Vitórias', value: `\`${wins}\``, inline: true },
                { name: '❌ Derrotas', value: `\`${losses}\``, inline: true },
                { name: '🎮 Total Jogado', value: `\`${total}\``, inline: true },
                { name: '🚀 Próximo Objetivo', value: proxEloMsg, inline: false }
            )
            .setFooter({ text: `ID do Jogador: ${target.id}` })
            .setTimestamp();

        return i.reply({ embeds: [statsEmbed], flags: [64] });
    }
    
    // AQUI CHAMA O PERMINVITE QUANDO USAREM O CÓDIGO
    else if (i.commandName === 'perminvite') {
        const comando = require('./perminvites.js');
        await comando.execute(i);
    }
    
    else if (i.commandName === 'tiraradv') {
        try {
            // Puxa o arquivo tiraradv.js (verifique se o caminho está correto)
            const command = require('./tiraradv.js'); 
            
            // Executa a função 'run' dentro do arquivo
            await command.run(client, i);
            
            // Remove o cache para permitir edições no arquivo sem reiniciar o bot
            delete require.cache[require.resolve('./tiraradv.js')];
            
        } catch (error) {
            console.error("Erro ao carregar o arquivo tiraradv.js:", error);
            await i.reply({ content: "❌ Erro interno ao executar o comando de remoção de advertência.", ephemeral: true });
        }
    }

else if (i.commandName === 'cancelar') {

        const id = i.options.getInteger('id');

        const m = db.matches.find(x => x.id === id && x.status === 'PROGRESS');

        

        if (!m) return i.reply("❌ Partida não encontrada.");

        

        [m.callA, m.callV].forEach(async cid => {

            const ch = i.guild.channels.cache.get(cid);

            if (ch) {

                for (const mem of ch.members.values()) await mem.voice.setChannel(process.env.CALL_PRINCIPAL).catch(()=>{});

                setTimeout(() => ch.delete().catch(()=>{}), 2000);

            }

        });

        

        m.status = 'CANCELLED'; 

        saveDB(db);



        // Ajuste no Embed para mostrar o ID

        const embedCancelado = new EmbedBuilder()

            .setTitle(`🛑 PARTIDA #${id} CANCELADA`) // ID no Título

            .setDescription(`A partida de ID \`#${id}\` foi encerrada e os canais foram deletados.`) // Opcional: ID na descrição

            .setImage(IMAGES.CANCELADO)

            .setColor("#FF2A2A")

            .setTimestamp();



        i.reply({ embeds: [embedCancelado] });

    }
    
else if (i.commandName === 'trocatime') {

        if (!isMestre) return i.reply({ content: "❌ Apenas mestres podem usar este comando.", ephemeral: true });

        return executarTrocaTime(i, db, saveDB);

    }



        const sai = i.options.getMember('saindo');

        const entra = i.options.getMember('entrando');

        const matchId = i.options.getInteger('id');

        const canalPrincipalId = process.env.CALL_PRINCIPAL?.trim();



        const partida = db.matches.find(m => m.id === matchId && m.status === 'PROGRESS');



        if (!partida) {

            return i.editReply({ content: `❌ Partida **#${matchId}** não encontrada ou já finalizada.` });

        }



        // Validação: O jogador que entra precisa estar na call principal para ser movido

        if (!entra || !entra.voice.channel || entra.voice.channel.id !== canalPrincipalId) {

            return i.editReply({ content: "❌ O membro que está entrando precisa estar na Call Principal." });

        }



        let canalDestinoId = null;

        let timeNome = "";

        let emojiTime = "";



        // 1. Atualiza o Banco de Dados

        if (partida.blue.includes(sai.id)) {

            partida.blue = partida.blue.filter(id => id !== sai.id);

            partida.blue.push(entra.id);

            canalDestinoId = partida.callA;

            timeNome = "Azul";

            emojiTime = "🔵";

        } else if (partida.red.includes(sai.id)) {

            partida.red = partida.red.filter(id => id !== sai.id);

            partida.red.push(entra.id);

            canalDestinoId = partida.callV;

            timeNome = "Vermelho";

            emojiTime = "🔴";

        } else {

            return i.editReply({ content: "❌ O jogador saindo não pertence a esta partida." });

        }



        if (!db.users[entra.id]) {

            db.users[entra.id] = { name: entra.user.username, trophies: 0, wins: 0, losses: 0, total: 0 };

        }



        // 2. Movimentação de Voz

        await sai.voice.setChannel(canalPrincipalId).catch(() => {});

        if (canalDestinoId) await entra.voice.setChannel(canalDestinoId).catch(() => {});



        saveDB(db);



        // 3. Atualiza o Painel do Canal e Envia a DM

        try {

            const mensagens = await i.channel.messages.fetch({ limit: 50 });

            const msgPartida = mensagens.find(m => 

                m.embeds.length > 0 && 

                m.embeds[0].title === "⚔️ CONFRONTO INICIADO" &&

                m.embeds[0].fields.some(f => f.value.includes(`#${matchId}`))

            );



            if (msgPartida) {

                const embedOriginal = msgPartida.embeds[0];

                const novoEmbedCanal = EmbedBuilder.from(embedOriginal);



                const blueList = partida.blue.map(id => `<@${id}>`).join('\n') || 'Vazio';

                const redList = partida.red.map(id => `<@${id}>`).join('\n') || 'Vazio';



                novoEmbedCanal.setFields(

                    { name: '🟦 TIME AZUL', value: blueList, inline: true },

                    { name: '🟥 TIME VERMELHO', value: redList, inline: true },

                    { name: '📋 INFO', value: `\`\`\`ID: #${partida.id}\nMODO: ${partida.format}\nHOST: ${i.user.tag}\`\`\`` }

                );



                await msgPartida.edit({ embeds: [novoEmbedCanal] });

            }



            // ENVIO DA DM (EXATAMENTE IGUAL À IMAGEM)

            const embedDM = new EmbedBuilder()

                .setTitle(`🎮 Partida V-${partida.id}`)

                .setColor(timeNome === "Azul" ? "#3498DB" : "#E74C3C")

                .addFields(

                    { name: "Formato", value: partida.format, inline: true },

                    { name: "Seu time", value: `${emojiTime} ${timeNome}`, inline: true },

                    { name: "Link da partida", value: partida.link || "Link não disponível" },

                    { name: "Call", value: `\`AR2 Brasil [BR] > # ${timeNome}\`` }

                );



            await entra.send({ embeds: [embedDM] }).catch(() => console.log(`DM fechada para ${entra.user.username}`));

            

        } catch (e) {

            console.error("Erro no processamento da troca:", e);

        }



        // 4. Resposta Final no Canal

        const embedTroca = new EmbedBuilder()

            .setTitle("🔄 TROCA REALIZADA")

            .setImage(IMAGES.TROCA)

            .setColor("#E67E22")

            .setDescription(`${sai} ➔ ${entra}`);



        await i.editReply({ embeds: [embedTroca] });

    }

}); // FIM DO EVENTO INTERACTIONCREATE

// --- SISTEMA DE LIMPEZA AUTOMÁTICA (VIP & TRIOS) ---
setInterval(async () => {
    try {
        const vipsPath = './vips.json';
        const triosPath = './trios.json';

        if (!fs.existsSync(vipsPath)) return;
        let vips = JSON.parse(fs.readFileSync(vipsPath, 'utf8'));
        let trios = fs.existsSync(triosPath) ? JSON.parse(fs.readFileSync(triosPath, 'utf8')) : {};

        const agora = Date.now();
        let mudouVip = false;
        let mudouTrio = false;

        for (const userId in vips) {
            if (agora > vips[userId].expiresAt) {
                console.log(`[LIMPEZA] Tempo esgotado para: ${userId}`);

                // 1. BUSCA O SERVIDOR E O MEMBRO
                const servidorId = '1305832132328947743'; 
                const guild = client.guilds.cache.get(servidorId);

                if (guild) {
                    try {
                        const member = await guild.members.fetch(userId).catch(() => null);
                        if (member) {
                            const VIP_ROLE_ID = '1489323717791187096';
                            // Tira o cargo
                            await member.roles.remove(VIP_ROLE_ID)
                                .then(() => console.log(`[CARGO] Removido de ${userId}`))
                                .catch(e => console.log(`[ERRO CARGO] ${e.message}`));
                            
                            await member.send("⚠️ Seu **VIP** expirou e seu **Trio** foi desfeito.").catch(() => {});
                        }
                    } catch (e) { console.log(`[ERRO MEMBER] ${e.message}`); }
                }

                // 2. LIMPEZA AGRESSIVA DO TRIOS.JSON
                // Isso vai deletar QUALQUER trio onde o ID do usuário apareça
                for (const donoId in trios) {
                    const dadosTrio = trios[donoId];
                    
                    // Se o cara for o DONO ou estiver na LISTA de membros
                    if (donoId === userId || (Array.isArray(dadosTrio) && dadosTrio.includes(userId))) {
                        console.log(`[TRIO] Removendo trio relacionado a: ${userId}`);
                        delete trios[donoId];
                        mudouTrio = true;
                    }
                }

                // 3. REMOVE DO VIPS.JSON
                delete vips[userId];
                mudouVip = true;
            }
        }

        // SALVA TUDO
        if (mudouVip) fs.writeFileSync(vipsPath, JSON.stringify(vips, null, 4));
        if (mudouTrio) fs.writeFileSync(triosPath, JSON.stringify(trios, null, 4));

    } catch (err) {
        console.error("[ERRO] Falha no loop:", err);
    }
}, 60000);

// LOGIN DO BOT
// ... (resto do seu código acima)

// --- SISTEMA DE LIMPEZA AUTOMÁTICA (VIP & TRIOS) ---
setInterval(async () => {
    try {
        const vipsPath = './vips.json';
        const triosPath = './trios.json';

        if (!fs.existsSync(vipsPath)) return;
        let vips = JSON.parse(fs.readFileSync(vipsPath, 'utf8'));
        let trios = fs.existsSync(triosPath) ? JSON.parse(fs.readFileSync(triosPath, 'utf8')) : {};

        const agora = Date.now();
        let mudouVip = false;
        let mudouTrio = false;

        for (const userId in vips) {
            if (agora > vips[userId].expiresAt) {
                console.log(`[LIMPEZA] Tempo esgotado para: ${userId}`);

                const servidorId = '1305832132328947743'; 
                const guild = client.guilds.cache.get(servidorId);

                if (guild) {
                    try {
                        const member = await guild.members.fetch(userId).catch(() => null);
                        if (member) {
                            const VIP_ROLE_ID = '1489323717791187096';
                            await member.roles.remove(VIP_ROLE_ID)
                                .then(() => console.log(`[CARGO] Removido de ${userId}`))
                                .catch(e => console.log(`[ERRO CARGO] ${e.message}`));
                            
                            await member.send("⚠️ Seu **VIP** expirou e seu **Trio** foi desfeito.").catch(() => {});
                        }
                    } catch (e) { console.log(`[ERRO MEMBER] ${e.message}`); }
                }

                for (const donoId in trios) {
                    const dadosTrio = trios[donoId];
                    if (donoId === userId || (Array.isArray(dadosTrio) && dadosTrio.includes(userId))) {
                        console.log(`[TRIO] Removendo trio relacionado a: ${userId}`);
                        delete trios[donoId];
                        mudouTrio = true;
                    }
                }

                delete vips[userId];
                mudouVip = true;
            }
        }

        if (mudouVip) fs.writeFileSync(vipsPath, JSON.stringify(vips, null, 4));
        if (mudouTrio) fs.writeFileSync(triosPath, JSON.stringify(trios, null, 4));

    } catch (err) {
        console.error("[ERRO] Falha no loop de limpeza:", err);
    }
}, 60000);

// --- SISTEMA ANTI-CONVITE (COM WHITELIST E CASTIGO) ---
// Criamos um mapa simples para contar as infrações (reseta se o bot reiniciar)
const infracoesConvite = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Removemos a flag /g para evitar o erro de posição do regex
    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]/i;

    if (inviteRegex.test(message.content)) {
        const pathInvites = path.join(process.cwd(), 'invites.json');
        let linkAutorizado = false;

        try {
            // 1. CHECAGEM DA WHITELIST
            if (fs.existsSync(pathInvites)) {
                const data = JSON.parse(fs.readFileSync(pathInvites, 'utf8'));
                const permitidos = data.permitidos || [];
                // Checa se o conteúdo da mensagem contém algum código autorizado
                linkAutorizado = permitidos.some(codigo => message.content.includes(codigo));
            }

            // 2. SE NÃO ESTIVER AUTORIZADO, SEGUIR COM A PUNIÇÃO
            if (!linkAutorizado) {
                await message.delete().catch(() => {});
                
                const userId = message.author.id;
                const contador = (infracoesConvite.get(userId) || 0) + 1;
                infracoesConvite.set(userId, contador);

                if (contador >= 2) {
                    // --- APLICA CASTIGO (TIMEOUT DE 28 DIAS) ---
                    const tempoMS = 28 * 24 * 60 * 60 * 1000; // 28 dias em milissegundos
                    await message.member.timeout(tempoMS, 'Divulgação repetida de convites não autorizados').catch(console.error);
                    
                    await message.channel.send(`🚨 ${message.author} foi castigado por 28 dias por insistir na divulgação de links.`);
                } else {
                    // --- APENAS AVISO NA PRIMEIRA VEZ ---
                    const aviso = await message.channel.send(`${message.author}, esse convite não é autorizado. Se divulgar de novo, vai levar castigo de 1 mês (28 dias) lenda.`);
                    setTimeout(() => aviso.delete().catch(() => {}), 7000);
                }

                console.log(`[ANTI-INVITE] Bloqueado: ${message.author.tag} (Infração #${contador})`);
            } else {
                console.log(`[ANTI-INVITE] Link permitido postado por: ${message.author.tag}`);
            }

        } catch (error) {
            console.error("[ERRO ANTI-INVITE]:", error.message);
        }
    }
});
// ... (resto do seu código acima)

// --- SISTEMA DE LIMPEZA AUTOMÁTICA (VIP & TRIOS) ---
setInterval(async () => {
    try {
        const vipsPath = './vips.json';
        const triosPath = './trios.json';

        if (!fs.existsSync(vipsPath)) return;
        let vips = JSON.parse(fs.readFileSync(vipsPath, 'utf8'));
        let trios = fs.existsSync(triosPath) ? JSON.parse(fs.readFileSync(triosPath, 'utf8')) : {};

        const agora = Date.now();
        let mudouVip = false;
        let mudouTrio = false;

        for (const userId in vips) {
            if (agora > vips[userId].expiresAt) {
                console.log(`[LIMPEZA] Tempo esgotado para: ${userId}`);

                const servidorId = '1305832132328947743'; 
                const guild = client.guilds.cache.get(servidorId);

                if (guild) {
                    try {
                        const member = await guild.members.fetch(userId).catch(() => null);
                        if (member) {
                            const VIP_ROLE_ID = '1489323717791187096';
                            await member.roles.remove(VIP_ROLE_ID)
                                .then(() => console.log(`[CARGO] Removido de ${userId}`))
                                .catch(e => console.log(`[ERRO CARGO] ${e.message}`));
                            
                            await member.send("⚠️ Seu **VIP** expirou e seu **Trio** foi desfeito.").catch(() => {});
                        }
                    } catch (e) { console.log(`[ERRO MEMBER] ${e.message}`); }
                }

                for (const donoId in trios) {
                    const dadosTrio = trios[donoId];
                    if (donoId === userId || (Array.isArray(dadosTrio) && dadosTrio.includes(userId))) {
                        console.log(`[TRIO] Removendo trio relacionado a: ${userId}`);
                        delete trios[donoId];
                        mudouTrio = true;
                    }
                }

                delete vips[userId];
                mudouVip = true;
            }
        }

        if (mudouVip) fs.writeFileSync(vipsPath, JSON.stringify(vips, null, 4));
        if (mudouTrio) fs.writeFileSync(triosPath, JSON.stringify(trios, null, 4));

    } catch (err) {
        console.error("[ERRO] Falha no loop de limpeza:", err);
    }
}, 60000);

// --- SISTEMA ANTI-CONVITE (BLOQUEIO TOTAL) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]/g;

    if (inviteRegex.test(message.content)) {
        try {
            await message.delete();
            const aviso = await message.channel.send(`${message.author}, Se divulgar dnv toma castigo de 1 mês lenda.`);
            setTimeout(() => aviso.delete().catch(() => {}), 5000);
            console.log(`[ANTI-INVITE] Convite de ${message.author.tag} deletado.`);
        } catch (error) {
            console.error("[ERRO ANTI-INVITE] Verifique as permissões do bot.");
        }
    }
});

// LOGIN DO BOT
client.login(process.env.TOKEN);