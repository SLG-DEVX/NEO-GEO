const { ovlcmd } = require('../lib/ovlcmd');
const joueurs = new Map();

//---------------- ZONES ET PIEDS ----------------
const ZONES = ["ras du sol gauche","ras du sol droite","ras du sol droit","mi-hauteur gauche","mi-hauteur droite","mi-hauteur droit","lucarne gauche","lucarne droite"];
const PIEDS = ["interieur du pied droit","interieur du pied gauche","pointe du pied droit","pointe du pied gauche","cou de pied droit","cou de pied gauche","exterieur du pied droit","exterieur du pied gauche","extérieur du pied droit","extérieur du pied gauche"];

//---------------- MODÈLES DE TIRS ----------------
const MODELES_TIRS = [
  { texte:"Tir direct", tir_type:"tir direct" },
  { texte:"Tir enroulé", tir_type:"tir enroulé" },
  { texte:"Tir trivela", tir_type:"tir trivela" }
];

//---------------- NORMALISATION ----------------
function normalize(t){
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

//---------------- DÉTECTION DU TIR ----------------
function detectTirParElements(text){
  const t = normalize(text);
  if(t.includes("tir direct")) return {tir_type:"tir direct", tir_zone: detectZone(t)};
  if(t.includes("tir enroulé")) return {tir_type:"tir enroulé", tir_zone: detectZone(t)};
  if(t.includes("tir trivela")) return {tir_type:"tir trivela", tir_zone: detectZone(t)};
  return {tir_type:"MISSED"};
}

function detectZone(t){
  return ZONES.find(z=>t.includes(normalize(z))) || null;
}

//---------------- PROBABILITÉ ----------------
function calcChanceGoal(tir){
  if(tir.tir_type==="tir direct") return 0.9;
  if(tir.tir_type==="tir enroulé") return 0.8;
  if(tir.tir_type==="tir trivela") return 0.75;
  return 0;
}

//---------------- ÉPREUVE DU TIR ----------------
ovlcmd({
  nom_cmd:"epreuve du tir",
  isfunc:true
}, async (ms_org, ovl, { texte, auteur_Message }) => {

  if(!texte.toLowerCase().includes("⚽blue🔷lock🥅")) return;

  const joueur = joueurs.get(auteur_Message);
  if(!joueur || !joueur.en_cours) return;

  const analyse = detectTirParElements(texte);

  if(analyse.tir_type==="MISSED"){
    clearTimeout(joueur.timer);
    joueur.en_cours=false;
    await ovl.sendMessage(ms_org,{
      video:{url:"https://files.catbox.moe/9k5b3v.mp4"},
      gifPlayback:true,
      caption:"❌MISSED : Tir manqué fin de l'exercice !"
    });
    return envoyerResultats(ms_org,ovl,joueur);
  }

  // ❌ répétition tir_type (hors défi)
  if(!joueur.tirDefiEnCours){
    const lastType = joueur.tir_info.slice(-1)[0]?.tir_type;
    if(lastType === analyse.tir_type){
      clearTimeout(joueur.timer);
      joueur.en_cours=false;
      return envoyerResultats(ms_org,ovl,joueur);
    }
  }

  // ❌ logique zones
  if(!joueur.tirDefiEnCours){
    const last = joueur.tir_info.slice(-1)[0];
    if(last){
      if(analyse.tir_type==="tir direct" && last.tir_zone===analyse.tir_zone){
        clearTimeout(joueur.timer);
        joueur.en_cours=false;
        return envoyerResultats(ms_org,ovl,joueur);
      }
      if((analyse.tir_type==="tir enroulé"||analyse.tir_type==="tir trivela")
        && last.tir_zone?.startsWith("lucarne")
        && analyse.tir_zone?.startsWith("lucarne")){
        clearTimeout(joueur.timer);
        joueur.en_cours=false;
        return envoyerResultats(ms_org,ovl,joueur);
      }
    }
  }

  const chance = calcChanceGoal(analyse);
  if(Math.random() > chance){
    clearTimeout(joueur.timer);
    joueur.en_cours=false;
    await ovl.sendMessage(ms_org,{
      video:{url:"https://files.catbox.moe/9k5b3v.mp4"},
      gifPlayback:true,
      caption:"❌MISSED : Tir manqué fin de l'exercice !"
    });
    return envoyerResultats(ms_org,ovl,joueur);
  }

  // ✅ GOAL (BLOC ORIGINAL)
  joueur.tir_info.push(analyse);
  joueur.tirs_total++;
  joueur.but++;

  const restants = 15 - joueur.but;

  await ovl.sendMessage(ms_org, {
    video:{ url:"https://files.catbox.moe/pad98d.mp4" },
    gifPlayback:true,
    caption:`✅⚽GOAL : ${joueur.but} but${joueur.but>1?'s':''} 🎯\n⚠️ Il vous reste ${restants} tirs ⌛`
  });

  // 🔥 défi tous les 2 buts
  if(joueur.but % 2 === 0){
    joueur.tirDefiEnCours = true;
    joueur.defiType = Math.random()<0.5?"tir enroulé":"tir trivela";

    await ovl.sendMessage(ms_org,{
      video:{url:"https://files.catbox.moe/zqm7et.mp4"},
      gifPlayback:true,
      caption:`⚠️ Défi activé : ${joueur.defiType.toUpperCase()} !`
    });

    setTimeout(()=>{
      joueur.tirDefiEnCours=false;
      joueur.defiType=null;
    },3*60*1000);
  }

  if(joueur.but>=15){
    clearTimeout(joueur.timer);
    joueur.en_cours=false;
    return envoyerResultats(ms_org,ovl,joueur);
  }
});

//---------------- RESULTATS ----------------
async function envoyerResultats(ms_org, ovl, joueur) {
  const tag = `@${joueur.id.split('@')[0]}`;
  let rank = "❌";
  if(joueur.but >= 15) rank = "SS🥇";
  else if(joueur.but >= 10) rank = "S🥈";
  else if(joueur.but >= 5) rank = "A🥉";

  const result = `
🔷RESULTATS DE L'ÉVALUATION📊

*🥅Exercice:* Épreuve de tirs
*👤Joueur:* ${tag}
*⚽Buts:* ${joueur.but}
*📊Rank:* ${rank}

╰───────────────────
                      *🔷BLUELOCK⚽*`;

  await ovl.sendMessage(ms_org, {
    image:{url:"https://files.catbox.moe/1xnoc6.jpg"},
    caption: result,
    mentions:[joueur.id]
  });

  joueurs.delete(joueur.id);
}
