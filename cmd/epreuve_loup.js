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
}, async (ms_org, ovl, { repondre, auteur_Message, getJid }) => {
  try {
    const chatId = ms_org.key?.remoteJid || ms_org;

    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/z64kuq.mp4' },
      gifPlayback: true
    });

    const texteDebut = `🔷 *ÉPREUVE DU LOUP*🐺❌⚽
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░

*⚽RÈGLES:*
Objectif : toucher un autre joueur avec le ballon⚽ avant la fin du temps imparti 15 mins❗
Le modérateur doit envoyer ensuite la liste des participants avec leurs niveaux et ajouter (Loup) au joueur qui commence.

⚽ Voulez-vous lancer l’épreuve ?
✅ \`Oui\`  
❌ \`Non\`

*⚽BLUE🔷LOCK*`;

    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/k87s8y.png' },
      caption: texteDebut
    });

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
        tour: 0,
        actif: true,
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
// LECTURE DE LA LISTE DES PARTICIPANTS
// ──────────────────────────────
ovlcmd({ nom_cmd: 'liste_loup', isfunc: true }, async (ms_org, ovl, { texte, getJid, repondre }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return;

  const cleanTexte = texte.replace(/[\u2066-\u2069]/g, ''); // supprime caractères invisibles
  const lignes = cleanTexte.split('\n');

  let loupJid = null;
  epreuve.participants = [];      // réinitialise pour éviter doublons
  epreuve.positions = new Map();

  for (let ligne of lignes) {
    ligne = ligne.replace(/[\u2066-\u2069]/g, '').trim(); // nettoyage ligne par ligne
    if (!ligne) continue;

    // Exemple accepté :
    // 1-@Damian : 15 (Loup)
    const m = ligne.match(/@(\S+).*?:\s*(\d+)/i);
    if (!m) continue;

    const tag = m[1].replace(/[\u2066-\u2069]/g, '').trim(); // pseudo propre
    const niveau = parseInt(m[2], 10);

    const isLoup = /\(loup\)/i.test(ligne);

    let jid;
    try {
      jid = await getJid(tag + "@lid", ms_org, ovl);
    } catch {
      continue; // ignore si impossible de résoudre le jid
    }

    epreuve.participants.push({ jid, tag, niveau, isLoup });
    epreuve.positions.set(jid, Math.floor(Math.random() * 4) + 1);

    if (isLoup) loupJid = jid;
  }

  if (epreuve.participants.length < 2) return repondre("❌ Il faut au moins 2 participants.", ms_org);
  if (!loupJid) return repondre("❌ Aucun joueur avec (Loup) détecté.", ms_org);

  epreuve.loupJid = loupJid;

  // Lancement automatique de l'épreuve
  lancerEpreuve(chatId, ovl, epreuve);
});

// ──────────────────────────────
// FONCTION DE LANCEMENT D’ÉPREUVE
// ──────────────────────────────
async function lancerEpreuve(chatId, ovl, epreuve) {
  const loup = epreuve.participants.find(p => p.jid === epreuve.loupJid);

  // Message de début avec GIF
  await ovl.sendMessage(chatId, {
    video: { url: 'https://files.catbox.moe/z64kuq.mp4' },
    gifPlayback: true,
    caption: `⚽ Début de l'exercice ! Le joueur @${loup.tag} est le Loup ! ⚠️\nVeuillez toucher un joueur avant la fin du temps ⌛.`,
    mentions: [loup.jid]
  });

  // Timer global 15 minutes
  epreuve.timer = setTimeout(async () => {
    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/9xehjs.png' },
      caption: `🏁 *FIN DE L'ÉPREUVE*\n❌ @${loup.tag} est le dernier Loup, il est éliminé !`,
      mentions: [loup.jid]
    });
    epreuvesLoup.delete(chatId);
  }, epreuve.tempsRestant);

  // Start premier tour
  startTour(chatId, ovl);
}

// ──────────────────────────────
// FONCTION POUR DÉMARRER UN TOUR
// ──────────────────────────────
function startTour(chatId, ovl) {
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.actif) return;

  epreuve.tour++;
  const loup = epreuve.participants.find(p => p.jid === epreuve.loupJid);

  ovl.sendMessage(chatId, {
    text: `💬:
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
⚽ 
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
                 *⚽BLUE🔷LOCK🥅*`,
    mentions: [loup.jid]
  });

  // Timer 3 minutes pour le tour
  if (epreuve.rappelTimer) clearTimeout(epreuve.rappelTimer);
  epreuve.rappelTimer = setTimeout(() => {
    startTour(chatId, ovl); // Tour suivant automatiquement
  }, 3 * 60 * 1000);
}

// ──────────────────────────────
// POSITIONS ET ORIENTATION
// ──────────────────────────────
function getRoueDirection(current, target, side) {
  const roue = {1:{gauche:4,droite:3},2:{gauche:3,droite:4},3:{gauche:1,droite:2},4:{gauche:2,droite:1}};
  return roue[current][side];
}

function getPivotLoup(currentPos, targetPos) {
  const map = {1:{1:0,2:180,3:90,4:-90},2:{1:180,2:0,3:-90,4:90},3:{1:-90,2:90,3:0,4:180},4:{1:90,2:-90,3:180,4:0}};
  return map[currentPos][targetPos];
}

// ──────────────────────────────
// COURSE D’UNE CIBLE
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'course',
  isfunc: true
}, async (ms_org, ovl, { texte, getJid }) => {
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
    return ovl.sendMessage(chatId,{caption:`❌ **MOUVEMENT INTERDIT**\n@${jid.split('@')[0]} devient le Loup 🐺`,mentions:[jid]});
  }

  epreuve.positions.set(jid,targetPos);
  await ovl.sendMessage(chatId,{caption:`🏃 @${jid.split('@')[0]} se déplace vers la position ${targetPos}`,mentions:[jid]});
});

// ──────────────────────────────
// ROTATION DU LOUP
// ──────────────────────────────
ovlcmd({
  nom_cmd:'rotation',
  isfunc:true
}, async(ms_org,ovl,{texte})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve?.loupJid)return;

  const t=texte.toLowerCase();
  let newOri=epreuve.orientationLoup;

  if(t.includes("90")&&t.includes("droite")) newOri=(newOri%4)+1;
  if(t.includes("90")&&t.includes("gauche")) newOri=((newOri+2)%4)+1;
  if(t.includes("180")) newOri=((newOri+1)%4)+1;

  epreuve.orientationLoup=newOri;
  await ovl.sendMessage(chatId,{caption:`🧭 Le Loup regarde maintenant la position ${newOri}`});
});

// ──────────────────────────────
// TIR DU LOUP
// ──────────────────────────────
ovlcmd({
  nom_cmd:'tir',
  isfunc:true
}, async(ms_org,ovl,{texte,getJid})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve?.loupJid||epreuve.tirEnCours)return;

  const t=texte.toLowerCase();
  const m=t.match(/@(\S+).*?(tête|torse|abdomen|jambe gauche|jambe droite)/);
  if(!m)return;

  let cibleJid;
  try{cibleJid=await getJid(m[1]+"@lid",ms_org,ovl);}catch{return;}
  const zone=m[2].replace(" ","_");
  const posCible=epreuve.positions.get(cibleJid)||1;
  const pivot=getPivotLoup(epreuve.orientationLoup,posCible);

  if(pivot!==0) return ovl.sendMessage(chatId,{caption:"❌ Tir refusé : le Loup ne regarde pas la bonne direction."});

  // Calcul chance selon niveaux
  const lvlLoup = epreuve.participants.find(p=>p.jid===epreuve.loupJid)?.niveau || 0;
  const lvlCible = epreuve.participants.find(p=>p.jid===cibleJid)?.niveau || 0;
  let chance = 50;
  const ecart = Math.abs(lvlLoup - lvlCible);

  if(lvlLoup < lvlCible) chance = ecart <= 5 ? 40 : 30;
  else if(lvlLoup === lvlCible) chance = 50;
  else if(lvlLoup > lvlCible) chance = ecart <= 5 ? 60 : 70;

  const hit = Math.random()*100 <= chance;

  epreuve.tirEnCours={cible:cibleJid,zone,timer:setTimeout(async()=>{
    if(hit){
      await ovl.sendMessage(chatId,{
        video:{url:'https://files.catbox.moe/eckrvo.mp4'}, 
        gifPlayback:true,
        caption:`✅ **TOUCHÉ !**\n@${cibleJid.split('@')[0]} devient le nouveau Loup 🐺.`,
        mentions:[cibleJid]
      });
      epreuve.loupJid=cibleJid;
    } else {
      const gifsRate = ['https://files.catbox.moe/obqo0d.mp4','https://files.catbox.moe/m00580.mp4'];
      await ovl.sendMessage(chatId,{
        video:{url:gifsRate[Math.floor(Math.random()*gifsRate.length)]},
        gifPlayback:true,
        caption:`❌ **RATÉ !**\nLe tir n'a pas touché sa cible. Le Loup reste @${epreuve.participants.find(p=>p.jid===epreuve.loupJid).tag}.`,
        mentions:[epreuve.loupJid]
      });
    }
    epreuve.tirEnCours=null;
  },3*60*1000)};

  await ovl.sendMessage(chatId,{
    caption:`🎯 @${cibleJid.split('@')[0]}, esquive dans 3 minutes.\nZone : ${zone.replace("_"," ")}`,
    mentions:[cibleJid]
  });
});
// ──────────────────────────────
// ESQUIVE RP
// ──────────────────────────────
ovlcmd({
  nom_cmd:'esquive',
  isfunc:true
}, async(ms_org,ovl,{texte})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve?.tirEnCours) return;
  const {cible,zone,timer}=epreuve.tirEnCours;
  if(ms_org.sender!==cible) return;

  clearTimeout(timer);
  const t=texte.toLowerCase();
  let valide=false;
  if(!t.includes("vmax")) valide=false;
  if(!/(fixe|regarde|rivés)/i.test(t)) valide=false;
  if(zone==="tête") valide=t.includes("baisse");
  if(zone==="torse"||zone==="abdomen") valide=t.includes("bond")||t.includes("décalage");
  if(zone==="jambe_gauche") valide=t.includes("plie la jambe gauche")||t.includes("jambes pliées");
  if(zone==="jambe_droite") valide=t.includes("plie la jambe droite")||t.includes("jambes pliées");

  if(!valide){
    await ovl.sendMessage(chatId,{caption:`❌ **TOUCHÉ !**`,mentions:[cible]});
    epreuve.loupJid=cible;
    epreuve.tirEnCours=null;
    return;
  }

  await ovl.sendMessage(chatId,{video:{url:'https://files.catbox.moe/obqo0d.mp4'},gifPlayback:true,caption:`🟢 **ESQUIVE RÉUSSIE !**`,mentions:[cible]});
  epreuve.tirEnCours=null;
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
