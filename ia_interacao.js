const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const CHATS_PERMITIDOS = ["1306339337084080231", "1306341776281440417", "1473775401451913348"];
const CHAT_PRINCIPAL = "1306339337084080231";

const maldicoes = new Map(); // [userId, tempoFinal]
let ultimoUso = 0;

// 🔥 RESPOSTAS AUTOMÁTICAS (Sem gastar API)
const respostasAutomaticas = [
    { trigger: ["lagado", "lag"], respostas: ["🌐 chora no lag aí, skill issue.", "🛜 seu pc é uma torradeira, aceita."] },
    { trigger: ["easy", "izi", "ez"], respostas: ["🤨 falou o cara que morreu 5x antes.", "😐 izi pq eu não tava lá."] },
    { trigger: ["gg"], respostas: ["🎮 gg nada, foi feio.", "💀 gg wp (só que não)."] },
    { trigger: ["kkkk", "rsrs"], respostas: ["😂 tá rindo de que, ô palhaço?", "😆 a piada é o seu gameplay."] },
    { trigger: ["mds"], respostas: ["🙏 deus não te ajuda no pvp não, parça.", "⛪ reza pra não me encontrar no mapa."] }
];

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        // Ignora bots e canais não autorizados
        if (message.author.bot || !CHATS_PERMITIDOS.includes(message.channel.id)) return;

        const content = message.content.toLowerCase();
        const amaldicoado = maldicoes.has(message.author.id);

        // 1. CHECAR EXPIRAÇÃO DA MALDIÇÃO
        if (amaldicoado && Date.now() > maldicoes.get(message.author.id)) {
            maldicoes.delete(message.author.id);
        }

        // 2. RESPOSTAS AUTOMÁTICAS (Prioridade Máxima)
        // Se encontrar o gatilho, responde e para o código aqui (return)
        for (const item of respostasAutomaticas) {
            if (item.trigger.some(t => content.includes(t))) {
                if (Math.random() < 0.40) { // 40% de chance de ativar
                    return message.reply(item.respostas[Math.floor(Math.random() * item.respostas.length)]);
                }
            }
        }

// 3. CHANCE DE MALDIÇÃO ALEATÓRIA (0.5% de chance em qualquer mensagem)
        if (Math.random() < 0.005 && !amaldicoado) {
            const tempoMaldicao = 2 * 60000; // 2 minutos    
            maldicoes.set(message.author.id, Date.now() + tempoMaldicao);

            return message.reply(`⚡ **${message.author.username}**, tu deu azar. agora vou te aloprar por 2 minutos. boa sorte.`);
        } // <--- Faltava fechar essa chave aqui!

        // 4. LÓGICA DE ATIVAÇÃO DA IA
        const mencaoBot = message.mentions.has(client.user);
        let eResposta = false;
        
        if (message.reference) {
            try {
                const msgRef = await message.channel.messages.fetch(message.reference.messageId);
                eResposta = msgRef.author.id === client.user.id;
            } catch (e) { eResposta = false; }
        }

        // Chance de mensagem aleatória no chat principal (3%)
        const chanceAleatoria = (message.channel.id === CHAT_PRINCIPAL && Math.random() < 0.03);
        
        // Se estiver amaldiçoado, a resposta é 100% garantida
        const deveResponderIA = mencaoBot || eResposta || amaldicoado || chanceAleatoria;

        if (!deveResponderIA) return;

        // Cooldown global (5 seg) para não floodar, exceto menção direta
        if (!mencaoBot && Date.now() - ultimoUso < 5000) return;
        ultimoUso = Date.now();

        try {
            await message.channel.sendTyping();

            // Instruções de Personalidade "Humana"
            const instrucoes = `Você é um player de AR2 (Apocalypse Rising 2) experiente e debochado.
            - Responda com frases CURTAS e DIRETAS.
            - Apenas uma frase por resposta, nada de separar elas com espaços!
            - Fale como um humano no Discord: use gírias, letras minúsculas, sem pontuação formal.
            - Se te xingarem, xingue de volta sem dó (ex: "teu rabo", "cala a boca noob", "vai se fuder", "macaco", "filho de uma puta", "arrombado", "seu merda", "seu lixo", "inútil", "podre", "xingaentos de conotação sexual", "xingamento com a família", "xingaentos de conotação sexual da familia").
            - Se o cara estiver amaldiçoado (${message.author.username}), seja agressivo e chato.
            - Se for aleatório, seja desdenhoso.
            - Se a pessoa fizer uma pergunta séria, ou sobre o jogo, seja educado, mas ainda use gírias.
            - E se for uma pergunta de deboche responda xingando a pessoa.
            - Não use emojis de robô.`;

            let promptParts = [
                { text: instrucoes },
                { text: `Contexto Especial: ${amaldicoado ? "O USUÁRIO ESTÁ AMALDIÇOADO. ZOE ELE EM TODAS AS MENSAGENS." : "Conversa normal."}` },
                { text: `Mensagem de ${message.author.username}: ${message.content}` }
            ];

            // Lógica de Visão (Imagens)
            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment.contentType?.startsWith("image/")) {
                    const responseImg = await fetch(attachment.url);
                    const buffer = await responseImg.arrayBuffer();
                    promptParts.push({
                        inlineData: { 
                            data: Buffer.from(buffer).toString("base64"), 
                            mimeType: attachment.contentType 
                        }
                    });
                }
            }

            // Execução do Modelo
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
            const response = await result.response;
            const textoIA = response.text();

            if (textoIA) {
                // Envia em minúsculas para parecer mais humano
                message.reply(textoIA.toLowerCase().trim().slice(0, 1000));
            }

        } catch (error) {
            console.error("❌ Erro IA:", error.message);
            // Se o modelo 2.5 falhar, você pode trocar para "gemini-1.5-flash" na linha 102
        }
    });
};