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
  for (const [jid, niveau] of epreuve.participants.entries()) {
    const isLoup = epreuve.loup === jid ? " (Loup)" : "";
    txt += `\n${i}- @${jid.split('@')[0]}: ${niveau}${isLoup}`;
    i++;
  }

  txt += `
     
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
                      ⚽BLUE🔷LOCK`;

  return { text: txt, mentions: [...epreuve.participants.keys()] };



// ============================
// LANCEMENT DE L'ÉPREUVE +exercice4
// ============================
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
Dans cette épreuve l'objectif est de toucher un autre joueur avec le ballon⚽ avant la fin du temps imparti 20 mins❗
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

// ============================
// LECTURE LISTE DES PARTICIPANTS
// ============================
ovlcmd({ nom_cmd: 'liste_loup', isfunc: true }, async (ms_org, ovl, { texte, getJid, repondre }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return;

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

    epreuve.participants.push({ jid, tag, niveau, isLoup });
    epreuve.positions.set(jid, Math.floor(Math.random() * 4) + 1);

    if (isLoup) loupJid = jid;
  }

  if (epreuve.participants.length < 2) return repondre("❌ Il faut au moins 2 participants.", ms_org);
  if (!loupJid) return repondre("❌ Aucun joueur avec (Loup) détecté.", ms_org);

  epreuve.loupJid = loupJid;

  // Lancement immédiat
  epreuve.timer = setTimeout(async () => {
    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/9xehjs.png' },
      caption: `🏁 *FIN DE L'ÉPREUVE*\n❌ @${epreuve.participants.find(p => p.jid === epreuve.loupJid).tag} est le dernier Loup, il est éliminé !`,
      mentions: [epreuve.loupJid]
    });
    epreuvesLoup.delete(chatId);
  }, epreuve.tempsRestant);

  // GIF et message de début
  await ovl.sendMessage(chatId, {
    video: { url: 'https://files.catbox.moe/z64kuq.mp4' },
    gifPlayback: true,
    caption: `🐺⚽ **ÉPREUVE DU LOUP LANCÉE !**\n\n` +
             `🐺 Loup initial : @${epreuve.participants.find(p => p.jid === loupJid).tag}\n\n` +
             ,
    mentions: [loupJid]
  });
});

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
    epreuve.loup = jid;
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
  if(!epreuve?.loup)return;

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
  if(!epreuve?.loup||epreuve.tirEnCours)return;

  const t=texte.toLowerCase();
  const m=t.match(/@(\S+).*?(tête|torse|abdomen|jambe gauche|jambe droite)/);
  if(!m)return;

  let cibleJid;
  try{cibleJid=await getJid(m[1]+"@lid",ms_org,ovl);}catch{return;}
  const zone=m[2].replace(" ","_");
  const posCible=epreuve.positions.get(cibleJid)||1;
  const pivot=getPivotLoup(epreuve.orientationLoup,posCible);

  if(pivot!==0) return ovl.sendMessage(chatId,{caption:"❌ Tir refusé : le Loup ne regarde pas la bonne direction."});

  const lvlLoup = epreuve.participants.get(epreuve.loup);
  const lvlCible = epreuve.participants.get(cibleJid);
  let chance = 50;
  const ecart = Math.abs(lvlLoup-lvlCible);
  if(lvlLoup < lvlCible) chance = ecart<=5?40:30;
  else if(lvlLoup===lvlCible) chance = 50;
  else if(lvlLoup>lvlCible) chance = ecart<=5?60:70;

  const hit = Math.random()*100 <= chance;

  epreuve.tirEnCours={cible:cibleJid,zone,timer:setTimeout(async()=>{
    if(hit){
      await ovl.sendMessage(chatId,{video:{url:'https://files.catbox.moe/eckrvo.mp4'},gifPlayback:true,caption:`✅ **TOUCHÉ !**\n@${cibleJid.split('@')[0]} devient le nouveau Loup 🐺.`,mentions:[cibleJid]});
      epreuve.loup=cibleJid;
    } else {
      const gifsRate = ['https://files.catbox.moe/obqo0d.mp4','https://files.catbox.moe/m00580.mp4'];
      await ovl.sendMessage(chatId,{video:{url:gifsRate[Math.floor(Math.random()*gifsRate.length)]},gifPlayback:true,caption:`❌ **RATÉ !**\nLe tir n'a pas touché sa cible. Le Loup reste @${epreuve.loup.split('@')[0]}.`,mentions:[epreuve.loup]});
    }
    epreuve.tirEnCours=null;
  },3*60*1000)};

  await ovl.sendMessage(chatId,{caption:`🎯 @${cibleJid.split('@')[0]}, esquive dans 3 minutes.\nZone : ${zone.replace("_"," ")}`,mentions:[cibleJid]});
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

  // doit mentionner qu'il voit le ballon
  if(!/(fixe|regarde|rivés)/i.test(t)) valide=false;

  if(zone==="tête") valide=t.includes("baisse");
  if(zone==="torse"||zone==="abdomen") valide=t.includes("bond")||t.includes("décalage");
  if(zone==="jambe_gauche") valide=t.includes("plie la jambe gauche")||t.includes("jambes pliées");
  if(zone==="jambe_droite") valide=t.includes("plie la jambe droite")||t.includes("jambes pliées");

  if(!valide){
    await ovl.sendMessage(chatId,{caption:`❌ **TOUCHÉ !**`,mentions:[cible]});
    epreuve.loup=cible;
    epreuve.tirEnCours=null;
    return;
  }

  await ovl.sendMessage(chatId,{video:{url:'https://files.catbox.moe/obqo0d.mp4'},gifPlayback:true,caption:`🟢 **ESQUIVE RÉUSSIE !**`,mentions:[cible]});
  epreuve.tirEnCours=null;
});

// ──────────────────────────────
// COMMANDES MANUELLES : SETLOUP, PAUSE, RESUME, STOP
// ──────────────────────────────
ovlcmd({ nom_cmd:'setloup', isfunc:true }, async(ms_org,ovl,{texte,getJid})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve) return;
  const m=texte.match(/@(\S+)/);
  if(!m) return;
  let jid;
  try{jid=await getJid(m[1]+"@lid",ms_org,ovl);}catch{return;}
  epreuve.loup=jid;
  await ovl.sendMessage(chatId,{caption:`✅ @${jid.split('@')[0]} devient le Loup 🐺`,mentions:[jid]});
});

ovlcmd({ nom_cmd:'pauseloup', desc:"Pause", react:'⏸️' }, async(ms_org,ovl,{commande})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve) return;
  clearTimeout(epreuve.timer);
  await ovl.sendMessage(chatId,{text:"⏸️ *ÉPREUVE PAUSÉE*"});
});

ovlcmd({ nom_cmd:'resumeloup', desc:"Resume", react:'▶️' }, async(ms_org,ovl,{commande})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve) return;
  startTour(chatId, ovl);
  await ovl.sendMessage(chatId,{text:"▶️ *ÉPREUVE REPRISE*"});
});

ovlcmd({ nom_cmd:'stoploup', desc:"Stop", react:'🛑' }, async(ms_org,ovl,{commande})=>{
  const chatId=ms_org.key?.remoteJid||ms_org;
  const epreuve=epreuvesLoup.get(chatId);
  if(!epreuve) return;
  clearTimeout(epreuve.timer);
  epreuvesLoup.delete(chatId);
  await ovl.sendMessage(chatId,{caption:`🛑 *ÉPREUVE DU LOUP ARRÊTÉE*`,mentions:epreuve.loup?[epreuve.loup]:[]});
});
