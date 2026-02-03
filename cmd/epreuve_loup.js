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

*⚽BLUE🔷LOCK*`;

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

  epreuve.loupJid = loupJid;
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
// LISTENER AUTOMATIQUE
// ──────────────────────────────
function initLoupListener(ovl) {
  ovl.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const ms = messages?.[0];
      if (!ms || !ms.message || ms.key.fromMe) return;

      const chatId = ms.key.remoteJid;
      const epreuve = epreuvesLoup.get(chatId);
      if (!epreuve || !epreuve.loupJid) return;

      const senderJid = normalizeJid(ms.sender || ms.key?.participant);
      const texte = ms.message.conversation || ms.message.extendedTextMessage?.text;
      if (!texte) return;

      // Si tir en cours, gérer l'esquive
      if (epreuve.tirEnCours) {
        const cibleJid = epreuve.tirEnCours.cible;
        if (senderJid === cibleJid) {
          const t = cleanText(texte);
          let valide = false;
          switch (epreuve.tirEnCours.zone) {
            case "tête": valide = t.includes("baisse") || t.includes("accroupi"); break;
            case "torse":
            case "abdomen": valide = t.includes("décale") || t.includes("bond"); break;
            default: valide = t.includes("plie") || t.includes("bond"); break;
          }
          if (valide) {
            clearTimeout(epreuve.timerPaves);
            await verdictFinal(chatId, ovl);
          }
        }
        return;
      }

      // Détection automatique du tir du Loup
      if (senderJid === epreuve.loupJid) {
  const clean = cleanText(texte);

  // Zone
  const zoneMatch = clean.match(/t[eé]te|torse|abdomen|jambe gauche|jambe droite/);
  if (!zoneMatch) return;

  // Mentions (LA CLÉ)
  const mentions =
    ms.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (!mentions.length) return;

  const cibleJid = normalizeJid(mentions[0]);

  const cible = epreuve.participants.find(p => p.jid === cibleJid);
  if (!cible || cible.jid === epreuve.loupJid) return;

  epreuve.tirEnCours = {
    auteur: epreuve.loupJid,
    cible: cible.jid,
    zone: zoneMatch[0]
  };

  await ovl.sendMessage(chatId, {
    caption: `⚽ **TIR VALIDÉ !**\n⏱️ 3 minutes pour envoyer le pavé d’esquive 🛡️ @${cible.tag}`,
    mentions: epreuve.participants.map(p => p.jid)
  });

  epreuve.timerPaves = setTimeout(async () => {
    await verdictFinal(chatId, ovl);
  }, 3 * 60 * 1000);
}

    } catch (err) {
      console.error("Listener Loup erreur :", err);
    }
  });
}

// ──────────────────────────────
// VERDICT FINAL
// ──────────────────────────────
async function verdictFinal(chatId, ovl) {
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.tirEnCours) return;

  const loupJid = epreuve.tirEnCours.auteur;
  const cibleJid = epreuve.tirEnCours.cible;
  const loup = epreuve.participants.find(p => p.jid === loupJid);
  const cible = epreuve.participants.find(p => p.jid === cibleJid);

  const chance = 50 + Math.max(Math.min(loup.niveau - cible.niveau, 20), -20);
  const hit = Math.random()*100 < chance;

  if (hit) {
    epreuve.loupJid = cibleJid;
    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
      gifPlayback: true,
      caption: `✅ **TOUCHÉ !**\n@${cible.tag} devient le nouveau Loup 🐺.`,
      mentions: [cibleJid]
    });
  } else {
    const gifsRate = ['https://files.catbox.moe/obqo0d.mp4','https://files.catbox.moe/m00580.mp4'];
    await ovl.sendMessage(chatId, {
      video: { url: gifsRate[Math.floor(Math.random()*gifsRate.length)] },
      gifPlayback: true,
      caption: `❌ **RATÉ !**\nLe tir n'a pas touché sa cible. Le Loup reste @${loup.tag}.`,
      mentions: [loupJid]
    });
  }

  epreuve.tirEnCours = null;
}

// ──────────────────────────────
// EXPORT
// ──────────────────────────────
module.exports = {
  epreuvesLoup,
  initLoupListener
};
