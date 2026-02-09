const { ovlcmd } = require('../lib/ovlcmd');
const epreuvesLoup = new Map();

// ──────────────────────────────
// UTILITAIRES
// ──────────────────────────────
function cleanText(str) {
  return str
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '')
    .replace(/\n/g, ' ')
    .toLowerCase();
}

function cleanTag(str) {
  return cleanText(str).replace(/\s+/g, '');
}

function normalizeJid(jid) {
  return jid ? jid.split(':')[0].trim() : '';
}

// ──────────────────────────────
// RENDER FICHE PARTICIPANTS
// ──────────────────────────────
function renderFicheParticipants(epreuve) {
  let txt =
`🔷⚽ÉPREUVE DU LOUP🥅
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
*👤Participants:*`;

  let i = 1;
  for (const p of epreuve.participants) {
    const isLoup = epreuve.loupJid === p.jid ? " (Loup)" : "";
    txt += `\n${i}- @${p.tag}: ${p.niveau}${isLoup}`;
    i++;
  }

  txt += `
     
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
                      ⚽BLUE🔷LOCK`;
  return txt;
}

// ──────────────────────────────
// EXTRACTION DU TEXT
// ──────────────────────────────
function extraireTexteAction(texte) {
  const match = texte.match(/⚽([\s\S]*?)⚽\s*blue🔷lock🥅/i);
  if (!match) return null;

  return cleanText(match[1]);
}

// ──────────────────────────────
// EXTRACTION DU TEXT
// ──────────────────────────────
function extraireCibleDepuisTexte(texteAction, participants) {
  for (const p of participants) {
    const tagClean = cleanTag(p.tag);
    if (texteAction.includes(tagClean)) {
      return p;
    }
  }
  return null;
}

// ──────────────────────────────
// LANCEMENT DE L'ÉPREUVE
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'exercice4',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve du loup"
}, async (ms_org, ovl, { repondre, auteur_Message }) => {
  try {
    const chatId = ms_org.key?.remoteJid || ms_org;

    await ovl.sendMessage(chatId, { video: { url: 'https://files.catbox.moe/z64kuq.mp4' }, gifPlayback: true });

    const texteDebut = `🔷 *ÉPREUVE DU LOUP*🐺❌⚽
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░

*⚽RÈGLES:*
Objectif : toucher un autre joueur avec le ballon ⚽ avant la fin du temps imparti : 15 minutes❗
Le modérateur doit ensuite envoyer la liste des participants avec leurs niveaux et ajouter (Loup) au joueur qui commence.

⚽ Voulez-vous lancer l’épreuve ?
✅ \`Oui\`  
❌ \`Non\`

╰───────────────────
▝▝▝                    *🔷BLUELOCK⚽*`;

    await ovl.sendMessage(chatId, { image: { url: 'https://files.catbox.moe/zui2we.jpg' }, caption: texteDebut });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = rep?.message?.conversation?.toLowerCase() || rep?.message?.extendedTextMessage?.text?.toLowerCase();
    if (!response) return repondre("⏳ Pas de réponse, épreuve annulée.");
    if (response === "non") return repondre("❌ Lancement annulé.");

    if (response === "oui") {
      epreuvesLoup.set(chatId, {
        participants: [],
        loupJid: null,
        tirEnCours: null,
        debut: true,
        timerPaves: null
      });

      await repondre("✅📋 Envoie maintenant la **liste des participants** avec les niveaux.\nAjoute `(Loup)` au joueur qui commence.");
    }
  } catch (err) {
    console.error(err);
    await repondre("❌ Une erreur est survenue lors du lancement de l'épreuve.");
  }
});

// ──────────────────────────────
// LECTURE LISTE DES PARTICIPANTS
// ──────────────────────────────
ovlcmd({ nom_cmd: 'liste_loup', isfunc: true }, async (ms_org, ovl, { texte, getJid, repondre }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);

  if (!epreuve || !epreuve.debut) return;
  if (epreuve.tirEnCours) return;

  const lignes = texte.replace(/[\u2066-\u2069]/g, '').split('\n');

  let loupJid = null;

  for (const ligne of lignes) {
    const m = ligne.match(/@(\S+).*?:\s*(\d+)/i);
    if (!m) continue;

    const tag = m[1];
    const niveau = parseInt(m[2], 10);
    const isLoup = /\(loup\)/i.test(ligne);

    let jid;
    try { jid = await getJid(tag + "@lid", ms_org, ovl); } catch { continue; }

    epreuve.participants.push({ jid, tag, niveau });

    if (isLoup) loupJid = jid;
  }

  if (epreuve.participants.length < 2) return repondre("❌ Il faut au moins 2 participants.");
  if (!loupJid) return repondre("❌ Aucun joueur avec (Loup) détecté.");

  epreuve.loupJid = normalizeJid(loupJid);
  epreuve.debut = false;

  const mentionId = loupJid.split('@')[0];

  await ovl.sendMessage(chatId, {
    video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
    gifPlayback: true,
    caption:
`⚽ Début de l'exercice !
Le joueur @${mentionId} est le Loup 🐺⚠️
Veuillez toucher un joueur avant la fin du temps ⌛ (3:00 min)`,
    mentions: [loupJid]
  });
});

// ──────────────────────────────
// LISTENER AUTOMATIQUE LOUP
// ──────────────────────────────
function initLoupListener(ovl) {
  ovl.ev.on("messages.upsert", async ({ messages }) => {
    const ms = messages?.[0];
    if (!ms || !ms.message || ms.key.fromMe) return;

    const chatId = ms.key.remoteJid;
    const epreuve = epreuvesLoup.get(chatId);
    if (!epreuve || !epreuve.loupJid) return;

    const senderJid = normalizeJid(ms.key.participant || ms.key.remoteJid);
    const texte = ms.message.conversation || ms.message.extendedTextMessage?.text;
    if (!texte) return;

    // ────────────────
    // Détection pavé Loup
    // ────────────────
    // On considère un pavé si le texte contient 💬: et ⚽:
    if (!/💬:/.test(texte) || !/⚽:/.test(texte)) return;

    // ────────────────
    // Extraire texte après ⚽:
    // ────────────────
    const matchTir = texte.match(/⚽:\s*([\s\S]+)/i);
    if (!matchTir) return;

    const texteAction = matchTir[1].trim();
    if (!texteAction) return;

    // ────────────────
    // TIR DU LOUP
    // ────────────────
    if (!epreuve.tirEnCours) {
      // Seul le loup peut tirer
      if (senderJid !== epreuve.loupJid) return;

      // Extraire la zone touchée
      const zone = texteAction.match(/tete|torse|abdomen|jambe gauche|jambe droite/i)?.[0];
      if (!zone) return;

      // Extraire la cible mentionnée (@tag)
      const mention = ms.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                      texteAction.match(/@(\S+)/)?.[1];
      if (!mention) return;

      const cible = epreuve.participants.find(p => normalizeJid(p.jid) === normalizeJid(mention));
      if (!cible) return;
      if (cible.jid === epreuve.loupJid) return;

      // Enregistrer le tir
      epreuve.tirEnCours = {
        auteur: epreuve.loupJid,
        cible: cible.jid,
        zone,
        messages: []
      };

      await ovl.sendMessage(chatId, {
        text: `⚽ **TIR VALIDÉ !**\n⏱️ 3 minutes pour envoyer le pavé d’esquive 🛡️ @${cible.tag}`,
        mentions: [cible.jid]
      });

      // Timer de 3 minutes pour l’esquive
      epreuve.timerPaves = setTimeout(async () => {
  await verdictFinal(chatId, ovl);
}, 3 * 60 * 1000);
  });
}

    // ────────────────
    // ESQUIVE
    // ────────────────
    if (epreuve.tirEnCours) {
      if (!estPave) return;

      const texteClean = cleanText(texte);
      const zone = epreuve.tirEnCours.zone;
      let esquiveValide = false;

      switch (zone) {
        case "tete":
          esquiveValide =
            texteClean.includes("baisse") ||
            texteClean.includes("baisser") ||
            texteClean.includes("accroupi") ||
            texteClean.includes("accroupir");
          break;

        case "torse":
        case "abdomen":
          esquiveValide =
            texteClean.includes("decale") ||
            texteClean.includes("decalage") ||
            texteClean.includes("bond");
          break;

        case "jambe gauche":
        case "jambe droite":
          esquiveValide =
            texteClean.includes("bond") ||
            texteClean.includes("saute") ||
            texteClean.includes("saut") ||
            texteClean.includes("plie");
          break;
      }

      if (esquiveValide) {
        epreuve.tirEnCours.messages.push({
          jid: senderJid,
          texte: texteClean
        });
      }

      if (
        senderJid === epreuve.tirEnCours.cible &&
        esquiveValide
      ) {
        clearTimeout(epreuve.timerPaves);
        await verdictFinal(chatId, ovl);
      }
    }
  });
}

// ──────────────────────────────
// VERDICT FINAL
// ──────────────────────────────
async function verdictFinal(chatId, ovl) {
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.tirEnCours) return;

  const { auteur, cible } = epreuve.tirEnCours;
  const loup = epreuve.participants.find(p => p.jid === auteur);
  const cibleP = epreuve.participants.find(p => p.jid === cible);

  const chance = 50 + Math.max(
    Math.min(loup.niveau - cibleP.niveau, 20),
    -20
  );

  const touche = Math.random() * 100 < chance;

  if (touche) {
    epreuve.loupJid = normalizeJid(cible);
    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
      gifPlayback: true,
      caption: `✅ **TOUCHÉ !**\n@${cibleP.tag} devient le nouveau Loup 🐺.`,
      mentions: [cible]
    });
  } else {
    const gifsRate = [
      'https://files.catbox.moe/obqo0d.mp4',
      'https://files.catbox.moe/m00580.mp4'
    ];

    await ovl.sendMessage(chatId, {
      video: { url: gifsRate[Math.floor(Math.random() * gifsRate.length)] },
      gifPlayback: true,
      caption: `❌ **RATÉ !**\nLe tir n'a pas touché sa cible. Le Loup reste @${loup.tag}.`,
      mentions: [auteur]
    });
  }

  epreuve.tirEnCours = null;
  epreuve.timerPaves = null;
}

// ──────────────────────────────
// EXPORT
// ──────────────────────────────
module.exports = {
  epreuvesLoup,
  initLoupListener
};
