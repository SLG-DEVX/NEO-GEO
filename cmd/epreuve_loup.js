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
    if (!ms || !ms.message || ms.key.fromMe) return;

    const chatId = ms.key.remoteJid;
    const epreuve = epreuvesLoup.get(chatId);
    if (!epreuve || !epreuve.loupJid) return;

    const senderJid = normalizeJid(ms.key.participant || ms.key.remoteJid);
    const texte = ms.message.conversation || ms.message.extendedTextMessage?.text;
    if (!texte) return;

    const estPave =
      texte.includes("💬:") &&
      /⚽[\s\S]*?blue🔷lock🥅/i.test(texte);

    if (!estPave) return;

    const texteAction = extraireTexteAction(texte);
    if (!texteAction) return;

    // ────────────────
    // TIR DU LOUP
    // ────────────────
if (!epreuve.tirEnCours) {
  if (jidBase(senderJid) !== jidBase(epreuve.loupJid)) return;

  // 🔍 DEBUG — TEXTE
  console.log("📩 TEXTE BRUT =", texte);

  const zone = texteAction.match(/tete|tête|torse|abdomen|jambe gauche|jambe droite/)?.[0];

  // 🔍 DEBUG — TEXTE ACTION
  console.log("🎯 TEXTE ACTION =", texteAction);

  if (!zone) {
    await ovl.sendMessage(chatId, {
      text: "❌ Zone invalide. Utilise : tête, torse, abdomen, jambe gauche ou jambe droite."
    });
    return;
  }

  const nomMentionne = extraireNomMentionne(texteAction);

  // 🔍 DEBUG — NOM EXTRAIT
  console.log("👤 NOM EXTRAIT =", nomMentionne);

  if (!nomMentionne) {
    await ovl.sendMessage(chatId, {
      text: "❌ Aucun joueur mentionné. Mentionne un joueur avec @Nom."
    });
    return;
  }

  // 🔍 DEBUG — PARTICIPANTS
  console.log("📋 PARTICIPANTS =", epreuve.participants.map(p => p.tag));

  const cible = trouverCibleDepuisListe(
    nomMentionne,
    epreuve.participants,
    epreuve.loupJid
  );

  if (!cible) {
    await ovl.sendMessage(chatId, {
      text: "❌ Ce joueur n’est pas inscrit dans la liste des participants."
    });
    return;
  } 
    
      const cible = trouverCibleDepuisListe(
        nomMentionne,
        epreuve.participants,
        epreuve.loupJid
      );

      if (!cible) {
        await ovl.sendMessage(chatId, {
          text: "❌ Ce joueur n’est pas inscrit dans la liste des participants."
        });
        return;
      }

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

      epreuve.timerPaves = setTimeout(
        () => verdictFinal(chatId, ovl),
        3 * 60 * 1000
      );
      return;
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
