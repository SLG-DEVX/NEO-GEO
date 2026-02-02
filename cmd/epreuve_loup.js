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

  const t = texte
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060-\u206F]/g, '')
    .toLowerCase();

  const tirOk =
    t.includes("tir direct") &&
    t.includes("pointe de pied") &&
    t.includes("visant");

  const zoneMatch = t.match(/(tête|torse|abdomen|jambe gauche|jambe droite)/i);
  if (!tirOk || !zoneMatch) return;

  const cible = epreuve.participants.find(p =>
    t.includes("@" + p.tag.toLowerCase())
  );
  if (!cible || cible.jid === epreuve.loupJid) return;

  // 🔒 VERROU GLOBAL
  epreuve.actif = false;

  // 🧹 Nettoyage ancien timer
  if (epreuve.rappelTimer) {
    clearTimeout(epreuve.rappelTimer);
    epreuve.rappelTimer = null;
  }

  // 🎯 Tir en cours
  epreuve.tirEnCours = {
    zone: zoneMatch[1],
    cible: cible.jid,
    auteur: epreuve.loupJid,
    phase: "ATTENTE_ESQUIVE"
  };

  await ovl.sendMessage(chatId, {
    caption: `⚽ Tir validé !\n@${cible.tag}, esquive le tir !`,
    mentions: [cible.jid]
  });

  // ⏱️ TIMER ESQUIVE (3 MIN)
  epreuve.rappelTimer = setTimeout(async () => {
    // Si toujours pas d'esquive
    if (!epreuve.tirEnCours) return;

    epreuve.loupJid = cible.jid;
    epreuve.tirEnCours = null;
    epreuve.actif = true;

    await ovl.sendMessage(chatId, {
      caption: `⏱️ Temps écoulé !\n@${cible.tag} n’a pas esquivé et devient le Loup 🐺`,
      mentions: [cible.jid]
    });
  }, 3 * 60 * 1000);
}

// ──────────────────────────────
// 🛡️ ESQUIVE DE LA CIBLE
// ──────────────────────────────
async function esquive_cible(ms_org, ovl, texte) {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.tirEnCours) return;

  const tir = epreuve.tirEnCours;
  if (tir.phase !== "ATTENTE_ESQUIVE") return;
  if (ms_org.sender !== tir.cible) return;

  const t = texte.toLowerCase();
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

  clearTimeout(epreuve.rappelTimer);
  epreuve.rappelTimer = null;

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

  // 🔓 DÉVERROUILLAGE GLOBAL
  epreuve.actif = true;
  epreuve.tirEnCours = null;
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
ovlcmd({ nom_cmd:'setloup', isfunc:true }, async(ms_org,ovl,{texte,getJid})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve || epreuve.tirEnCours) return;
  const m=texte.match(/@(\S+)/);
  if(!m) return;
  let jid;
  try{jid=await getJid(m[1]+"@lid",ms_org,ovl);}catch{return;}
  epreuve.loupJid=jid;
  await ovl.sendMessage(chatId,{text:`✅ @${jid.split('@')[0]} devient le Loup 🐺`,mentions:[jid]});
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
