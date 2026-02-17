const { ovlcmd } = require('../lib/ovlcmd');
const joueurs = new Map();
const { MyNeoFunctions, TeamFunctions, BlueLockFunctions } = require("../DataBase/myneo_lineup_team");
const { cardsBlueLock } = require("../DataBase/cardsBL");
const { saveUser: saveMyNeo, deleteUser: delMyNeo, getUserData: getNeo, updateUser: updateMyNeo } = MyNeoFunctions;
const { saveUser: saveTeam, deleteUser: delTeam, getUserData: getTeam, updateUser: updateTeam } = TeamFunctions;
const { saveUser: saveLineup, deleteUser: delLineup, getUserData: getLineup, updatePlayers, updateStats } = BlueLockFunctions;

// ---------------- ZONES & PIEDS ----------------
const ZONES = ["ras du sol gauche","ras du sol droite","mi-hauteur gauche","mi-hauteur droite","lucarne gauche","lucarne droite"];

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
    .trim();
}

// ---------------- TIR IMPOSÉ (PROBAS) ----------------
function tirerTypeImpose(){
  const r = Math.random();
  if(r < 0.5) return "tir direct";
  if(r < 0.5) return "tir trivela";
  return "tir enroulé";
}

// ---------------- DÉTECTION DU TIR ----------------
function detectTir(text){
  const t = normalize(text);
  for(const m of MODELES_TIRS){
    if(!t.includes(m.type)) continue;
    const zone = m.zones.find(z => t.includes(normalize(z)));
    if(zone) return { type:m.type, zone };
  }
  return { type:"MISSED" };
}

// ---------------- CHANCE ----------------
function chance(type){
  if(type==="tir direct") return 0.7;
  if(type==="tir enroulé") return 0.65;
  if(type==="tir trivela") return 0.65;
  return 0;
}

// ---------------- ANNONCE TIR OBLIGATOIRE ----------------
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
    const res = rep?.message?.conversation?.toLowerCase();
    if(!res) return;
    if(res === "non") return repondre("❌ Lancement de l'exercice annulé...");
    if(res === "records") return afficherRecords(ms_org, ovl);

    const tirImpose = tirerTypeImpose();

    joueurs.set(auteur_Message,{
      id:auteur_Message,
      but:0,
      tirs_total:0,
      stats:{ direct:0, enroule:0, trivela:0 },
      tirImpose,
      en_cours:true,
      timer:null
    });

    envoyerTirObligatoire(ms_org, ovl, tirImpose, auteur_Message);

  }catch(e){
    console.error(e);
    repondre("❌Erreur survenue lors de l'exercice");
  }
});

// ---------------- ÉPREUVE DU TIR ----------------
ovlcmd({ nom_cmd:'epreuve_du_tir', isfunc:true }, async (ms_org, ovl, { auteur_Message, texte })=>{
  const j = joueurs.get(auteur_Message);
  if(!j || !j.en_cours) return;

  clearTimeout(j.timer);

  const tir = detectTir(texte);

  // ❌ Mauvais type
  if(tir.type !== j.tirImpose){
    j.en_cours = false;
    await ovl.sendMessage(ms_org,{
      video:{url:"https://files.catbox.moe/9k5b3v.mp4"},
      gifPlayback:true,
      caption:"❌MISSED : Tir manqué! Fin de l'exercice"
    });
    return envoyerResultats(ms_org, ovl, j);
  }

  // 🎯 Chance
  if(Math.random() > chance(tir.type)){
    j.en_cours = false;
    await ovl.sendMessage(ms_org,{
      video:{url:"https://files.catbox.moe/9k5b3v.mp4"},
      gifPlayback:true,
      caption:"❌MISSED : Tir manqué! Fin de l'exercice"
    });
    return envoyerResultats(ms_org, ovl, j);
  }

  // ✅ GOAL
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

  // 🎯 PROCHAIN TIR
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
  if(recordsGlobal.size === 0)
    return ovl.sendMessage(ms_org,{ text:"🏆 Aucun record enregistré pour le moment." });

  let msg = "🏆 *RECORDS BLUE LOCK⚽*\n";
  [...recordsGlobal.entries()]
    .sort((a,b)=>b[1].buts - a[1].buts)
    .slice(0,10)
    .forEach(([id,r],i)=>{
      msg += `#${i+1} @${id.split('@')[0]} – ${r.buts} buts (${r.rank})\n`;
    });

  ovl.sendMessage(ms_org,{ text:msg });
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
