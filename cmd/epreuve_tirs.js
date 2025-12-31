const { ovlcmd } = require('../lib/ovlcmd');
const joueurs = new Map();
const { MyNeoFunctions, TeamFunctions, BlueLockFunctions } = require("../DataBase/myneo_lineup_team");
const { cardsBlueLock } = require("../DataBase/cardsBL");
const { saveUser: saveMyNeo, deleteUser: delMyNeo, getUserData: getNeo, updateUser: updateMyNeo } = MyNeoFunctions;
const { saveUser: saveTeam, deleteUser: delTeam, getUserData: getTeam, updateUser: updateTeam } = TeamFunctions;
const { saveUser: saveLineup, deleteUser: delLineup, getUserData: getLineup, updatePlayers, updateStats } = BlueLockFunctions;

// ---------------- ZONES ET PIEDS ----------------
const ZONES = ["ras du sol gauche","ras du sol droite","mi-hauteur gauche","mi-hauteur droite","lucarne gauche","lucarne droite"];
const PIEDS = ["interieur du pied droit","interieur du pied gauche","pointe du pied droit","pointe du pied gauche","cou de pied droit","cou de pied gauche","exterieur du pied droit","exterieur du pied gauche","extérieur du pied droit","extérieur du pied gauche"];

// ---------------- MODÈLES DE TIRS ----------------
const MODELES_TIRS = [
  { texte: "Tir direct", tir_type: "tir direct", tir_pied: ["pointe du pied droit","pointe du pied gauche","interieur du pied droit","interieur du pied gauche","cou de pied droit","cou de pied gauche"], decalage_corps:null, corps:null, courbe:null, tir_zone: ZONES },
  { texte: "Tir enroulé pied droit", tir_type: "tir enroulé", tir_pied:["interieur du pied droit"], decalage_corps:[40,50,60], corps:["droite"], courbe:["50cm","0.5m","1m"], tir_zone:["lucarne gauche","lucarne droite","mi-hauteur gauche","mi-hauteur droite"] },
  { texte: "Tir enroulé pied gauche", tir_type: "tir enroulé", tir_pied:["interieur du pied gauche"], decalage_corps:[40,50,60], corps:["gauche"], courbe:["50cm","0.5m","1m"], tir_zone:["lucarne gauche","lucarne droite","mi-hauteur gauche","mi-hauteur droite"] },
  { texte: "Tir trivela pied droit", tir_type: "tir trivela", tir_pied:["exterieur du pied droit"], decalage_corps:[40,50,60], corps:["droite"], courbe:["50cm","0.5m","1m"], tir_zone:["lucarne gauche","lucarne droite","mi-hauteur gauche","mi-hauteur droite"] },
  { texte: "Tir trivela pied gauche", tir_type: "tir trivela", tir_pied:["exterieur du pied gauche"], decalage_corps:[40,50,60], corps:["gauche"], courbe:["50cm","0.5m","1m"], tir_zone:["lucarne gauche","lucarne droite","mi-hauteur gauche","mi-hauteur droite"] }
];

// ---------------- NORMALISATION ----------------
function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w\s°]/g,"").trim();
}

// ---------------- SYNONYMES ----------------
const SYNONYMES = {
  "interieur du pied droit":["interieur du pied droit","linterieur du pied droit"],
  "interieur du pied gauche":["interieur du pied gauche","linterieur du pied gauche"],
  "pointe du pied droit":["pointe du pied droit"],
  "pointe du pied gauche":["pointe du pied gauche"],
  "exterieur du pied droit":["exterieur du pied droit","extérieur du pied droit"],
  "exterieur du pied gauche":["exterieur du pied gauche","extérieur du pied gauche"],
  "tir direct":["tir direct"],
  "tir enroulé":["tir enroulé","tir enroule"],
  "tir trivela":["tir trivela"],
  "lucarne droite":["lucarne droite"],
  "lucarne gauche":["lucarne gauche"],
  "droite":["droite"],
  "gauche":["gauche"]
};

// ---------------- DÉTECTION TIR ----------------
function detectTirParElements(text){
  const t = normalize(text);
  for(const model of MODELES_TIRS){
    if(!SYNONYMES[model.tir_type]?.some(s=>t.includes(normalize(s)))) continue;

    let pied = null;
    for(const p of model.tir_pied||[]){
      const syns = SYNONYMES[p] || [p];
      if(syns.some(s=>t.includes(normalize(s)))){pied=p;break;}
    }
    if(!pied && model.tir_type==="tir direct") continue;

    let zone = null;
    for(const z of model.tir_zone||[]){
      const syns = SYNONYMES[z] || [z];
      if(syns.some(s=>t.includes(normalize(s)))){zone=z;break;}
    }
    if(!zone && model.tir_type==="tir direct") continue;

    let angle = null;
    if(model.decalage_corps){
      const m = t.match(/(\d+)\s?°/);
      if(m) angle=parseInt(m[1]);
    }

    let corps = model.corps ? model.corps[0] : null;
    let courbe = model.courbe ? model.courbe.find(c=>t.includes(c.replace("m",""))) : null;

    return { tir_type:model.tir_type, tir_pied:pied, tir_zone:zone, decalage_corps:angle, corps, courbe };
  }
  return { tir_type:"MISSED", tir_pied:"AUCUN", tir_zone:"AUCUNE", decalage_corps:null, corps:null, courbe:null };
}

// ---------------- PROBABILITÉ DE GOAL ----------------
function calcChanceGoal(tir){
  if(!tir.tir_type || tir.tir_type==="MISSED") return 0;
  if(tir.tir_type==="tir direct") return 0.9;
  let chance=0.7;
  if(tir.courbe) chance=0.85;
  if(tir.decalage_corps===60) chance=Math.max(chance,0.85);
  else if(tir.decalage_corps===50) chance=Math.max(chance,0.75);
  else if(tir.decalage_corps===40) chance=Math.max(chance,0.5);
  return chance;
}

// ---------------- COMMANDE EXERCICE ----------------
ovlcmd({
  nom_cmd:'exercice1',
  classe:'BLUELOCK⚽',
  react:'⚽',
  desc:"Lance l'épreuve du tir"
}, async (ms_org, ovl, {repondre, auteur_Message})=>{
  try{
    const texteDebut = `*🔷ÉPREUVE DE TIRS⚽🥅*
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
                   🔷⚽RÈGLES:
Dans cet exercice l'objectif est de marquer 18 buts en 18 tirs max dans le temps imparti ❗20 mins⌛ face à un gardien Robot qui mémorise vos tirs pour bloquer le même tir de suite. ⚠Vous devez marquer au moins 6 buts sinon vous êtes éliminé ❌. 
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
    await ovl.sendMessage(ms_org, { image:{url:'https://files.catbox.moe/09rll9.jpg'}, caption:texteDebut });
    const rep = await ovl.recup_msg({ auteur:auteur_Message, ms_org, temps:60000 });
    const response = rep?.message?.extendedTextMessage?.text || rep?.message?.conversation;
    if(!response) return repondre("⏳Pas de réponse, épreuve annulée.");
    if(response.toLowerCase()==="non") return repondre("❌ Lancement de l'exercice annulé...");
    if(response.toLowerCase()==="records"){
      // TODO afficher records
      return repondre("📊 Voici les records : ...");
    }

    const id = auteur_Message;
    const timer = setTimeout(()=>{
      if(joueurs.has(id)){ joueurs.get(id).en_cours=false; envoyerResultats(ms_org, ovl, joueurs.get(id)); }
    }, 20*60*1000);

    joueurs.set(id, { id, tir_info:[], but:0, tirs_total:0, en_cours:true, timer, paused:false, remainingTime:20*60*1000, pauseTimestamp:null, prochainDefi:2, tirDefiEnCours:false, typeDefi:null });

    await ovl.sendMessage(ms_org, { video:{url:"https://files.catbox.moe/zqm7et.mp4"}, gifPlayback:true, caption:`*⚽BLUE LOCK🔷:* Début de l'exercice ⌛ Durée : 20:00 mins` });

  }catch(e){ repondre("❌Erreur survenue lors de l'exercice"); console.error(e); }
});

// ---------------- ÉPREUVE DU TIR ----------------
ovlcmd({ nom_cmd:'epreuve_du_tir', isfunc:true }, async (ms_org, ovl, {repondre, auteur_Message, texte})=>{
  const joueur = joueurs.get(auteur_Message);
  if(!joueur||!joueur.en_cours) return;

  const t = normalize(texte);

// ⛔ Ignore tout ce qui n'est pas une tentative de tir
const motsTir = ["tir", "lucarne", "pied", "trivela", "enroul", "direct"];
if (!motsTir.some(m => t.includes(m))) return;
  
  try{
    const analyse = detectTirParElements(texte);
    if(!analyse||analyse.tir_type==="MISSED"){
      clearTimeout(joueur.timer);
      joueur.en_cours=false;
      await ovl.sendMessage(ms_org, { video:{url:"https://files.catbox.moe/9k5b3v.mp4"}, gifPlayback:true, caption:"❌MISSED : Tir manqué! Fin de l'exercice" });
      return envoyerResultats(ms_org, ovl, joueur);
    }

    // Répétition zone pour tirs directs
    const lastZones = joueur.tir_info.slice(-2).map(t=>t.tir_zone);
    if(analyse.tir_type==="tir direct" && lastZones[0]&&lastZones[0]===lastZones[1] && lastZones[0]===analyse.tir_zone){
      clearTimeout(joueur.timer);
      joueur.en_cours=false;
      await ovl.sendMessage(ms_org, { video:{url:"https://files.catbox.moe/9k5b3v.mp4"}, gifPlayback:true, caption:"❌MISSED : Zone répétée trop tôt!" });
      return envoyerResultats(ms_org, ovl, joueur);
    }

    const chance = calcChanceGoal(analyse);
    const goalReussi = Math.random()<=chance;

    if(goalReussi){
      joueur.tir_info.push(analyse); joueur.tirs_total++; joueur.but++;
      const restants = 18 - joueur.but;
      await ovl.sendMessage(ms_org, { video:{url:"https://files.catbox.moe/pad98d.mp4"}, gifPlayback:true, caption:`✅GOAL⚽! But marqué! Il vous reste ${restants} tirs.` });

      // Défi après 2 tirs
      if(joueur.but>=joueur.prochainDefi && !joueur.tirDefiEnCours){
        joueur.tirDefiEnCours=true;
        joueur.typeDefi = Math.random()<0.5?"TRIVELA KING👑":"CURVE MASTER👑";
        await ovl.sendMessage(ms_org,{caption:`⚠️ Défi activé : ${joueur.typeDefi} ! Vous avez 3 mins pour le réussir.`});
        joueur.prochainDefi += Math.floor(Math.random()*2)+2;
      }

      if(joueur.but>=18){
        clearTimeout(joueur.timer); joueur.en_cours=false;
        return envoyerResultats(ms_org, ovl, joueur);
      }
    } else {
      clearTimeout(joueur.timer); joueur.en_cours=false;
      await ovl.sendMessage(ms_org, { video:{url:"https://files.catbox.moe/9k5b3v.mp4"}, gifPlayback:true, caption:"❌MISSED : Tir manqué! Fin de l'exercice" });
      return envoyerResultats(ms_org, ovl, joueur);
    }
  }catch(e){ repondre("❌Erreur survenue lors de l'exercice"); console.error(e); }
});

// ---------------- RESULTATS ----------------
async function envoyerResultats(ms_org, ovl, joueur){
  const tag = `@${joueur.id.split('@')[0]}`;
  let rank = "❌";
  if(joueur.but>=15) rank="SS🥇";
  else if(joueur.but>=10) rank="S🥈";
  else if(joueur.but>=5) rank="A🥉";

  const result = `
🔷RESULTATS DE L'ÉVALUATION📊
*🥅Exercice:* Épreuve de tirs
*👤Joueur:* ${tag}
*⚽Buts:* ${joueur.but}
*📊Rank:* ${rank}
╰───────────────────
                      *🔷BLUELOCK⚽*`;
  await ovl.sendMessage(ms_org, { image:{url:"https://files.catbox.moe/1xnoc6.jpg"}, caption:result, mentions:[joueur.id] });
  joueurs.delete(joueur.id);
}

//---------------- AFFICHAGE RECORDS ----------------
async function afficherRecords(ms_org, ovl){
  let msg="records🏆\n";
  for(const [jid, rec] of recordsGlobal){
    msg+=`⚽Name: ${data.name}\n⚽Titles: ${rec.titles.join(", ")}\n⚽Goals: ${rec.goals}\n⚽Direct shots: ${rec.direct}\n⚽Enroulés: ${rec.enroule}\n⚽Trivelas: ${rec.trivela}\n▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░\n*🔷BLUELOCK⚽*\n\n`;
  }
  await ovl.sendMessage(ms_org,{text:msg});
}

//---------------- STOP ----------------
ovlcmd({nom_cmd:'stop', isfunc:true}, (ms_org, ovl, { auteur_Message })=>{
  const joueur=joueurs.get(auteur_Message);
  if(joueur && joueur.en_cours){ clearTimeout(joueur.timer); joueur.en_cours=false; joueurs.delete(auteur_Message); ovl.sendMessage(ms_org,{text:"✅Exercice arrêté."}); }
});
