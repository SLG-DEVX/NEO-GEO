const { ovlcmd } = require('../lib/ovlcmd');

const elysiumIntro = 'https://files.catbox.moe/z64kuq.mp4'; // GIF intro
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================
// TEXTE PROGRESSIF SIMPLE
// ============================
async function sendProgressiveText(ovl, ms_org, text, speed = 2, step = 5) {
  let currentText = "";
  const { key } = await ovl.sendMessage(ms_org, { text: "|" });

  for (let i = 0; i < text.length; i++) {
    currentText += text[i];

    if ((i + 1) % step === 0 || i === text.length - 1) {
      await ovl.sendMessage(ms_org, {
        text: currentText + " |",
        edit: key
      });
    }

    await sleep(speed);
  }

  await ovl.editMessage(ms_org, key, { text: currentText });
  return key;
}

// ============================
// COMMANDE +elysium💠
/* Envoie GIF intro + texte progressif + images */
ovlcmd(
  {
    nom_cmd: 'elysium💠',
    classe: 'Elysium💠',
    react: '💠',
    desc: "Affiche le message de bienvenue dans l'univers Elysium"
  },
  async (ms_org, ovl, { ms }) => {
    // 1️⃣ GIF d’intro
    await ovl.sendMessage(ms_org, {
      video: { url: elysiumIntro },
      gifPlayback: true,
      caption: ""
    });

    // 2️⃣ Texte progressif
    const message = "💠 [ SYSTEM-ELYSIUM ] Bienvenue! Chargement de l'interface de l'univers Elysium... ♻️";
    await sendProgressiveText(ovl, ms_org, message, 2, 5);

    // 3️⃣ Images d’illustration
    const images = [
      'https://files.catbox.moe/s6132z.jpg',
      'https://files.catbox.moe/m33ajw.jpg',
      'https://files.catbox.moe/attr32.jpg',
      'https://files.catbox.moe/9vi30a.jpg',
      'https://files.catbox.moe/mtjqww.jpg',
      'https://files.catbox.moe/n7vvu7.jpg'
    ];

    for (const img of images) {
      await ovl.sendMessage(ms_org, { image: { url: img }, caption: "" }, { quoted: ms });
      await sleep(200); // pause 200ms entre chaque image
    }
  }
);

// ============================
// COMMANDE +elysiumpave💠
// ============================
ovlcmd(
  {
    nom_cmd: 'elysiumpave💠',
    classe: 'Elysium💠',
    react: '💠',
    desc: "Affiche le pavé d’annonce de l’univers Elysium"
  },
  async (ms_org, ovl, { repondre }) => {
    repondre(`💬:
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
💠 

Bienvenue dans l'univers *ELYISUM* ! Explorez, interagissez et découvrez votre expérience unique. ♻️

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
                  *ELYSIUM💠*`);
  }
);
