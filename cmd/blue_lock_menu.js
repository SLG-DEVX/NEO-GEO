const { ovlcmd } = require('../lib/ovlcmd');

const gifIntro = 'https://files.catbox.moe/z64kuq.mp4';

ovlcmd(
  {
    nom_cmd: 'bluelock⚽',
    classe: 'Bluelock⚽',
    react: '🎮',
    desc: "Affiche les visuels de Blue Game"
  },
  async (ms_org, ovl, { arg, ms }) => {
    if (!arg || arg.length === 0) {
      await ovl.sendMessage(ms_org, {
        video: { url: gifIntro },
        gifPlayback: true,
        caption: ""
      });

      const liens = [
        'https://files.catbox.moe/s6132z.jpg',
        'https://files.catbox.moe/m33ajw.jpg',
        'https://files.catbox.moe/attr32.jpg',
        'https://files.catbox.moe/9vi30a.jpg',
        'https://files.catbox.moe/mtjqww.jpg', 
        'https://files.catbox.moe/n7vvu7.jpg'
      ];

      for (const lien of liens) {
        await ovl.sendMessage(ms_org, { image: { url: lien }, caption: "" }, { quoted: ms });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }
);

ovlcmd(
  {
    nom_cmd: 'modechampions⚽',
    classe: 'Bluelock⚽',
    react: '🏆',
    desc: "Affiche le mode Champions"
  },
  async (ms_org, ovl, { arg, ms }) => {
    if (!arg || arg.length === 0) {
      await ovl.sendMessage(ms_org, {
        video: { url: gifIntro },
        gifPlayback: true,
        caption: ""
      });

      await ovl.sendMessage(ms_org, { image: { url: "https://files.catbox.moe/dhkxtt.jpg" }, caption: "" }, { quoted: ms });
      await ovl.sendMessage(ms_org, { image: { url: "https://files.catbox.moe/juvrgg.jpg" }, caption: "" }, { quoted: ms });
    }
  }
);

ovlcmd(
  {
    nom_cmd: 'modehero⚽',
    classe: 'Bluelock⚽',
    react: '🦸',
    desc: "Affiche le mode Hero"
  },
  async (ms_org, ovl, { arg, ms }) => {
    if (!arg || arg.length === 0) {
      await ovl.sendMessage(ms_org, {
        video: { url: gifIntro },
        gifPlayback: true,
        caption: ""
      });

      await ovl.sendMessage(ms_org, { image: { url: "https://files.catbox.moe/zmzlwt.jpg" }, caption: "" }, { quoted: ms });
      await ovl.sendMessage(ms_org, { image: { url: "https://files.catbox.moe/hku7ch.jpg" }, caption: "" }, { quoted: ms });
    }
  }
);

ovlcmd(
  {
    nom_cmd: 'pave⚽',
    classe: 'Bluelock⚽',
    react: '⚽',
    desc: "Affiche le message d'annonce de lancement Blue Lock"
  },
  async (ms_org, ovl, { repondre }) => {
    repondre(`💬: 
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱
⚽: 
             
╰───────────────────
  ▝▝▝       *BLUE🔷LOCK⚽🥅*`);
  }
);
