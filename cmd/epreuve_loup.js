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

  const mentions = epreuve.participants.map(p => p.jid);
  return { text: txt, mentions };
}

function cleanStr(str) {
  return str
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u206F]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
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
        rappelTimer: null
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
  if (epreuve.tirEnCours) return; // ne pas modifier pendant tir/esquive

  const cleanTexte = texte.replace(/[\u2066-\u2069]/g, '');
  const lignes = cleanTexte.split('\n');

  let loupJid = null;
  let loupTag = null;

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

    if (isLoup) {
      loupJid = jid;
      loupTag = tag;
    }
  }

  if (epreuve.participants.length < 2) return repondre("❌ Il faut au moins 2 participants.");
  if (!loupJid) return repondre("❌ Aucun joueur avec (Loup) détecté.");

  epreuve.loupJid = loupJid;
  epreuve.debut = false;

  // Timer global
  epreuve.timer = setTimeout(async () => {
    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/9xehjs.png' },
      caption: `🏁 *FIN DE L'ÉPREUVE*\n❌ @${loupTag} est le dernier Loup, il est éliminé !`,
      mentions: [loupJid]
    });
    epreuvesLoup.delete(chatId);
  }, epreuve.tempsRestant);

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

  if (epreuve.rappelTimer) clearTimeout(epreuve.rappelTimer);
  epreuve.rappelTimer = setTimeout(async () => {
    if (!epreuve || epreuve.tirEnCours || epreuve.phase === "PAVES") return;
    await ovl.sendMessage(chatId, { text: `⏳ Temps écoulé ! Le Loup n'a pas tiré.\nIl reste le Loup pour le prochain tour 🐺` });
  }, 3 * 60 * 1000);
});

// ──────────────────────────────
// 🎯 ROUTEUR TIR / ESQUIVE
// ──────────────────────────────
ovlcmd({ nom_cmd: 'loup_action', isfunc: true }, async (ms_org, ovl, { texte }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.actif) return;

  if (!epreuve.tirEnCours) return tir_du_loup(ms_org, ovl, texte);
  if (epreuve.tirEnCours?.phase === "ATTENTE_ESQUIVE") return esquive_cible(ms_org, ovl, texte);
});
// ──────────────────────────────
// ⚽ TIR DU LOUP 
// ──────────────────────────────
async function tir_du_loup(ms_org, ovl, texte) {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.actif || epreuve.tirEnCours) return;
  if (ms_org.sender !== epreuve.loupJid) return;

  // 🔹 Nettoyage texte : normaliser et enlever caractères invisibles
  const cleanTxt = texte
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u206F]/g, '')
    .replace(/\n/g, ' ')
    .toLowerCase();

  // 🔹 Vérifier tir correct
  const tirRegex = /tir direct.*pointe de pied (gauche|droit).*visant le (tête|torse|abdomen|jambe gauche|jambe droite).*@(\S+)/;
  const match = cleanTxt.match(tirRegex);
  if (!match) return; // tir mal formulé, rien ne se passe

  const pied = match[1];
  const zone = match[2];
  let tagCible = match[3];

  // 🔹 Retirer tout caractère invisible autour du tag
  tagCible = tagCible.replace(/[\u2066-\u2069]/g, '');

  // 🔹 Trouver le joueur cible
  const cible = epreuve.participants.find(p => cleanStr(p.tag) === cleanStr(tagCible));
  if (!cible || cible.jid === epreuve.loupJid) return;

  // 🔒 Bloquer les actions pendant ce tir
  epreuve.actif = false;

  // 🧹 Nettoyer ancien timer
  if (epreuve.rappelTimer) {
    clearTimeout(epreuve.rappelTimer);
    epreuve.rappelTimer = null;
  }

  // 🎯 Tir en cours
  epreuve.tirEnCours = {
    zone,
    cible: cible.jid,
    auteur: epreuve.loupJid,
    phase: "ATTENTE_ESQUIVE",
    pavés: new Set(), // joueurs ayant envoyé pavé
  };

  // 🔹 Message de validation du tir (pas de GIF)
  await ovl.sendMessage(chatId, {
    caption: `⚽ Tir validé !\nTous les joueurs ont 3 minutes pour envoyer leurs pavés.\n@${cible.tag} doit envoyer un pavé d’esquive.`,
    mentions: [cible.jid, ...epreuve.participants.map(p => p.jid)]
  });

  // ⏱️ Timer global 3 min pour que tous fassent leur pavé
  epreuve.rappelTimer = setTimeout(async () => {
    // Calcul automatique si pavés manquants
    if (!epreuve.tirEnCours) return;

    const tir = epreuve.tirEnCours;
    const loup = epreuve.participants.find(p => p.jid === tir.auteur);
    const ciblePlayer = epreuve.participants.find(p => p.jid === tir.cible);

    // Tiré automatiquement touché si la cible n’a pas esquivé
    let touche = true;

    if (tir.pavés.has(cible.jid)) {
      // La cible a envoyé son pavé d’esquive : calcul normal
      let chance = 50;
      const diff = loup.niveau - ciblePlayer.niveau;
      if (diff >= 5) chance = 70;
      if (diff <= -5) chance = 30;
      touche = Math.random() * 100 < chance;
    }

    if (touche) {
      epreuve.loupJid = ciblePlayer.jid;
      await ovl.sendMessage(chatId, {
        caption: `✅ TOUCHÉ !\n@${ciblePlayer.tag} devient le Loup 🐺`,
        mentions: [ciblePlayer.jid]
      });
    } else {
      await ovl.sendMessage(chatId, {
        caption: `❌ ESQUIVE RÉUSSIE !\n@${loup.tag} reste le Loup 🐺`,
        mentions: [loup.jid]
      });
    }

    // 🔓 Déverrouiller
    epreuve.actif = true;
    epreuve.tirEnCours = null;
  }, 3 * 60 * 1000);
}
// ──────────────────────────────
// 🎯 GESTION DES PAVÉS DES JOUEURS ET ESQUIVE
// ──────────────────────────────
ovlcmd({ nom_cmd: 'loup_action', isfunc: true }, async (ms_org, ovl, { texte }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.actif) return;

  // 🔹 Si aucun tir en cours, on vérifie si c'est le Loup qui tire
  if (!epreuve.tirEnCours) return tir_du_loup(ms_org, ovl, texte);

  const tir = epreuve.tirEnCours;

  // 🔹 Cible qui fait son pavé d'esquive
  if (ms_org.sender === tir.cible && tir.phase === "ATTENTE_ESQUIVE") {
    // Normaliser le texte
    const t = texte.toLowerCase();

    // Vérifier esquive valide selon la zone
    let esquiveValide = false;
    switch (tir.zone) {
      case "tête":
        esquiveValide = t.includes("baisse") || t.includes("accroupi");
        break;
      case "torse":
      case "abdomen":
        esquiveValide = t.includes("décale") || t.includes("bond");
        break;
      case "jambe gauche":
      case "jambe droite":
        esquiveValide = t.includes("plie") || t.includes("bond");
        break;
    }
    if (!esquiveValide) return;

    // Marquer que la cible a fait son pavé
    tir.pavés.add(tir.cible);

    // Calcul touché / esquive
    const loup = epreuve.participants.find(p => p.jid === tir.auteur);
    const cible = epreuve.participants.find(p => p.jid === tir.cible);

    let chance = 50;
    const diff = loup.niveau - cible.niveau;
    if (diff >= 5) chance = 70;
    if (diff <= -5) chance = 30;

    const touche = Math.random() * 100 < chance;

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

    // 🔓 Déverrouillage global
    epreuve.tirEnCours = null;
    epreuve.actif = true;

    if (epreuve.rappelTimer) {
      clearTimeout(epreuve.rappelTimer);
      epreuve.rappelTimer = null;
    }
    return;
  }

  // 🔹 Pavé d'un autre joueur (juste pour tracker qu'il a joué)
  const joueur = epreuve.participants.find(p => p.jid === ms_org.sender);
  if (joueur) {
    tir.pavés.add(joueur.jid);
    await ovl.sendMessage(chatId, {
      text: `📋 Pavé reçu de @${joueur.tag}`,
      mentions: [joueur.jid]
    });
  }
});

// ──────────────────────────────
// ⚽ TIR DU LOUP (avec timer pour pavés)
// ──────────────────────────────
async function tir_du_loup(ms_org, ovl, texte) {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.actif || epreuve.tirEnCours) return;
  if (ms_org.sender !== epreuve.loupJid) return;

  const cleanTxt = texte
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u206F]/g, '')
    .replace(/\n/g, ' ')
    .toLowerCase();

  const tirRegex = /tir direct.*pointe de pied (gauche|droit).*visant le (tête|torse|abdomen|jambe gauche|jambe droite).*@(\S+)/;
  const match = cleanTxt.match(tirRegex);
  if (!match) return; // tir mal formulé

  const pied = match[1];
  const zone = match[2];
  let tagCible = match[3].replace(/[\u2066-\u2069]/g, '');

  const cible = epreuve.participants.find(p => cleanStr(p.tag) === cleanStr(tagCible));
  if (!cible || cible.jid === epreuve.loupJid) return;

  epreuve.actif = false;

  if (epreuve.rappelTimer) {
    clearTimeout(epreuve.rappelTimer);
    epreuve.rappelTimer = null;
  }

  epreuve.tirEnCours = {
    zone,
    cible: cible.jid,
    auteur: epreuve.loupJid,
    phase: "ATTENTE_ESQUIVE",
    pavés: new Set()
  };

  await ovl.sendMessage(chatId, {
    caption: `⚽ Tir validé !\nTous les joueurs ont 3 minutes pour envoyer leurs pavés.\n@${cible.tag} doit envoyer un pavé d’esquive.`,
    mentions: [cible.jid, ...epreuve.participants.map(p => p.jid)]
  });

  // Timer global pour finir pavés automatiquement
  epreuve.rappelTimer = setTimeout(async () => {
    if (!epreuve.tirEnCours) return;

    const tir = epreuve.tirEnCours;
    const loup = epreuve.participants.find(p => p.jid === tir.auteur);
    const ciblePlayer = epreuve.participants.find(p => p.jid === tir.cible);

    let touche = true; // par défaut touché si la cible n'a pas esquivé
    if (tir.pavés.has(ciblePlayer.jid)) {
      // calcul normal si la cible a envoyé son pavé
      let chance = 50;
      const diff = loup.niveau - ciblePlayer.niveau;
      if (diff >= 5) chance = 70;
      if (diff <= -5) chance = 30;
      touche = Math.random() * 100 < chance;
    }

    if (touche) {
      epreuve.loupJid = ciblePlayer.jid;
      await ovl.sendMessage(chatId, {
        caption: `✅ TOUCHÉ !\n@${ciblePlayer.tag} devient le Loup 🐺`,
        mentions: [ciblePlayer.jid]
      });
    } else {
      await ovl.sendMessage(chatId, {
        caption: `❌ ESQUIVE RÉUSSIE !\n@${loup.tag} reste le Loup 🐺`,
        mentions: [loup.jid]
      });
    }

    epreuve.actif = true;
    epreuve.tirEnCours = null;
    epreuve.rappelTimer = null;
  }, 3 * 60 * 1000);
}

// ──────────────────────────────
// POSITIONS / ORIENTATION
// ──────────────────────────────
function getRoueDirection(current, target, side) {
  const roue = {1:{gauche:4,droite:3},2:{gauche:3,droite:4},3:{gauche:1,droite:2},4:{gauche:2,droite:1}};
  return roue[current][side];
}

function getPivotLoup(currentPos, targetPos) {
  const map = {1:{1:0,2:180,3:90,4:-90},2:{1:180,2:0,3:-90,4:90},3:{1:-90,2:90,3:0,4:180},4:{1:90,2:-90,3:180,4:0}};
  return map[currentPos][targetPos];
}

ovlcmd({ nom_cmd: 'course', isfunc: true }, async (ms_org, ovl, { texte, getJid }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.positions) return;

  // 🔒 BLOQUAGE PENDANT TIR / ESQUIVE
  if (epreuve.tirEnCours) return;

  const t = texte.toLowerCase();
  if (!t.includes("je cours") || !t.includes("vmax")) return;

  let jid;
  try { jid = await getJid(ms_org.sender, ms_org, ovl); } catch { return; }

  const m = t.match(/point\s*(\d)/);
  if (!m) return;

  const targetPos = parseInt(m[1]);
  const currentPos = epreuve.positions.get(jid) || 1;

  let dir = null;
  if (t.includes("gauche")) dir = "gauche";
  if (t.includes("droite")) dir = "droite";

  if (!dir || getRoueDirection(currentPos, targetPos, dir) !== targetPos) {
    epreuve.loupJid = jid;
    await ovl.sendMessage(chatId, {
      text: `❌ Mauvaise trajectoire ! @${jid.split('@')[0]} devient le Loup 🐺`,
      mentions: [jid]
    });
  } else {
    epreuve.positions.set(jid, targetPos);
  }
});

ovlcmd({ nom_cmd:'rotation', isfunc:true }, async(ms_org, ovl, { texte })=>{
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.loupJid) return;

  // 🔒 BLOQUAGE PENDANT TIR / ESQUIVE
  if (epreuve.tirEnCours) return;

  const t = texte.toLowerCase();
  let newOri = epreuve.orientationLoup;

  if (t.includes("90") && t.includes("droite")) newOri = (newOri % 4) + 1;
  if (t.includes("90") && t.includes("gauche")) newOri = ((newOri + 2) % 4) + 1;
  if (t.includes("180")) newOri = ((newOri + 1) % 4) + 1;

  epreuve.orientationLoup = newOri;
});

// ──────────────────────────────
// COMMANDES MANUELLES
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'setloup',
  classe: 'BLUELOCK⚽',
  desc: 'Définir manuellement le Loup',
  react: '🐺'
}, async (ms_org, ovl, { texte, getJid, repondre }) => {

  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return;

  // 🔒 Interdit pendant un tir
  if (!epreuve.actif || epreuve.tirEnCours) {
    return repondre("⛔ Impossible pendant un tir ou une esquive.");
  }

  const m = texte.match(/@(\S+)/);
  if (!m) return repondre("❌ Utilisation : +setloup @tag");

  let jid;
  try {
    jid = await getJid(m[1] + "@lid", ms_org, ovl);
  } catch {
    return repondre("❌ Joueur introuvable.");
  }

  if (!epreuve.participants.find(p => p.jid === jid)) {
    return repondre("❌ Ce joueur ne participe pas à l’épreuve.");
  }

  epreuve.loupJid = jid;

  await ovl.sendMessage(chatId, {
    text: `🐺 Loup défini manuellement : @${jid.split('@')[0]}`,
    mentions: [jid]
  });
});

ovlcmd({ nom_cmd:'pauseloup', desc:"Pause", react:'⏸️' }, async(ms_org,ovl)=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve) return;
  clearTimeout(epreuve.timer);
  clearTimeout(epreuve.rappelTimer);
  await ovl.sendMessage(chatId,{text:"⏸️ *ÉPREUVE PAUSÉE*"});
});

ovlcmd({ nom_cmd:'resumeloup', desc:"Resume", react:'▶️' }, async(ms_org,ovl)=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve) return;
  startTour(chatId, ovl);
  await ovl.sendMessage(chatId,{text:"▶️ *ÉPREUVE REPRISE*"});
});

// ──────────────────────────────
// EXPORT DU MODULE
// ──────────────────────────────
module.exports = epreuvesLoup;
