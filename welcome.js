const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const IMAGE_SMALL =
  "https://cdn.discordapp.com/attachments/1306345894085525545/1472737868815274064/a_c2b2f870d0949b1e0755d8f5abd8f9a4.gif?ex=6993a986&is=69925806&hm=095e0b97bbddd87eef5246a6f45b1b4ac21829df859246e9192dce69a284d946&";

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {

    // ============================
    // AUTO ROLE
    // ============================
    const rolesToAdd = [
      "1305954419409555578",
      "1475532508056653905"
    ];

    for (const roleId of rolesToAdd) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.add(role).catch(() => {});
      }
    }

    // ============================
    // MENSAGEM NO CANAL
    // ============================
    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setThumbnail(IMAGE_SMALL)
      .setTitle("👋 SEJA BEM-VINDO(A) AO AR2 [🇧🇷]!")
      .setDescription(`
Bem-vindo(a) ${member} ao **melhor server de ar2 do brasil**!  

👥 Já somos **${member.guild.memberCount} membros**!

📜 Respeite as [Regras](https://discord.com/channels/1305832132328947743/1306024935466074112)  
🤝 Tenha educação  
📡 Vire um hoster se quiser [Link](https://teofilo823.github.io/HOSTER/)
💻 Vire um pc checker se quiser [Link](https://teofilo823.github.io/PC-CHECKER/)
🎟️ Abra um ticket se precisar [Canal](https://discord.com/channels/1305832132328947743/1363247667408277587)
📢 Procure um superior se precisar  

**Boa jornada! 💓**
`)
      .setFooter({ text: "AR2 BR - FORMANDO PROFISSIONAIS" });

    // CRIANDO OS BOTÕES (Colocando ambos na mesma Row)
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Leaderboard')
        .setURL('https://teofilo823.github.io/SITE-AR2-BR/')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Youtube')
        .setURL('https://www.youtube.com/@Cremezs')
        .setStyle(ButtonStyle.Link)
    );

    // ENVIANDO COM OS BOTÕES
    channel.send({ embeds: [embed], components: [row] }).catch(() => {});

  });
};