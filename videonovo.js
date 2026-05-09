const Parser = require('rss-parser');
const parser = new Parser();

// 1. Agora você pode colocar quantos IDs quiser aqui, separados por vírgula
const CANAIS_YOUTUBE = [
    'UCi7AE8i6lPc9t1yM0bLPAkA', // Canal 1
    'UCJgxEF0P-eLZz-f4aCoIJUg', // Canal 2
    'UCFt9nf8NW4m-pOKXobh1Xlw' // Canal 3
]; 

const DISCORD_CHANNEL_ID = '1473252499325452300'; 
const INTERVALO_CHECAGEM = 30000; // Aumentei para 30s para evitar bloqueio do YouTube por excesso de requisições em vários canais

// Objeto para guardar o último vídeo de cada canal separadamente
let ultimosVideos = {}; 

module.exports = (client) => {
    console.log(`⚡ Monitor Multi-Canais: Ativado para ${CANAIS_YOUTUBE.length} canais!`);

    const checarYoutube = async () => {
        for (const canalId of CANAIS_YOUTUBE) {
            try {
                // nocache para garantir que o feed venha atualizado
                const urlFeed = `https://www.youtube.com/feeds/videos.xml?channel_id=${canalId}&nocache=${Date.now()}`;
                const feed = await parser.parseURL(urlFeed);

                if (!feed.items || feed.items.length === 0) continue;

                const videoMaisRecente = feed.items[0];
                const videoId = videoMaisRecente.id.replace("yt:video:", "");

                // Se é a primeira vez que o bot checa este canal, salva o vídeo atual e pula
                if (!ultimosVideos[canalId]) {
                    ultimosVideos[canalId] = videoId;
                    console.log(`[SISTEMA] Iniciada monitoração do canal: ${feed.title}`);
                    continue;
                }

                // Se o ID for diferente do que temos guardado para esse canal específico
                if (videoId !== ultimosVideos[canalId]) {
                    ultimosVideos[canalId] = videoId;
                    
                    const canalDiscord = client.channels.cache.get(DISCORD_CHANNEL_ID);
                    if (canalDiscord) {
                        canalDiscord.send({
                            content: `🚀 **VÍDEO NOVO NO CANAL: ${feed.title.toUpperCase()}!**\n\n**${videoMaisRecente.title}**\nAssista agora: ${videoMaisRecente.link}\n\n<@&1473800049266921473>`
                        });
                    }
                }
            } catch (error) {
                // Erros de um canal não param a checagem dos outros
                // console.error(`Erro ao checar canal ${canalId}:`, error.message);
            }
        }
    };

    // Roda ao ligar
    checarYoutube();
    
    // Define o intervalo de checagem
    setInterval(checarYoutube, INTERVALO_CHECAGEM);
};