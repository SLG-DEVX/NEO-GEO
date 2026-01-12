const { ovlcmd } = require("../lib/ovlcmd");
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

const registeredFiches = new Map(); // code_fiche => jid

// ============================
// CONFIG SETSUDO
// ============================
const SETSUDO = ["242055759975", "22651463203", "242069983150"]; // numéros autorisés

// ============================
// STATS AUTORISÉES
// ============================
const ALLOWED_STATS = {
  exp: "exp",
  niveau: "niveau",
  ecash: "ecash",
  charisme: "charisme",
  reputation: "reputation",
  lifestyle: "lifestyle",

  missions: "missions",
  gameover: "gameover",
  pvp: "pvp",

  points_combat: "points_combat",
  points_chasse: "points_chasse",
  points_recoltes: "points_recoltes",
  points_hacking: "points_hacking",
  points_conduite: "points_conduite",
  points_exploration: "points_exploration",

  trophies: "trophies"
};

// ============================
// UTILS
// ============================
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ============================
// TEXTE PROGRESSIF (STYLE MACHINE)
// ============================
async function sendProgressiveTextSingleMessage(ovl, ms_org, text, speed = 15) {
  let message = "";
  for (const char of text) {
    message += char;
    await ovl.sendMessage(ms_org, { text: message });
    await new Promise(res => setTimeout(res, speed));
  }
}

// ============================
// CHECK LEVEL-UP / LEVEL-DOWN
// ============================
async function checkLevelProgressive(jid, oldExp, newExp, ovl, ms_org) {
  oldExp = Number(oldExp) || 0;
  newExp = Number(newExp) || 0;

  const dataRaw = await PlayerFunctions.getData({ jid });
  const data = dataRaw.dataValues ?? dataRaw;

  let currentLevel = Number(data.niveau) || 0;
  const maxLevel = 20;

  const oldLevelByExp = Math.floor(oldExp / 100);
  const newLevelByExp = Math.floor(newExp / 100);

  // 🔼 Level-up
  if (newLevelByExp > oldLevelByExp) {
    const levelsGained = newLevelByExp - oldLevelByExp;
    for (let i = 0; i < levelsGained; i++) {
      if (currentLevel >= maxLevel) break;
      currentLevel++;
      await PlayerFunctions.setfiche("niveau", currentLevel, jid);

      const message = `💠 [ SYSTEM ]\nFélicitations au joueur @${jid.split('@')[0]} qui passe au niveau supérieur : *Niveau ${currentLevel} ▲*`;
      await sendProgressiveText(ovl, ms_org, message, 25);
    }
  }

  // 🔽 Level-down
  else if (newLevelByExp < oldLevelByExp) {
    const levelsLost = oldLevelByExp - newLevelByExp;
    for (let i = 0; i < levelsLost; i++) {
      if (currentLevel <= 0) break;
      currentLevel--;
      await PlayerFunctions.setfiche("niveau", currentLevel, jid);

      const message = `💠 [ SYSTEM ]\nJoueur @${jid.split('@')[0]} descend au niveau inférieur : *Niveau ${currentLevel} ▼*`;
      await sendProgressiveText(ovl, ms_org, message, 25);
    }
  }
}

// ============================
// UPDATE DES DONNÉES JOUEUR
// ============================
async function updatePlayerData(updates, jid, ovl, ms_org) {
  for (const update of updates) {
    await PlayerFunctions.setfiche(update.colonne, update.newValue, jid);

    if (update.colonne === "exp") {
      try {
        const oldExp = Number(update.oldValue) || 0;
        const newExp = Number(update.newValue) || 0;
        await checkLevelProgressive(jid, oldExp, newExp, ovl, ms_org);
      } catch (e) {
        console.error("Erreur checkLevelProgressive :", e);
      }
    }
  }
}

// ============================
// PROCESS MULTI-UPDATES
// ============================
async function processUpdates(argArray, player) {
  const updates = [];

  let i = 0;
  while (i < argArray.length) {
    const statKey = argArray[i++];
    const operator = argArray[i++];
    const value = Number(argArray[i++]);

    if (!ALLOWED_STATS[statKey]) throw new Error(`❌ Stat inconnue : ${statKey}`);
    if (!["+", "-"].includes(operator)) throw new Error(`❌ Opérateur invalide : ${operator}`);
    if (isNaN(value) || value <= 0) throw new Error(`❌ Valeur invalide pour ${statKey}`);

    const oldValue = Number(player[statKey] || 0);
    const newValue = operator === "+" ? oldValue + value : Math.max(0, oldValue - value);

    updates.push({ colonne: statKey, oldValue, newValue });

    // Mise à jour temporaire pour le calcul du prochain update
    player[statKey] = newValue;
  }

  return updates;
}

// ============================
// FONCTION POUR ENVOYER UNE FICHE
// ============================
async function sendFiche(ms_org, ovl, jid, ms) {
  const dataRaw = await PlayerFunctions.getPlayer({ jid });
  if (!dataRaw) return ovl.sendMessage(ms_org, { text: "❌ Fiche introuvable." }, { quoted: ms });

  const data = dataRaw.dataValues ?? dataRaw;

  data.cyberwares ||= "";
  data.oc_url ||= "";

  const cyberwaresCount = data.cyberwares
    ? data.cyberwares.split("\n").filter(c => c.trim()).length
    : 0;

  const fiche = `➤               ──⦿ P L A Y E R | ⦿── 
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
*🫆Pseudo:*  ➤ ${data.pseudo}
*🫆User:*       ➤ ${data.user}
*⏫Exp:*        ➤ ${data.exp}/4000 *\`XP\`*
*🔰Niveau:*   ➤ ${data.niveau} ▲
*🎖️Rang:*      ➤ ${data.rang}
*🛄Infos:*
➤  

▒▒▒░░ \`P L A Y E R\` 💠 
▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░ 
*💲ECash*:           ➤ ${data.ecash} \`E¢\`
*🌟Lifestyle*:      ➤ ${data.lifestyle} 🌟
*⭐Charisme:*      ➤ ${data.charisme} ⭐
*🫱🏼‍🫲🏽Réputation:*   ➤ ${data.reputation} 🫱🏼‍🫲🏽 
-------------------\\--------------
*+Me💠*             ➤ ( 𝗂𝗇𝗍𝖾𝗋𝖿𝖺𝖼𝖾 𝖽𝖾 𝗃𝗈𝗎𝖾𝗎𝗋 )
*+Inventaire💠* ➤ ( Propriétés ) 
 
░▒▒▒▒░ \`C Y B E R W A R E S\` 💠 ▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
 *🩻Cyberwares :*(Total) ➤ ${cyberwaresCount}
➤ ${data.cyberwares.split("\n").join(" • ") || "-"}

░▒▒▒▒░░▒░ \`S T A T S\`  💠
▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
*✅Missions:*    ➤ ${data.missions} ✅
*❌Game over:* ➤ ${data.gameover} ❌
*🏆Elysium Games PVP:* ➤ ${data.pvp} 🏆

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▯▯▯▯▯▯

*👊🏽Points combat:*     ➤  ${data.points_combat}
*🪼Points chasse:*      ➤ ${data.points_chasse}/4000🪼
*🪸Points récoltes:*    ➤ ${data.points_recoltes}/4000🪸
*👾Points Hacking:*     ➤ ${data.points_hacking}/4000👾 
*🏁Points conduite*:    ➤ ${data.points_conduite}/4000🏁 
*🌍Points Exploration:* ➤ ${data.points_exploration}/4000🌍

░▒░▒░ \`A C H I E V M E N T S\`  💠 
▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
*🏆Trophies :* ${data.trophies} 🏆 
➤
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                              💠▯▯▯▯▯▯⎢⎢⎢⎢⎢`; ;
 
  return ovl.sendMessage(ms_org, { image: { url: data.oc_url}, caption: fiche }, { quoted: ms });
}

// ============================
// COMMANDE +user💠
// ============================
ovlcmd({
  nom_cmd: "user💠",
  classe: "Elysium",
  react: "⚙️"
}, async (ms_org, ovl, { repondre, arg, auteur_Message }) => {
  try {
    const sender = auteur_Message.replace("@s.whatsapp.net", "");
    if (!SETSUDO.includes(sender))
      return repondre("⛔ Commande réservée aux administrateurs.");

    if (arg.length < 3 || arg.length % 3 !== 0)
      return repondre("❌ Syntaxe : +user💠 stat +|- valeur [stat +|- valeur ...]");

    const player = await PlayerFunctions.getAllPlayers()
      .then(all => all.find(p => p.user === sender));

    if (!player) return repondre("❌ Aucune fiche trouvée pour ce user.");

    const updates = await processUpdates(arg, player);

    await updatePlayerData(updates, player.jid, ovl, ms_org);

    const message = updates
      .map(u => `🛠️ *${u.colonne}* : \`${u.oldValue}\` ➤ \`${u.newValue}\``)
      .join("\n");

    await repondre("✅ Fiche mise à jour avec succès !\n\n" + message);
  } catch (err) {
    console.error("Erreur +user💠 :", err);
    await repondre("❌ Une erreur est survenue. Vérifie les paramètres.");
  }
});

// ============================
// AJOUT COMMANDE DYNAMIQUE
// ============================
function registerFicheCommand(code_fiche, jid) {
  if (!code_fiche || !jid || registeredFiches.has(code_fiche)) return;

  registeredFiches.set(code_fiche, jid);

  ovlcmd({
    nom_cmd: code_fiche,
    classe: "Elysium",
    react: "💠"
  }, async (ms_org, ovl, { ms }) => {
    await sendFiche(ms_org, ovl, jid, ms);
  });
}

// ============================
// INIT AUTOMATIQUE
// ============================
async function initElysiumFiches() {
  try {
    const all = await PlayerFunctions.getAllPlayers();
    for (const p of all) {
      if (!p.code_fiche || p.code_fiche === "aucun" || !p.jid) continue;
      registerFicheCommand(p.code_fiche, p.jid);
    }
  } catch (e) {
    console.error("[INIT ELYSIUM]", e);
  }
}

initElysiumFiches();

// ============================
// COMMANDE +add💠
// ============================
ovlcmd({
  nom_cmd: "add💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (arg.length < 2) return repondre("❌ Syntaxe : +add💠 <jid> <code_fiche>");

  const jid = arg[0];
  const code_fiche = arg.slice(1).join(" ");
  const existing = await PlayerFunctions.getPlayer({ jid });

  if (existing && existing.code_fiche !== "aucun")
    return repondre("❌ Ce joueur possède déjà une fiche.");

  // 🔹 Message progressif avant la création de la fiche
  await sendProgressiveTextSingleMessage(
    ovl,
    ms_org,
    "💠 [ SYSTEM-ELYSIUM ] Ajout d'un nouveau joueur au monde virtuel Élysium ♻️ ...",
    15
  );

  await PlayerFunctions.addPlayer(jid, {
    code_fiche,
    pseudo: "Nouveau Joueur",
    user: jid.replace("@s.whatsapp.net",""),
    exp: 0,
    niveau: 1,
    rang: "Novice🥉",
    ecash: 50000,
    lifestyle: 0,
    charisme: 0,
    reputation: 0,
    cyberwares: "",
    missions: 0,
    gameover: 0,
    pvp: 0,
    points_combat: 0,
    points_chasse: 0,
    points_recoltes: 0,
    points_hacking: 0,
    points_conduite: 0,
    points_exploration: 0,
    trophies: 0
  });

  registerFicheCommand(code_fiche, jid);

  return repondre(`✅ Fiche créée :\n• JID : ${jid}\n• Commande : +${code_fiche}`);
}); 

// ============================
// COMMANDE +del💠 
// ============================
ovlcmd({
  nom_cmd: "del💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +del💠 @jid");

  const jidToDelete = arg[0];

  const player = await PlayerFunctions.getAllPlayers()
    .then(all => all.find(p => p.jid === jidToDelete));

  if (!player) return repondre("❌ Aucune fiche trouvée.");

  // 🔹 Message progressif avant suppression
  await sendProgressiveTextSingleMessage(
    ovl,
    ms_org,
    "💠 [ SYSTEM-ELYSIUM ] Suppression d'un joueur du monde virtuel Élysium ♻️ ...",
    15
  );

  await PlayerFunctions.deletePlayer(player.jid);
  registeredFiches.delete(player.code_fiche);

  return repondre(`✅ Fiche supprimée : ${player.code_fiche}`);
});

// ============================
// COMMANDE ELYSIUMME
// ============================
ovlcmd({
  nom_cmd: "elysiumme💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, arg, auteur_Message, ms }) => {
  try {
    let jid;
    if (arg.length >= 1 && arg[0].includes("@")) {
      jid = arg[0];
    } else {
      jid = auteur_Message;
    }

    // 🔹 Message progressif avant la fiche
    await sendProgressiveTextSingleMessage(
      ovl,
      ms_org,
      `💠 [ SYSTEM-ELYSIUM ] Chargement des données du joueur ♻️....`,
      15
    );

    // 🔹 Ensuite on envoie la fiche normalement
    await sendFiche(ms_org, ovl, jid, ms);

  } catch (err) {
    console.error(err);
    return repondre("❌ Une erreur est survenue (voir console).");
  }
});
