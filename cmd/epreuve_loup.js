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

    // GIF d'intro
    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/z64kuq.mp4' },
      gifPlayback: true
    });

    const texteDebut = `🔷 *ÉPREUVE DU LOUP*🐺❌⚽
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░

*⚽RÈGLES:*
Objectif : toucher un autre joueur avec le ballon ⚽ avant la fin du temps imparti : 15 minutes❗
Le modérateur doit ensuite envoyer la liste des participants avec leurs niveaux et ajouter (Loup) au joueur qui commence.

⚽ Voulez-vous lancer l’épreuve ?
✅ \`Oui\`  
❌ \`Non\`

*⚽BLUE🔷LOCK*`;

    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/k87s8y.png' },
      caption: texteDebut
    });

    // Attend réponse du modérateur
    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = rep?.message?.conversation?.toLowerCase() || rep?.message?.extendedTextMessage?.text?.toLowerCase();
    if (!response) return repondre("⏳ Pas de réponse, épreuve annulée.");
    if (response === "non") return repondre("❌ Lancement annulé.");

    if (response === "oui") {
      // Initialise l'épreuve
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
// LECTURE LISTE DES PARTICIPANTS ET LANCEMENT DE L'ÉPREUVE
// ──────────────────────────────
ovlcmd({ nom_cmd: 'liste_loup', isfunc: true }, async (ms_org, ovl, { texte, getJid, repondre }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return;

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

    epreuve.participants.push({ jid, tag, niveau, isLoup });
    epreuve.positions.set(jid, Math.floor(Math.random() * 4) + 1);

    if (isLoup) {
      loupJid = jid;
      loupTag = tag;
    }
  }

  if (epreuve.participants.length < 2) return repondre("❌ Il faut au moins 2 participants.", ms_org);
  if (!loupJid) return repondre("❌ Aucun joueur avec (Loup) détecté.", ms_org);

  epreuve.loupJid = loupJid;
  epreuve.debut = false;

  // Timer global 15 minutes
  epreuve.timer = setTimeout(async () => {
    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/9xehjs.png' },
      caption: `🏁 *FIN DE L'ÉPREUVE*\n❌ @${loupTag} est le dernier Loup, il est éliminé !`,
      mentions: [loupJid]
    });
    epreuvesLoup.delete(chatId);
  }, epreuve.tempsRestant);

  // Envoi du GIF et message de début avec **mention propre**
  const fiche = renderFicheParticipants(epreuve);
const mentionId = loupJid.split('@')[0];

await ovl.sendMessage(chatId, {
  video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
  gifPlayback: true,
  caption:
`⚽ Début de l'exercice !
Le joueur @${mentionId} est le Loup 🐺⚠️
Veuillez toucher un joueur avant la fin du temps ⌛,3:00 mins`,
  mentions: [loupJid]
});

// ⏳ DÉMARRAGE IMMÉDIAT DU TIMER DE 3 MINUTES
if (epreuve.rappelTimer) clearTimeout(epreuve.rappelTimer);

epreuve.rappelTimer = setTimeout(async () => {
  // Sécurité : si le Loup a déjà tiré, on ne fait rien
  if (!epreuve || epreuve.tirEnCours) return;

  await ovl.sendMessage(chatId, {
    text: `⏳ Temps écoulé ! Le Loup n'a pas tiré.\nIl reste le Loup pour le prochain tour 🐺`
  });
}, 3 * 60 * 1000);

// ──────────────────────────────
// TIR DU LOUP + PAVÉS DES PARTICIPANTS
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'tir',
  isfunc: true
}, async (ms_org, ovl, { texte, getJid }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || epreuve.tirEnCours) return;

  // Seul le Loup peut tirer
  if (ms_org.sender !== epreuve.loupJid) return;

  // Vérifie que le message contient bien le pavé du tir
  if (!/💬:\s*[\s\S]*?⚽/i.test(texte)) return;

  const t = texte.toLowerCase();
  const m = t.match(/@(.+?)\s.*?(tête|torse|abdomen|jambe gauche|jambe droite)/i);
  if (!m) return;

  // Récupère le JID de la cible
  let cibleJid;
  try { cibleJid = await getJid(m[1] + "@lid", ms_org, ovl); } catch { return; }

  const zone = m[2].replace(" ", "_");

  const loup = epreuve.participants.find(p => p.jid === epreuve.loupJid);
  const cible = epreuve.participants.find(p => p.jid === cibleJid);
  if (!loup || !cible) return;

  // Calcul chance de réussite
  let chance = 50;
  const diff = loup.niveau - cible.niveau;
  if (diff >= 5) chance = 70;
  else if (diff <= -5) chance = 30;

  const hit = Math.random() * 100 <= chance;

  if (!hit) {
    // Tir raté → Loup reste
    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/obqo0d.mp4' },
      gifPlayback: true,
      caption: `❌ RATÉ !\n@${loup.tag} reste le Loup 🐺`,
      mentions: [loup.jid]
    });
    return;
  }

  // Tir réussi
  await ovl.sendMessage(chatId, {
    video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
    gifPlayback: true,
    caption: `✅⚽ Tir du Loup validé 🐺`
  });

  // Initialise tir en cours pour gérer les pavés
  epreuve.tirEnCours = {
    cible: cibleJid,
    zone,
    hit,
    pavés: new Map() // jid => true si pavé envoyé
  };

  // Liste des participants à surveiller (tous sauf le Loup)
  const participantsCibles = epreuve.participants.filter(p => p.jid !== loup.jid).map(p => p.jid);

  // Timer silencieux 3 minutes pour pavés
  if (epreuve.rappelTimer) clearTimeout(epreuve.rappelTimer);
  epreuve.rappelTimer = setTimeout(async () => {
    const nonRépondu = participantsCibles.find(jid => !epreuve.tirEnCours.pavés.has(jid));
    if (nonRépondu) {
      epreuve.loupJid = nonRépondu;
      const nouveauLoup = epreuve.participants.find(p => p.jid === nonRépondu);
      await ovl.sendMessage(chatId, {
        video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
        gifPlayback: true,
        caption: `⏱️ Temps écoulé !\n@${nouveauLoup.tag} devient le nouveau Loup 🐺`,
        mentions: [nouveauLoup.jid]
      });
    }
    epreuve.tirEnCours = null;
    epreuve.rappelTimer = null;
  }, 3 * 60 * 1000);
});

// ──────────────────────────────
// PAVÉ DES PARTICIPANTS (ESQUIVE)
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'esquive',
  isfunc: true
}, async (ms_org, ovl, { texte }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.tirEnCours) return;

  const { zone, hit, pavés } = epreuve.tirEnCours;

  // Seul les participants autres que le Loup peuvent envoyer leur pavé
  if (ms_org.sender === epreuve.loupJid) return;

  const t = texte.toLowerCase();

  // Vérifie si le pavé correspond à une esquive correcte selon la zone
  let valide = false;
  switch (zone) {
    case "tête":
      valide = t.includes("baisse") || t.includes("esquive") || t.includes("évite");
      break;
    case "torse":
    case "abdomen":
      valide = t.includes("décalage") || t.includes("bond") || t.includes("esquive");
      break;
    case "jambe_gauche":
      valide = t.includes("plie la jambe gauche") || t.includes("bond") || t.includes("esquive");
      break;
    case "jambe_droite":
      valide = t.includes("plie la jambe droite") || t.includes("bond") || t.includes("esquive");
      break;
  }

  // Enregistre le pavé envoyé
  pavés.set(ms_org.sender, true);

  const participant = epreuve.participants.find(p => p.jid === ms_org.sender);

  if (hit && !valide) {
    // TOUCHÉ → ce participant devient le nouveau Loup
    epreuve.loupJid = ms_org.sender;

    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
      gifPlayback: true,
      caption: `✅ TOUCHÉ !\n@${participant.tag} devient le nouveau Loup 🐺`,
      mentions: [participant.jid]
    });

    // Stop timer
    if (epreuve.rappelTimer) {
      clearTimeout(epreuve.rappelTimer);
      epreuve.rappelTimer = null;
    }

    epreuve.tirEnCours = null;
    return;
  }

  // Si tous les participants ont répondu, stop timer et fin du tour
  const participantsCibles = epreuve.participants.filter(p => p.jid !== epreuve.loupJid).map(p => p.jid);
  const tousRépondu = participantsCibles.every(jid => pavés.has(jid));

  if (tousRépondu && epreuve.rappelTimer) {
    clearTimeout(epreuve.rappelTimer);
    epreuve.rappelTimer = null;
    epreuve.tirEnCours = null;
  }
});
  
// ──────────────────────────────
// POSITIONS ET ORIENTATION (SILENCIEUX)
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

  const t = texte.toLowerCase();
  if (!t.includes("je cours") || !t.includes("vmax")) return;

  let jid;
  try { jid = await getJid(ms_org.sender, ms_org, ovl); } catch { return; }

  const m = t.match(/point\s*(\d)/);
  if (!m) return;
  const targetPos = parseInt(m[1]);
  const currentPos = epreuve.positions.get(jid) || 1;

  let dir = null;
  if (t.includes("gauche")) dir="gauche";
  if (t.includes("droite")) dir="droite";
  if (!dir || getRoueDirection(currentPos,targetPos,dir)!==targetPos) {
    epreuve.loupJid = jid;
  } else {
    epreuve.positions.set(jid,targetPos);
  }
});

ovlcmd({ nom_cmd:'rotation', isfunc:true }, async(ms_org,ovl,{texte})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve?.loupJid)return;

  const t=texte.toLowerCase();
  let newOri=epreuve.orientationLoup;
  if(t.includes("90")&&t.includes("droite")) newOri=(newOri%4)+1;
  if(t.includes("90")&&t.includes("gauche")) newOri=((newOri+2)%4)+1;
  if(t.includes("180")) newOri=((newOri+1)%4)+1;
  epreuve.orientationLoup=newOri;
});


// ──────────────────────────────
// COMMANDES MANUELLES
// ──────────────────────────────
ovlcmd({ nom_cmd:'setloup', isfunc:true }, async(ms_org,ovl,{texte,getJid})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve) return;
  const m=texte.match(/@(\S+)/);
  if(!m) return;
  let jid;
  try{jid=await getJid(m[1]+"@lid",ms_org,ovl);}catch{return;}
  epreuve.loupJid=jid;
  await ovl.sendMessage(chatId,{caption:`✅ @${jid.split('@')[0]} devient le Loup 🐺`,mentions:[jid]});
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
