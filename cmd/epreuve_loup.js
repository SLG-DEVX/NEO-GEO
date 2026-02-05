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

function jidBase(jid) {
  return jid?.split('@')[0];
}

function normalizeComparable(str) {
  return str
    .normalize("NFKD")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, '')
    .replace(/[@\s]/g, '')
    .toLowerCase();
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

  epreuve.loupJid = normalizeJid(loupJid);
  epreuve.debut = false;

  await ovl.sendMessage(chatId, {
    video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
    gifPlayback: true,
    caption:
`⚽ Début de l'exercice !
Le joueur @${jidBase(loupJid)} est le Loup 🐺⚠️
Veuillez toucher un joueur avant la fin du temps ⌛ (3:00 min)`,
    mentions: [loupJid]
  });
});

// ──────────────────────────────
// GESTION AUTOMATIQUE DES TIRS
// ──────────────────────────────
async function gererMessageTir(message, ovl, getJid) {
  try {
    if (!message?.message) return;
    const chatId = message.key?.remoteJid;
    if (!chatId) return;

    const epreuve = epreuvesLoup.get(chatId);
    if (!epreuve || !epreuve.loupJid || epreuve.tirEnCours) return;

    const auteur = normalizeJid(message.key?.participant || message.key?.remoteJid);
    if (auteur !== epreuve.loupJid) return;

    const texte = message.message.conversation || message.message.extendedTextMessage?.text || "";
    const mentions = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!texte.includes("⚽") || mentions.length === 0) return;

    const cibleJid = normalizeJid(mentions[0]);
    const cible = epreuve.participants.find(p => normalizeJid(p.jid) === cibleJid);
    if (!cible) return;

    const tirTexte = texte.split("⚽")[1]?.trim() || "Tir du Loup";

    epreuve.tirEnCours = { cibleJid, texte: tirTexte, timestamp: Date.now() };

    // Calcul du succès automatique
    let chance = 50 + (Math.random() * 20 - 10);
    const touché = Math.random() * 100 <= chance;

    if (touché) {
      epreuve.loupJid = cibleJid;
      await ovl.sendMessage(chatId, {
        video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
        gifPlayback: true,
        caption: `✅ **TOUCHÉ !**\n@${jidBase(cibleJid)} devient le nouveau Loup 🐺.`,
        mentions: [cibleJid]
      });
    } else {
      await ovl.sendMessage(chatId, {
        video: { url: ['https://files.catbox.moe/obqo0d.mp4','https://files.catbox.moe/m00580.mp4'][Math.floor(Math.random()*2)] },
        gifPlayback: true,
        caption: `❌ **RATÉ !**\nLe Loup reste @${jidBase(epreuve.loupJid)}.`,
        mentions: [epreuve.loupJid]
      });
    }

    epreuve.tirEnCours = null;

  } catch (err) {
    console.error("[LOUP][GERER TIR] ❌", err);
  }
}

// OvLCMD global pour écouter tous les messages
ovlcmd({
  nom_cmd: 'tir_loup_auto',
  isfunc: true
}, async (ms_org, ovl, { texte, getJid }) => {
  await gererMessageTir(ms_org, ovl, getJid);
});

// ──────────────────────────────
// COMMANDES UTILITAIRES : PAUSE / STOP / PING
// ──────────────────────────────
ovlcmd({ nom_cmd: 'stoploup', desc: "Arrête l'épreuve", react: '🛑' }, async (ms_org, ovl, { repondre, commande }) => {
  if (commande !== 'stoploup') return;
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return;

  clearTimeout(epreuve.timerPaves);
  epreuvesLoup.delete(chatId);
  await ovl.sendMessage(chatId, { text: `🛑 Épreuve arrêtée manuellement.\nLoup actuel : @${jidBase(epreuve.loupJid)}`, mentions: [epreuve.loupJid] });
});

ovlcmd({ nom_cmd: 'pauseloup', desc: "Pause", react: '⏸️' }, async (ms_org, ovl, { repondre, commande }) => {
  if (commande !== 'pauseloup') return;
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return;

  clearTimeout(epreuve.timerPaves);
  await ovl.sendMessage(chatId, { text: "⏸️ Épreuve pausée." });
});

ovlcmd({ nom_cmd: 'resumeloup', desc: "Reprise", react: '▶️' }, async (ms_org, ovl, { repondre, commande }) => {
  if (commande !== 'resumeloup') return;
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.loupJid) return;

  await ovl.sendMessage(chatId, { text: "▶️ Épreuve reprise." });
});

ovlcmd({ nom_cmd: 'ping', desc: "Ping test", react: '🏓' }, async (ms_org, ovl, { repondre, texte }) => {
  if (!texte?.toLowerCase().startsWith('+ping')) return;
  const t1 = Date.now();
  await repondre("🏓 Pong !");
  const t2 = Date.now();
  await repondre(`⏱️ Latence : ${t2 - t1}ms`);
});
