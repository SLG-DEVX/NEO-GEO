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

// ✅ AJOUT — normalisation forte pour comparaison texte
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
// EXTRACTION TEXTE ACTION
// ──────────────────────────────
function extraireTexteAction(texte) {
  const idx = texte.indexOf("⚽");
  if (idx === -1) return null;

  return cleanText(
    texte
      .slice(idx + 1)
      .replace(/blue🔷lock🥅/gi, "")
  );
}

// ✅ AJOUT — extraction du nom mentionné
function extraireNomMentionne(texteAction) {
  const idx = texteAction.indexOf('@');
  if (idx === -1) return null;

  // tout ce qu’il y a après le @
  const apresAt = texteAction.slice(idx + 1);

  return normalizeComparable(apresAt);
}

// ✅ AJOUT — recherche cible dans la liste
function trouverCibleDepuisListe(nomMentionne, participants, loupJid) {
  for (const p of participants) {
    if (jidBase(p.jid) === jidBase(loupJid)) continue;
    if (normalizeComparable(p.tag) === nomMentionne) {
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
// LISTENER AUTOMATIQUE
// ──────────────────────────────
function initLoupListener(ovl) {
  ovl.ev.on("messages.upsert", async ({ messages }) => {
    const ms = messages?.[0];
    if (!ms || !ms.message) return;

    const chatId = ms.key.remoteJid;
    const epreuve = epreuvesLoup.get(chatId);
    if (!epreuve || !epreuve.loupJid) return;

    const senderJid = normalizeJid(ms.key.participant || ms.key.remoteJid);

    // Récupération du texte
    const texte =
      ms.message.conversation ||
      ms.message.extendedTextMessage?.text ||
      ms.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
      ms.message.buttonsResponseMessage?.selectedButtonId;

    if (!texte) return;

    const texteClean = cleanText(texte);
    console.log("🔹 TEXTE REÇU :", texteClean, "| de :", senderJid);

    // ────────────────
    // 1️⃣ Pavé du Loup
    // ────────────────
    if (!epreuve.tirEnCours && jidBase(senderJid) === jidBase(epreuve.loupJid)) {
      if (!texteClean.startsWith("⚽")) return;

      epreuve.tirEnCours = {
        auteur: senderJid,
        pavé: texte,
        zone: null,
        cible: null,
        messages: [],
        nextValidated: false,
        timerPaves: null
      };

      console.log("📝 Pavé du Loup enregistré :", epreuve.tirEnCours);
      return;
    }

    // ────────────────
    // 2️⃣ NEXT⚽ pour valider tir
    // ────────────────
    if (epreuve.tirEnCours && !epreuve.tirEnCours.nextValidated) {
      if (texteClean !== "next⚽") return;

      const texteAction = extraireTexteAction(epreuve.tirEnCours.pavé);
      const zone = texteAction.match(/tete|tête|torse|abdomen|jambe gauche|jambe droite/)?.[0];
      const nomMentionne = extraireNomMentionne(texteAction);

      if (!zone || !nomMentionne) {
        await ovl.sendMessage(chatId, { text: "❌ Zone ou joueur non trouvé dans le pavé du Loup." });
        epreuve.tirEnCours = null;
        return;
      }

      const cible = trouverCibleDepuisListe(nomMentionne, epreuve.participants, epreuve.loupJid);
      if (!cible) {
        await ovl.sendMessage(chatId, { text: "❌ Ce joueur n’est pas dans la liste des participants." });
        epreuve.tirEnCours = null;
        return;
      }

      epreuve.tirEnCours.zone = zone;
      epreuve.tirEnCours.cible = cible.jid;
      epreuve.tirEnCours.nextValidated = true;

      console.log("✅ Tir validé :", {
        loup: epreuve.tirEnCours.auteur,
        cible: epreuve.tirEnCours.cible,
        zone
      });

      await ovl.sendMessage(chatId, {
        text: `⚽ **TIR VALIDÉ !**\n⏱️ 3 minutes pour envoyer le pavé d’esquive 🛡️ @${cible.tag}`,
        mentions: [cible.jid]
      });

      // Timer pour pavé de la cible
      epreuve.tirEnCours.timerPaves = setTimeout(async () => {
        console.log("⏱️ Temps écoulé, analyse du pavé de la cible");
        await analyseEsquive(chatId, ovl);
      }, 3 * 60 * 1000);

      return;
    }

    // ────────────────
    // 3️⃣ Pavé d’esquive de la cible
    // ────────────────
    if (epreuve.tirEnCours && epreuve.tirEnCours.nextValidated) {
      if (!texteClean.startsWith("⚽")) return;
      if (senderJid !== epreuve.tirEnCours.cible) return;

      epreuve.tirEnCours.messages.push({ jid: senderJid, texte: texteClean });

      console.log("🛡️ Pavé de la cible reçu :", texteClean);

      clearTimeout(epreuve.tirEnCours.timerPaves);
      await analyseEsquive(chatId, ovl);
    }
  });
}

// ────────────────
// Fonction analyseEsquive
// ────────────────
async function analyseEsquive(chatId, ovl) {
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.tirEnCours) return;

  const { auteur, cible, zone, messages } = epreuve.tirEnCours;
  const loup = epreuve.participants.find(p => p.jid === auteur);
  const cibleP = epreuve.participants.find(p => p.jid === cible);

  const pavéCible = messages.find(m => m.jid === cible)?.texte || "";
  let esquiveValide = false;

  switch (zone) {
    case "tete":
    case "tête":
      esquiveValide = pavéCible.includes("baisse") || pavéCible.includes("accroupi");
      break;
    case "torse":
    case "abdomen":
      esquiveValide = pavéCible.includes("decale") || pavéCible.includes("bond");
      break;
    case "jambe gauche":
    case "jambe droite":
      esquiveValide = pavéCible.includes("bond") || pavéCible.includes("saute") || pavéCible.includes("plie");
      break;
  }

  const chance = 50 + Math.max(Math.min(loup.niveau - cibleP.niveau, 20), -20);
  const touche = !esquiveValide && Math.random() * 100 < chance;

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
}

// ──────────────────────────────
// EXPORT
// ──────────────────────────────
module.exports = {
  epreuvesLoup,
  initLoupListener
};
