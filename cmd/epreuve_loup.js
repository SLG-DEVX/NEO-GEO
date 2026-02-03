const { ovlcmd } = require('../lib/ovlcmd');
const epreuvesLoup = new Map();

// ──────────────────────────────
// UTILITAIRE : FICHE PARTICIPANTS
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

function stripIsolates(str) {
  return str.replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '');
}

function normalizeJid(jid) {
  return jid ? jid.split(':')[0].trim() : '';
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
        positions: new Map(),
        orientationLoup: 1,
        tirEnCours: null,
        tour: 1,
        actif: true,
        debut: true,
        tempsRestant: 15 * 60 * 1000,
        timer: null,
        rappelTimer: null,
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

  const cleanTexte = texte.replace(/[\u2066-\u2069]/g, '');
  const lignes = cleanTexte.split('\n');

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
    epreuve.positions.set(jid, Math.floor(Math.random() * 4) + 1);

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
// 🎧 LISTENER GLOBAL (DEBUG)
// ──────────────────────────────
function initLoupListener(ovl) {
  ovl.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const ms = messages?.[0];
      if (!ms || !ms.message || ms.key.fromMe) return;

      const chatId = ms.key.remoteJid;
      const epreuve = epreuvesLoup.get(chatId);
      if (!epreuve) return;

      if (!epreuve.tirEnCours) {
        await tir_du_loup(ms, ovl, true);
      } else {
        await esquive_cible(ms, ovl, true);
      }
    } catch (err) {
      console.error("Listener Loup erreur :", err);
    }
  });
}

// ──────────────────────────────
// ⚽ TIR DU LOUP (DEBUG COMPLET)
// ──────────────────────────────
async function tir_du_loup(ms_org, ovl, debug = false) {
  const chatId = ms_org.key.remoteJid;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || epreuve.tirEnCours) return;

  const senderJid = normalizeJid(ms_org.sender || ms_org.key?.participant || '');
  if (senderJid !== normalizeJid(epreuve.loupJid)) return;

  let texte = ms_org.message.conversation || ms_org.message.extendedTextMessage?.text;
  if (!texte) return;

  const cleanTexte = stripIsolates(texte).toLowerCase();
  if (debug) await ovl.sendMessage(chatId, { text: `🧪 DEBUG TEXTE BRUT :\n${cleanTexte}` });

  const zoneMatch = cleanTexte.match(/t[eé]te|torse|abdomen|jambe\s+gauche|jambe\s+droite/);
  if (!zoneMatch) {
    if (debug) await ovl.sendMessage(chatId, { text: "🛑 DEBUG : Aucune zone détectée" });
    return;
  }

  const tagMatch = cleanTexte.match(/@([a-z0-9\s._-]+)/i);
  if (!tagMatch) {
    if (debug) await ovl.sendMessage(chatId, { text: "🛑 DEBUG : Aucun tag détecté" });
    return;
  }

  const rawTag = tagMatch[1].trim();
  if (debug) await ovl.sendMessage(chatId, { text: `🧪 DEBUG : Tag détecté = ${rawTag}` });

  const cible = epreuve.participants.find(p => cleanTag(p.tag) === cleanTag(rawTag));
  if (!cible || cible.jid === epreuve.loupJid) {
    if (debug) await ovl.sendMessage(chatId, { text: "🛑 DEBUG : Cible introuvable ou = loup" });
    return;
  }

  epreuve.tirEnCours = {
    auteur: epreuve.loupJid,
    cible: cible.jid,
    zone: zoneMatch[0],
    pavés: new Set()
  };

  if (debug) await ovl.sendMessage(chatId, { text: `🧪 DEBUG : Tir validé sur ${cible.tag} zone ${zoneMatch[0]}` });

  await ovl.sendMessage(chatId, {
    caption:
`⚽ TIR VALIDÉ !
⏱️ 3 minutes pour les pavés
🛡️ @${cible.tag} doit envoyer un pavé d’esquive`,
    mentions: epreuve.participants.map(p => p.jid)
  });

  epreuve.timerPaves = setTimeout(() => verdict_final(chatId, ovl, debug), 3 * 60 * 1000);
}

// ──────────────────────────────
// 🛡️ ESQUIVE (DEBUG)
// ──────────────────────────────
async function esquive_cible(ms_org, ovl, debug = false) {
  const chatId = ms_org.key.remoteJid;
  const epreuve = epreuvesLoup.get(chatId);
  const tir = epreuve?.tirEnCours;
  if (!tir) return;

  const senderJid = normalizeJid(ms_org.sender || ms_org.key?.participant || '');
  if (senderJid !== tir.cible) return;

  let texte = ms_org.message.conversation || ms_org.message.extendedTextMessage?.text;
  if (!texte) return;

  const t = cleanText(texte);

  let valide = false;
  switch (tir.zone) {
    case "tête": valide = t.includes("baisse") || t.includes("accroupi"); break;
    case "torse":
    case "abdomen": valide = t.includes("décale") || t.includes("bond"); break;
    default: valide = t.includes("plie") || t.includes("bond"); break;
  }

  if (!valide) {
    if (debug) await ovl.sendMessage(chatId, { text: `🛑 DEBUG : Pavé non valide pour la zone ${tir.zone}` });
    return;
  }

  tir.pavés.add(tir.cible);
  clearTimeout(epreuve.timerPaves);

  if (debug) await ovl.sendMessage(chatId, { text: "🧪 DEBUG : Pavé validé, verdict final" });

  await verdict_final(chatId, ovl, debug);
}

// ──────────────────────────────
// ⚽🛡️ VERDICT FINAL (DEBUG)
// ──────────────────────────────
async function verdict_final(chatId, ovl, debug = false) {
  const epreuve = epreuvesLoup.get(chatId);
  const tir = epreuve?.tirEnCours;
  if (!tir) return;

  const loup = epreuve.participants.find(p => p.jid === tir.auteur);
  const cible = epreuve.participants.find(p => p.jid === tir.cible);

  let chance = 50;
  const diff = loup.niveau - cible.niveau;
  if (diff >= 5) chance = 70;
  if (diff <= -5) chance = 30;

  const esquive = tir.pavés.has(tir.cible);
  const touche = esquive ? Math.random() * 100 < chance : true;

  if (debug) await ovl.sendMessage(chatId, { text: `🧪 DEBUG : chance ${chance}%, esquive ${esquive}, touche ${touche}` });

  if (touche) {
    epreuve.loupJid = cible.jid;
    await ovl.sendMessage(chatId, {
      caption: `✅ TOUCHÉ !\n@${cible.tag} devient le Loup 🐺`,
      mentions: [cible.jid]
    });
  } else {
    await ovl.sendMessage(chatId, {
      caption: `❌ ESQUIVE RÉUSSIE !\n@${loup.tag} reste le Loup 🐺`,
      mentions: [loup.jid]
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
