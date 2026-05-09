const fs = require("fs");
const path = require("path");
const { imageHash } = require('image-hash');

module.exports = (client) => {
    const pastaGolpes = path.resolve(__dirname, "golpes");
    let hashesGolpes = [];

    // Função interna para carregar as imagens
    const carregarHashes = () => {
        if (!fs.existsSync(pastaGolpes)) {
            fs.mkdirSync(pastaGolpes);
            console.log("📁 Pasta 'golpes' criada.");
            return;
        }

        const arquivos = fs.readdirSync(pastaGolpes);
        arquivos.forEach(arquivo => {
            const caminho = path.join(pastaGolpes, arquivo);
            imageHash(caminho, 16, true, (error, data) => {
                if (!error) {
                    hashesGolpes.push(data);
                    console.log(`🖼️ Scanner carregado: ${arquivo}`);
                }
            });
        });
    };

    // Executa ao carregar o arquivo
    carregarHashes();

    // Escuta as mensagens automaticamente
    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild || message.attachments.size === 0) return;

        message.attachments.forEach(async (attachment) => {
            if (attachment.contentType?.startsWith("image")) {
                imageHash(attachment.url, 16, true, async (error, hashUsuario) => {
                    if (error) return;

                    const detectado = hashesGolpes.some(h => h === hashUsuario);

                    if (detectado) {
                        try {
                            await message.delete().catch(() => {});
                            
                            // Castigo de 1 dia (24h)
                            const umDia = 24 * 60 * 60 * 1000;
                            await message.member.timeout(umDia, 'Divulgação de golpe').catch(() => {});

                            const aviso = await message.channel.send({
                                content: `🚨 **SEGURANÇA:** <@${message.author.id}>, você foi castigado por 1 dia por enviar imagens de golpe.`
                            });

                            setTimeout(() => aviso.delete().catch(() => {}), 10000);
                        } catch (err) {
                            console.error("Erro no Antigolpe:", err);
                        }
                    }
                });
            }
        });
    });
};