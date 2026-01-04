const { ovlcmd } = require('../lib/ovlcmd');
const joueurs = new Map();
const recordsGlobal = new Map();

const { MyNeoFunctions, TeamFunctions, BlueLockFunctions } = require("../DataBase/myneo_lineup_team");
const { cardsBlueLock } = require("../DataBase/cardsBL");

const { saveUser: saveMyNeo, deleteUser: delMyNeo, getUserData: getNeo, updateUser: updateMyNeo } = MyNeoFunctions;
const { saveUser: saveTeam, deleteUser: delTeam, getUserData: getTeam, updateUser: updateTeam } = TeamFunctions;
const { saveUser: saveLineup, deleteUser: delLineup, getUserData: getLineup, updatePlayers, updateStats } = BlueLockFunctions;

// ---------------- ZONES & PIEDS ----------------
const ZONES = [
  "ras du sol gauche","ras du sol droite",
  "mi-hauteur gauche","mi-hauteur droite",
  "lucarne gauche","lucarne droite"
];

const MODELES_TIRS = [
  { type:"tir direct", zones:ZONES },
  { type:"tir enroulé", zones:["lucarne gauche","lucarne droite","mi-hauteur gauche","mi-hauteur droite"] },
  { type:"tir trivela", zones:["lucarne gauche","lucarne droite","mi-hauteur gauche","mi-hauteur droite"] }
];

// ---------------- NORMALISATION ----------------
function normalize(t){
  return t.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^\w\s]/g,"")
    .replace(/\s+/g," ")
    .trim();
}

// ---------------- UTIL : NOM JOUEUR ----------------
async function getPlayerName(userId){
  try{
    const fiche = await getTeam(userId);
    if(fiche && fiche.player) return fiche.player;
  }catch(e){}
  return userId.split('@')[0];
}

// ---------------- TIR IMPOSÉ ----------------
function tirerTypeImpose(){
  const r = Math.random();
  if(r < 0.4) return "tir direct";
  if(r < 0.7) return "tir trivela";
  return "tir enroulé";
}

// ---------------- DÉTECTION DU TIR (RP SOLIDE) ----------------
function detectTir(text){
  const t = normalize(text);

  let type = null;
  if(t.includes("tir enroule")) type = "tir enroulé";
  else if(t.includes("tir trivela")) type = "tir trivela";
  else if(t.includes("tir direct")) type = "tir direct";

  if(!type) return { type:"MISSED" };

  let zone = null;
  for(const z of ZONES){
    if(t.includes(normalize(z))){
      zone = z;
      break;
    }
  }

  if(!zone) return { type:"MISSED" };

  return { type, zone };
}

// ---------------- CHANCE ----------------
function chance(type){
  if(type==="tir direct") return 0.9;
  if(type==="tir enroulé") return 0.85;
  if(type==="tir trivela") return 0.8;
  return 0;
}

// ---------------- TIR OBLIGATOIRE ----------------
function envoyerTirObligatoire(ms_org, ovl, type, id){
  const joueur = joueurs.get(id);
  if(!joueur) return;

  joueur.timer = setTimeout(async()=>{
    joueur.en_cours = false;
    await ovl.sendMessage(ms_org,{
      video:{url:"https://files.catbox.moe/9k5b3v.mp4"},
      gifPlayback:true,
      caption:"❌MISSED : Tir manqué! Fin de l'exercice"
    });
    envoyerResultats(ms_org, ovl, joueur);
  }, 3 * 60 * 1000);

  ovl.sendMessage(ms_org,{
    video:{url:"https://files.catbox.moe/zqm7et.mp4"},
    gifPlayback:true,
    caption:`🎯 TIR OBLIGATOIRE : *${type.toUpperCase()}*`
  });
}

// ---------------- COMMANDE EXERCICE ----------------
ovlcmd({
  nom_cmd:'exercice1',
  classe:'BLUELOCK⚽',
  react:'⚽'
}, async (ms_org, ovl, { auteur_Message, repondre })=>{
  try{

const texteDebut = `*🔷ÉPREUVE DE TIRS⚽🥅*
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
                   🔷⚽RÈGLES:
Dans cet exercice l'objectif est de marquer 18 buts en 18 tirs max dans le temps imparti ❗vous êtes face à un gardien Robot qui mémorise vos tirs et peut bloquer. ⚠Vous devez marquer au moins 6 buts sinon vous êtes éliminé ❌. 
⚠SI VOUS RATEZ UN TIR, FIN DE L'EXERCICE ❌.

          ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ 
                       🔷RANKING🏆 
           ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                        
🥉Novice: 5 buts⚽ (25 pts) 
🥈Pro: 10 buts⚽ (50 pts) 
🥇Classe mondiale: 15 buts⚽🏆(100 pts) 
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░ ░                         
Souhaitez-vous lancer l'exercice ? :
✅ Oui
❌ Non
🏆 Records
╰───────────────────
                      *⚽BLUE🔷LOCK*`;

    await ovl.sendMessage(ms_org,{
      image:{url:"https://files.catbox.moe/09rll9.jpg"},
      caption:texteDebut
    });

    const rep = await ovl.recup_msg({ auteur:auteur_Message, ms_org, temps:60000 });
    const res = rep?.message?.conversation?.toLowerCase()?.trim();

    if(!res){
      return ovl.sendMessage(ms_org,{ text:"⏱️ Temps écoulé. Session fermée ❌" });
    }

    if(res === "non"){
      return ovl.sendMessage(ms_org,{ text:"❌ Lancement de l'exercice annulé." });
    }

    if(res === "records"){
      await afficherRecords(ms_org, ovl);
      return;
    }

    if(res !== "oui"){
      return ovl.sendMessage(ms_org,{ text:"❌ Réponse invalide. Session fermée." });
    }

    joueurs.set(auteur_Message,{
      id:auteur_Message,
      but:0,
      tirs_total:0,
      stats:{ direct:0, enroule:0, trivela:0 },
      tirImpose:tirerTypeImpose(),
      en_cours:true,
      timer:null
    });

    envoyerTirObligatoire(ms_org, ovl, joueurs.get(auteur_Message).tirImpose, auteur_Message);

  }catch(e){
    console.error(e);
    repondre("❌Erreur survenue lors de l'exercice");
  }
});

// ---------------- ÉPREUVE DU TIR ----------------
ovlcmd({ nom_cmd:'epreuve_du_tir', isfunc:true }, async (ms_org, ovl, { auteur_Message, texte })=>{
  const j = joueurs.get(auteur_Message);
  if(!j || !j.en_cours) return;
  if(!texte || texte.trim().length < 5) return;

  const tir = detectTir(texte);
  if(tir.type === "MISSED") return;

  clearTimeout(j.timer);

  if(tir.type !== j.tirImpose || Math.random() > chance(tir.type)){
    j.en_cours = false;
    await ovl.sendMessage(ms_org,{
      video:{url:"https://files.catbox.moe/9k5b3v.mp4"},
      gifPlayback:true,
      caption:"❌MISSED : Tir manqué! Fin de l'exercice"
    });
    return envoyerResultats(ms_org, ovl, j);
  }

  j.but++;
  j.tirs_total++;

  if(tir.type==="tir direct") j.stats.direct++;
  if(tir.type==="tir enroulé") j.stats.enroule++;
  if(tir.type==="tir trivela") j.stats.trivela++;

  await ovl.sendMessage(ms_org,{
    video:{url:"https://files.catbox.moe/pad98d.mp4"},
    gifPlayback:true,
    caption:`✅GOAL⚽! But marqué! Il vous reste ${18 - j.but} tirs.`
  });

  if(j.but >= 18){
    j.en_cours = false;
    return envoyerResultats(ms_org, ovl, j);
  }

  j.tirImpose = tirerTypeImpose();
  envoyerTirObligatoire(ms_org, ovl, j.tirImpose, auteur_Message);
});

// ---------------- RESULTATS ----------------
async function envoyerResultats(ms_org, ovl, j){
  const tag = `@${j.id.split('@')[0]}`;

  let rank = "❌";
  if(j.but >= 15) rank = "SS🥇";
  else if(j.but >= 10) rank = "S🥈";
  else if(j.but >= 5) rank = "A🥉";

  let titre = "";
  if(j.stats.trivela >= 5) titre = "👑 TRIVELA KING";
  else if(j.stats.enroule >= 5) titre = "🎯 ENROULÉ MASTER";
  else if(j.stats.direct >= 5) titre = "💥 DIRECT STRIKER";

  const rec = recordsGlobal.get(j.id);
  if(!rec || j.but > rec.buts){
    recordsGlobal.set(j.id,{ buts:j.but, rank });
  }

  await ovl.sendMessage(ms_org,{
    image:{url:"https://files.catbox.moe/1xnoc6.jpg"},
    caption:`🔷RESULTATS DE L'ÉVALUATION📊
*👤Joueur:* ${tag}
*⚽Buts:* ${j.but}
*📊Rank:* ${rank}
${titre}
╰───────────────────
                      *🔷BLUELOCK⚽*`,
    mentions:[j.id]
  });

  joueurs.delete(j.id);
}

// ---------------- RECORDS ----------------
async function afficherRecords(ms_org, ovl){
  if(recordsGlobal.size === 0){
    return ovl.sendMessage(ms_org,{ text:"🏆 Aucun record enregistré pour le moment." });
  }

  let msg = "🏆 *RECORDS BLUE LOCK⚽*\n\n";

  const sorted = [...recordsGlobal.entries()]
    .sort((a,b)=>b[1].buts - a[1].buts)
    .slice(0,10);

  for(let i=0;i<sorted.length;i++){
    const [id,r] = sorted[i];
    const name = await getPlayerName(id);
    msg += `${i+1}- ${name} (${r.buts} buts)\n`;
  }

  await ovl.sendMessage(ms_org,{ text: msg });
}

// ---------------- STOP ----------------
ovlcmd({ nom_cmd:'stop', isfunc:true }, (ms_org, ovl, { auteur_Message, texte })=>{
  if(!texte || texte.toLowerCase().trim() !== "stop") return;
  const j = joueurs.get(auteur_Message);
  if(j){
    clearTimeout(j.timer);
    joueurs.delete(auteur_Message);
    ovl.sendMessage(ms_org,{ text:"✅Exercice arrêté." });
  }
});
