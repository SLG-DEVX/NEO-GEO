const { ovlcmd } = require("../lib/ovlcmd");
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

const registeredFiches = new Map(); // code_fiche => jid

// ============================
// CONFIG SETSUDO
// ============================
const SETSUDO = ["242055759975", "22651463203", "242069983150"];

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
// TEXTE PROGRESSIF (FIX FINAL)
// ============================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendProgressiveText(ovl, ms_org, text, speed = 2) {
  let currentText = "";
  const { key } = await ovl.sendMessage(ms_org, { text: "|" });

  for (let i = 0; i < text.length; i++) {
    currentText += text[i];

    if ((i + 1) % 5 === 0 || i === text.length - 1) {
      await ovl.sendMessage(ms_org, {
        text: currentText + " |",
        edit: key
      });
    }

    await sleep(speed);
  }

  await ovl.sendMessage(ms_org, {
    text: currentText,
    edit: key
  });

  return key;
}

// ============================
// LEVEL-UP / LEVEL-DOWN
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

  if (newLevelByExp > oldLevelByExp) {
    const gain = newLevelByExp - oldLevelByExp;
    for (let i = 0; i < gain; i++) {
      if (currentLevel >= maxLevel) break;
      currentLevel++;
      await PlayerFunctions.setfiche("niveau", currentLevel, jid);

      await sendProgressiveText(
        ovl,
        ms_org,
        `💠 [ SYSTEM - ELYSIUM ] Félicitations au joueur @${jid.split("@")[0]} qui passe au niveau supérieur : *Niveau ${currentLevel} ▲*`,
        2
      );
    }
  }

  if (newLevelByExp < oldLevelByExp) {
    const loss = oldLevelByExp - newLevelByExp;
    for (let i = 0; i < loss; i++) {
      if (currentLevel <= 0) break;
      currentLevel--;
      await PlayerFunctions.setfiche("niveau", currentLevel, jid);

      await sendProgressiveText(
        ovl,
        ms_org,
        `💠 [ SYSTEM - ELYSIUM ] Joueur @${jid.split("@")[0]} descend au niveau inférieur : *Niveau ${currentLevel} ▼*`,
        2
      );
    }
  }
}

// ============================
// UPDATE DATA
// ============================
async function updatePlayerData(updates, jid, ovl, ms_org) {
  for (const u of updates) {
    await PlayerFunctions.setfiche(u.colonne, u.newValue, jid);

    if (u.colonne === "exp") {
      await checkLevelProgressive(jid, u.oldValue, u.newValue, ovl, ms_org);
    }
  }
}

// ============================
// PROCESS MULTI UPDATES
// ============================
async function processUpdates(argArray, player) {
  const updates = [];
  let i = 0;

  while (i < argArray.length) {
    const stat = argArray[i++];
    const op = argArray[i++];
    const value = Number(argArray[i++]);

    if (!ALLOWED_STATS[stat]) throw new Error("Stat inconnue");
    if (!["+","-"].includes(op)) throw new Error("Opérateur invalide");
    if (isNaN(value) || value <= 0) throw new Error("Valeur invalide");

    const oldValue = Number(player[stat] || 0);
    const newValue = op === "+" ? oldValue + value : Math.max(0, oldValue - value);

    updates.push({ colonne: stat, oldValue, newValue });
    player[stat] = newValue;
  }

  return updates;
}

// ============================
// ENVOI DE LA FICHE (COMPLÈTE)
// ============================
async function sendFiche(ms_org, ovl, jid, ms) {
  const dataRaw = await PlayerFunctions.getPlayer({ jid });
  if (!dataRaw) return ovl.sendMessage(ms_org, { text: "❌ Fiche introuvable." }, ms ? { quoted: ms } : {});

  const data = dataRaw.dataValues ?? dataRaw;
  data.cyberwares ||= "";
  data.oc_url ||= "https://files.catbox.moe/2k3S1yf.png";

  const cyberwaresCount = data.cyberwares.split("\n").filter(Boolean).length;

  const fiche = `
▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
*🫆Pseudo:*  ➤ ${data.pseudo}
*🫆User:*       ➤ ${data.user}
*⏫Exp:*        ➤ ${data.exp}/4000 \`XP\`
*🔰Niveau:*   ➤ ${data.niveau} ▲
*🎖️Rang:*      ➤ ${data.rang}
*🛄Infos:* ➤  

▒▒▒░░ \`P L A Y E R\` 💠 
▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░ 
💲ECash:           ➤ ${data.ecash} \`E¢\`
🌟Lifestyle:      ➤ ${data.lifestyle} 🌟
⭐Charisme:      ➤ ${data.charisme} ⭐
🫱🏼‍🫲🏽Réputation:   ➤ ${data.reputation} 🫱🏼‍🫲🏽
-------------------\\--------------
+Me💠             ➤ ( interface joueur )
+Inventaire💠     ➤ ( Propriétés )

░▒▒▒▒░ \`C Y B E R W A R E S\` 💠 
▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
🩻Cyberwares (Total) ➤ ${cyberwaresCount}
➤ ${data.cyberwares.split("\n").join(" • ") || "-"}

░▒▒▒▒░░▒░ \`S T A T S\`  💠
✅Missions:    ➤ ${data.missions}
❌Game over: ➤ ${data.gameover}
🏆Elysium Games PVP: ➤ ${data.pvp}
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▯▯▯▯▯▯

👊🏽Points combat:     ➤ ${data.points_combat}
🪼Points chasse:      ➤ ${data.points_chasse}/4000🪼
🪸Points récoltes:    ➤ ${data.points_recoltes}/4000🪸
👾Points Hacking:     ➤ ${data.points_hacking}/4000👾
🏁Points conduite:    ➤ ${data.points_conduite}/4000🏁
🌍Points Exploration: ➤ ${data.points_exploration}/4000🌍

░▒░▒░ \`A C H I E V M E N T S\`  💠
🏆Trophies : ${data.trophies} 🏆
➤
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                              💠▯▯▯▯▯▯⎢⎢⎢⎢⎢`;

  return ovl.sendMessage(
    ms_org,
    { image: { url: data.oc_url }, caption: fiche },
    ms ? { quoted: ms } : {}
  );
}

// ============================
// COMMANDES
// ============================

// +elysiumme💠
ovlcmd({
  nom_cmd: "elysiumme💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { auteur_Message, arg, ms }) => {
  const jid = arg[0] || auteur_Message;

  await sendProgressiveText(
    ovl,
    ms_org,
    "💠 [ SYSTEM-ELYSIUM ] Chargement des données du joueur ♻️....",
    2
  );

  await sendFiche(ms_org, ovl, jid, ms);
});

// ============================
// COMMANDES DYNAMIQUES PAR USER
// ============================
function registerUserCommand(user, jid) {
  if (!user || !jid) return;

  ovlcmd({
    nom_cmd: `${user}💠`, // Commande dynamique basée sur data.user
    classe: "Elysium",
    react: "⚙️"
  }, async (ms_org, ovl, { repondre, arg, ms }) => {
    try {
      if (!arg.length || arg.length % 3 !== 0)
        return repondre(`❌ Syntaxe : +${user}💠 stat +|- valeur [stat +|- valeur ...]`);

      // Récupère les données du joueur
      const player = await PlayerFunctions.getPlayer({ jid });
      if (!player) return repondre("❌ Aucune fiche trouvée pour ce user.");

      // Traitement des mises à jour
      const updates = await processUpdates(arg, player);
      await updatePlayerData(updates, player.jid, ovl, ms_org);

      // Préparation du message final
      const message = updates
        .map(u => `🛠️ *${u.colonne}* : \`${u.oldValue}\` ➤ \`${u.newValue}\``)
        .join("\n");

      // Envoi du message en texte progressif (curseur unique, edit tous les 8 caractères)
      await sendProgressiveText(
        ovl,
        ms_org,
        `✅ Fiche mise à jour avec succès !\n\n${message}`,
        2,  // vitesse 2ms
        8   // éditer tous les 8 caractères
      );

    } catch (err) {
      console.error(`Erreur +${user}💠 :`, err);
      await repondre("❌ Une erreur est survenue. Vérifie les paramètres.");
    }
  });
}

// +add💠
ovlcmd({
  nom_cmd: "add💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { arg, repondre }) => {
  if (arg.length < 2) return repondre("❌ Syntaxe : +add💠 <jid> <code_fiche>");

  const jid = arg[0];
  const code_fiche = arg.slice(1).join(" ");

  const existing = await PlayerFunctions.getPlayer({ jid });
  if (existing && existing.code_fiche !== "aucun")
    return repondre("❌ Ce joueur possède déjà une fiche.");

  await sendProgressiveText(
    ovl,
    ms_org,
    "💠 [ SYSTEM-ELYSIUM ] Ajout d'un nouveau joueur au monde virtuel Élysium ♻️ ...",
    2
  );

  await PlayerFunctions.addPlayer(jid, {
    code_fiche,
    pseudo: "Nouveau Joueur",
    user: jid.replace("@s.whatsapp.net", ""),
    exp: 0, niveau: 1, rang: "Novice🥉",
    ecash: 50000, lifestyle: 0, charisme: 0, reputation: 0,
    cyberwares: "", missions: 0, gameover: 0, pvp: 0,
    points_combat: 0, points_chasse: 0, points_recoltes: 0,
    points_hacking: 0, points_conduite: 0, points_exploration: 0,
    trophies: 0
  });

  registeredFiches.set(code_fiche, jid);
  return repondre(`✅ Fiche créée : ${code_fiche}`);
});

// +del💠
ovlcmd({
  nom_cmd: "del💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { arg, repondre }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +del💠 @jid");

  const jidToDelete = arg[0];
  const player = await PlayerFunctions.getAllPlayers()
    .then(all => all.find(p => p.jid === jidToDelete));

  if (!player) return repondre("❌ Aucune fiche trouvée.");

  await sendProgressiveText(
    ovl,
    ms_org,
    "💠 [ SYSTEM-ELYSIUM ] Suppression d'un joueur du monde virtuel Élysium ♻️ ...",
    2
  );

  await PlayerFunctions.deletePlayer(player.jid);
  registeredFiches.delete(player.code_fiche);
  return repondre(`✅ Fiche supprimée : ${player.code_fiche}`);
});

// ============================
// INIT AUTO
// ============================
async function initElysiumFiches() {
  const all = await PlayerFunctions.getAllPlayers();
  for (const p of all) {
    if (p.code_fiche && p.jid && !registeredFiches.has(p.code_fiche)) {
      registeredFiches.set(p.code_fiche, p.jid);
    }
  }
}

initElysiumFiches();
