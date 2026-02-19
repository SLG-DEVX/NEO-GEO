const { ovlcmd } = require('../lib/ovlcmd');
const epreuvesLoup = new Map();

// ──────────────────────────────
// UTILITAIRES DE NETTOYAGE
// ──────────────────────────────
function cleanText(str) {
  if (!str) return '';
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
// EXTRACTION DE LA CIBLE (Plan B si pas de vraie mention)
// ──────────────────────────────
function extraireCibleDepuisTexte(texteAction, participants) {
  const texteClean = cleanText(texteAction);
  for (const p of participants) {
    const tagClean = cleanTag(p.tag);
    if (texteClean.includes(tagClean)) {
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
    try { 
        // Note: Assure-toi que '@lid' est le bon format pour ton framework, sinon utilise '@s.whatsapp.net'
        jid = await getJid(tag + "@s.whatsapp.net", ms_org, ovl); 
    } catch { continue; }

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
    caption: `⚽ Début de l'exercice !\nLe joueur @${mentionId} est le Loup 🐺⚠️\nVeuillez toucher un joueur avant la fin du temps ⌛ (3:00 min)`,
    mentions: [loupJid]
  });
});

// ──────────────────────────────
// LISTENER AUTOMATIQUE LOUP RP COMPLET
// ──────────────────────────────
function initLoupListener(ovl) {
  ovl.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const ms = messages?.[0];
      if (!ms || !ms.message || ms.key.fromMe) return;

      const chatId = ms.key.remoteJid;
      const epreuve = epreuvesLoup.get(chatId);
      if (!epreuve || !epreuve.loupJid) return;

      const senderJid = normalizeJid(ms.key.participant || ms.key.remoteJid);
      const rawTexte = ms.message.conversation || ms.message.extendedTextMessage?.text;
      if (!rawTexte) return;

      const texteClean = cleanText(rawTexte);
      const senderNorm = normalizeJid(senderJid);
      const loupNorm = normalizeJid(epreuve.loupJid);

      // ==========================================
      // 1. LE LOUP TENTE UN TIR
      // ==========================================
      if (!epreuve.tirEnCours) {
        if (senderNorm !== loupNorm) return;

        // Fonction interne pour analyser le RP du loup
        function detectTirLoupRP(t) {
          const ZONES = ["tête", "torse", "abdomen", "jambe gauche", "jambe droite", "bras gauche", "bras droit"];
          const TYPES = ["tir", "frappe", "coup de pied", "volée", "shoot", "chasse", "pied", "passe rapide"];

          let type = TYPES.find(k => t.includes(cleanText(k))) || "tir";
          let zone = ZONES.find(z => t.includes(cleanText(z)));

          // Fallbacks en anglais ou synonymes
          if (!zone) {
            if (t.includes("head")) zone = "tête";
            else if (t.includes("chest")) zone = "torse";
            else if (t.includes("ventre")) zone = "abdomen";
            else if (t.includes("left leg")) zone = "jambe gauche";
            else if (t.includes("right leg")) zone = "jambe droite";
            else if (t.includes("arm")) zone = "bras gauche";
          }

          return zone ? { type, zone } : null;
        }

        const tir = detectTirLoupRP(texteClean);
        if (!tir) return;

        // --- Récupération de la cible ---
        let cible = null;
        const mentioned = ms.message.extendedTextMessage?.contextInfo?.mentionedJid;
        
        // S'il y a une vraie mention WhatsApp
        if (Array.isArray(mentioned) && mentioned.length > 0) {
          const cibleJid = normalizeJid(mentioned[0]);
          cible = epreuve.participants.find(p => normalizeJid(p.jid) === cibleJid);
        } 
        // Plan B : On cherche le tag dans le texte si la mention n'est pas formatée
        else {
          cible = extraireCibleDepuisTexte(rawTexte, epreuve.participants);
        }

        if (!cible || normalizeJid(cible.jid) === loupNorm) return;

        // --- Enregistrement du tir ---
        epreuve.tirEnCours = {
          auteur: epreuve.loupJid,
          cible: cible.jid,
          zone: tir.zone,
          type: tir.type,
          esquiveReussie: false // Nouveau paramètre pour bloquer le tir si esquivé
        };

        await ovl.sendMessage(chatId, {
          text: `⚽ **TIR VALIDÉ !**\nZone visée : *${tir.zone}*\n⏱️ 3 minutes pour envoyer le pavé d’esquive 🛡️ @${cible.tag}`,
          mentions: [cible.jid]
        });

        // Timer 3 minutes
        epreuve.timerPaves = setTimeout(async () => {
          await verdictFinal(chatId, ovl);
        }, 3 * 60 * 1000);

        return;
      }

      // ==========================================
      // 2. LA CIBLE TENTE UNE ESQUIVE
      // ==========================================
      if (epreuve.tirEnCours) {
        const cibleJid = normalizeJid(epreuve.tirEnCours.cible);
        
        // On vérifie que c'est bien la cible qui répond
        if (senderNorm !== cibleJid) return;

        const zone = epreuve.tirEnCours.zone;
        let esquiveValide = false;

        // Validation de l'esquive selon la zone visée
        switch(zone) {
          case "tête":
            esquiveValide = texteClean.includes("baisse") || texteClean.includes("accroup");
            break;
          case "torse":
          case "abdomen":
            esquiveValide = texteClean.includes("decale") || texteClean.includes("bond");
            break;
          case "jambe gauche":
          case "jambe droite":
            esquiveValide = texteClean.includes("bond") || texteClean.includes("saute") || texteClean.includes("plie");
            break;
          case "bras gauche":
          case "bras droit":
            esquiveValide = texteClean.includes("evite") || texteClean.includes("decale");
            break;
        }

        if (esquiveValide) {
          epreuve.tirEnCours.esquiveReussie = true;
          clearTimeout(epreuve.timerPaves); // On annule le timer car l'action est finie
          await verdictFinal(chatId, ovl);
        }
      }
    } catch (e) {
      console.error("Erreur dans initLoupListener :", e);
    }
  });
}

// ──────────────────────────────
// VERDICT FINAL (Avec impact de l'esquive)
// ──────────────────────────────
async function verdictFinal(chatId, ovl){
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.tirEnCours) return;

  const { auteur, cible, esquiveReussie } = epreuve.tirEnCours;
  const loup = epreuve.participants.find(p => p.jid === auteur);
  const cibleP = epreuve.participants.find(p => p.jid === cible);

  let touche = false;

  // Si la cible n'a pas réussi son esquive RP, on calcule les chances de toucher
  if (!esquiveReussie) {
    const chanceToucher = 50 + Math.max(Math.min(loup.niveau - cibleP.niveau, 20), -20);
    touche = (Math.random() * 100) < chanceToucher;
  }

  if (touche) {
    epreuve.loupJid = normalizeJid(cible);
    await ovl.sendMessage(chatId, {
      video: { url: "https://files.catbox.moe/eckrvo.mp4" },
      gifPlayback: true,
      caption: `✅ **TOUCHÉ !**\nL'esquive a échoué (ou le temps est écoulé).\n@${cibleP.tag} devient le nouveau Loup 🐺.`,
      mentions: [cible]
    });
  } else {
    const gifsRate = ["https://files.catbox.moe/obqo0d.mp4", "https://files.catbox.moe/m00580.mp4"];
    const raison = esquiveReussie ? "Superbe esquive ! 🛡️" : "Le tir était mal cadré !";
    
    await ovl.sendMessage(chatId, {
      video: { url: gifsRate[Math.floor(Math.random() * gifsRate.length)] },
      gifPlayback: true,
      caption: `❌ **RATÉ !**\n${raison}\nLe Loup reste @${loup.tag}.`,
      mentions: [auteur]
    });
  }

  // Réinitialisation pour le prochain tour
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
