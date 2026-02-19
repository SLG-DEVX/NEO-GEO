const { ovlcmd } = require('../lib/ovlcmd');

// On garde la Map pour stocker l'état des parties par groupe
const epreuvesLoup = new Map();

// ──────────────────────────────
// UTILITAIRES
// ──────────────────────────────
function cleanText(str) {
  if (!str) return '';
  return str.normalize("NFKC").replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '').replace(/\n/g, ' ').toLowerCase().trim();
}

// Pour comparer les IDs de manière sûre (on ne garde que les chiffres)
function purId(jid) {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0];
}

// ──────────────────────────────
// 1. LANCEMENT (exercice4)
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'exercice4',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve du loup"
}, async (ms_org, ovl, { repondre, auteur_Message }) => {
  try {
    // Initialisation de la partie pour ce groupe
    await ovl.sendMessage(ms_org, { video: { url: 'https://files.catbox.moe/z64kuq.mp4' }, gifPlayback: true });

    const texteDebut = `🔷 *ÉPREUVE DU LOUP* 🐺⚽
Voulez-vous lancer l’épreuve ?
✅ \`Oui\`  /  ❌ \`Non\``;

    await ovl.sendMessage(ms_org, { image: { url: 'https://files.catbox.moe/zui2we.jpg' }, caption: texteDebut });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = cleanText(rep?.message?.conversation || rep?.message?.extendedTextMessage?.text);
    
    if (response === "oui") {
      epreuvesLoup.set(ms_org, { 
        participants: [], 
        loupJid: null, 
        tirEnCours: null, 
        debut: true 
      });
      await repondre("✅ Mode configuration activé.\nEnvoyez la liste des participants sous ce format :\n@pseudo : niveau (Loup)");
    }
  } catch (err) { console.error("[LOUP ERROR]", err); }
});

// ──────────────────────────────
// 2. GESTION DE LA LISTE (isfunc)
// ──────────────────────────────
ovlcmd({ nom_cmd: 'liste_loup_logic', isfunc: true }, async (ms_org, ovl, { texte, getJid, repondre }) => {
  const epreuve = epreuvesLoup.get(ms_org);
  if (!epreuve || !epreuve.debut) return;

  const lignes = texte.split('\n');
  let aTrouveQuelqueChose = false;

  for (const ligne of lignes) {
    const m = ligne.match(/@(\S+).*?:\s*(\d+)/i);
    if (!m) continue;

    const tag = m[1];
    const niveau = parseInt(m[2]);
    const isLoup = /\(loup\)/i.test(ligne);

    try {
      // On utilise getJid de ton système pour la compatibilité
      const jid = await getJid(tag + "@s.whatsapp.net", ms_org, ovl);
      epreuve.participants.push({ jid, tag, niveau });
      if (isLoup) epreuve.loupJid = jid;
      aTrouveQuelqueChose = true;
    } catch (e) { console.log("Erreur JID:", tag); }
  }

  if (aTrouveQuelqueChose && epreuve.loupJid) {
    epreuve.debut = false;
    console.log(`[LOUP] Partie démarrée dans ${ms_org}. Loup : ${epreuve.loupJid}`);
    await repondre(`⚽ *L'ÉPREUVE COMMENCE !*
Le loup est @${purId(epreuve.loupJid)}.
Il doit envoyer son pavé d'attaque en taguant sa cible.`, { mentions: [epreuve.loupJid] });
  }
});

// ──────────────────────────────
// 3. LOGIQUE DE JEU (isfunc)
// ──────────────────────────────
ovlcmd({ nom_cmd: 'loup_game_engine', isfunc: true }, async (ms_org, ovl, { texte, auteur_Message, mention_JID }) => {
  const epreuve = epreuvesLoup.get(ms_org);
  if (!epreuve || epreuve.debut || !texte) return;

  const senderId = purId(auteur_Message);
  const loupId = purId(epreuve.loupJid);

  // --- PHASE A : ATTAQUE DU LOUP ---
  if (!epreuve.tirEnCours) {
    if (senderId !== loupId) return; // Seul le loup peut attaquer

    console.log(`[LOG LOUP] Le Loup (${senderId}) a envoyé un message.`);

    const t = cleanText(texte);
    const ZONES = ["tête", "torse", "abdomen", "jambe gauche", "jambe droite", "bras gauche", "bras droit"];
    const TYPES = ["tir", "frappe", "coup de pied", "shoot", "balle", "pied"];

    const zoneTrouvee = ZONES.find(z => t.includes(z));
    const typeTrouve = TYPES.find(ty => t.includes(ty));

    if (!zoneTrouvee || !typeTrouve) {
      console.log(`[LOG LOUP] Message ignoré : Zone=${zoneTrouvee}, Type=${typeTrouve}`);
      return;
    }

    // On récupère la cible via les mentions (ton système fournit mention_JID)
    let cibleJid = (mention_JID && mention_JID.length > 0) ? mention_JID[0] : null;

    // Plan B : Recherche par tag texte si la mention n'est pas passée
    if (!cibleJid) {
      const cibleP = epreuve.participants.find(p => t.includes(p.tag.toLowerCase()));
      if (cibleP) cibleJid = cibleP.jid;
    }

    if (!cibleJid || purId(cibleJid) === senderId) {
      console.log("[LOG LOUP] Pas de cible valide détectée dans l'attaque.");
      return;
    }

    console.log(`[LOG LOUP] Tir validé ! Cible: ${cibleJid} | Zone: ${zoneTrouvee}`);

    epreuve.tirEnCours = {
      auteur: auteur_Message,
      cible: cibleJid,
      zone: zoneTrouvee,
      reussiteEsquive: false
    };

    await ovl.sendMessage(ms_org, { 
      text: `⚽ *ATTAQUE DÉTECTÉE !*
@${purId(auteur_Message)} a envoyé un ${typeTrouve} vers la *${zoneTrouvee}* de @${purId(cibleJid)} !

🛡️ @${purId(cibleJid)}, tu as 3 minutes pour envoyer ton pavé d'esquive !`,
      mentions: [auteur_Message, cibleJid]
    });

    // Timer de 3 minutes
    epreuve.timer = setTimeout(() => {
      finaliserAction(ms_org, ovl);
    }, 180000);

  } 
  // --- PHASE B : ESQUIVE DE LA CIBLE ---
  else {
    const cibleAttenduId = purId(epreuve.tirEnCours.cible);
    if (senderId !== cibleAttenduId) return;

    console.log(`[LOG LOUP] La cible (${senderId}) tente une esquive.`);
    const t = cleanText(texte);
    const zoneVisee = epreuve.tirEnCours.zone;
    let esquiveValide = false;

    // Conditions d'esquive par zone
    if (zoneVisee === "tête" && (t.includes("baisse") || t.includes("accroup"))) esquiveValide = true;
    if ((zoneVisee === "torse" || zoneVisee === "abdomen") && (t.includes("decale") || t.includes("côté") || t.includes("pivot"))) esquiveValide = true;
    if (zoneVisee.includes("jambe") && (t.includes("saute") || t.includes("bond") || t.includes("leve"))) esquiveValide = true;

    if (esquiveValide) {
      console.log("[LOG LOUP] Esquive réussie par mot-clé !");
      epreuve.tirEnCours.reussiteEsquive = true;
      if (epreuve.timer) clearTimeout(epreuve.timer);
      await finaliserAction(ms_org, ovl);
    }
  }
});

// ──────────────────────────────
// FINALISATION
// ──────────────────────────────
async function finaliserAction(chatId, ovl) {
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.tirEnCours) return;

  const { auteur, cible, zone, reussiteEsquive } = epreuve.tirEnCours;

  if (reussiteEsquive) {
    await ovl.sendMessage(chatId, { 
      text: `❌ *RATÉ !*
@${purId(cible)} a réussi son esquive RP contre le tir à la ${zone} !
🐺 Le loup reste @${purId(auteur)}.`,
      mentions: [auteur, cible]
    });
  } else {
    epreuve.loupJid = cible; // La cible devient le nouveau loup
    await ovl.sendMessage(chatId, { 
      video: { url: "https://files.catbox.moe/eckrvo.mp4" },
      gifPlayback: true,
      caption: `✅ *TOUCHÉ !*
@${purId(cible)} a été atteint ! Tu es le nouveau Loup. 🐺`,
      mentions: [cible]
    });
  }

  epreuve.tirEnCours = null;
  console.log(`[LOG LOUP] Action résolue dans ${chatId}.`);
}

// ──────────────────────────────
// COMMANDE : STOP
// ──────────────────────────────
ovlcmd({
    nom_cmd: 'stop_loup',
    classe: 'BLUELOCK⚽',
    desc: "Arrête l'épreuve en cours"
}, async (ms_org, ovl, { repondre, verif_Admin }) => {
    if (!verif_Admin) return repondre("Seul un admin peut stopper l'exercice.");
    epreuvesLoup.delete(ms_org);
    repondre("🛑 Épreuve terminée et données effacées.");
});

module.exports = { epreuvesLoup };
