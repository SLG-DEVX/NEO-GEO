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
  cyberwares: "cyberwares",
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
// ===========================
async function checkLevelProgressive(jid, oldExp, newExp, ovl, ms_org) {
  oldExp = Number(oldExp) || 0;
  newExp = Number(newExp) || 0;

  const dataRaw = await PlayerFunctions.getPlayer({ jid });
  if (!dataRaw) return;
  const data = dataRaw.dataValues ?? dataRaw;

  let currentLevel = Number(data.niveau) || 0;
  const maxLevel = 20;

  const oldLevelByExp = Math.floor(oldExp / 100);
  const newLevelByExp = Math.floor(newExp / 100);

  // 🔼 Montée de niveau
  if (newLevelByExp > oldLevelByExp) {
    const gain = newLevelByExp - oldLevelByExp;
    for (let i = 0; i < gain; i++) {
      if (currentLevel >= maxLevel) break;
      currentLevel++;
      await PlayerFunctions.setPlayer("niveau", currentLevel, jid); // ✅ correction

      await sendProgressiveText(
        ovl,
        ms_org,
        `💠 [ SYSTEM - ELYSIUM ] Félicitations au joueur @${jid.split("@")[0]} qui passe au niveau supérieur : *Niveau ${currentLevel} ▲*`,
        2
      );
    }
  }

  // 🔽 Descente de niveau
  if (newLevelByExp < oldLevelByExp) {
    const loss = oldLevelByExp - newLevelByExp;
    for (let i = 0; i < loss; i++) {
      if (currentLevel <= 0) break;
      currentLevel--;
      await PlayerFunctions.setPlayer("niveau", currentLevel, jid); // ✅ correction

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
    await PlayerFunctions.setPlayer(u.colonne, u.newValue, jid); // ✅ correction

    if (u.colonne === "exp") {
      await checkLevelProgressive(jid, u.oldValue, u.newValue, ovl, ms_org);
    }
  }
}

// ============================
// PROCESS MULTI UPDATES
// ============================
async function processUpdates(args, jid) {
  const updates = [];

  const dataRaw = await PlayerFunctions.getPlayer({ jid });
  if (!dataRaw) throw new Error("❌ Fiche introuvable.");

  const values = dataRaw.dataValues ?? dataRaw;

  let i = 0;
  while (i < args.length) {
    const stat = args[i++].toLowerCase().trim();
    const signe = args[i++];
    const valeur = args[i++]; // texte ou chiffre

    if (!ALLOWED_STATS[stat] && stat !== "cyberwares" && stat !== "rang" && stat !== "lifestyle") {
      throw new Error(`❌ Stat inconnue : ${stat}`);
    }

    if (!["+","-","="].includes(signe)) {
      throw new Error(`❌ Signe invalide : ${signe}`);
    }

    const oldValue = values[stat] ?? "";

    // === Stats numériques ===
    const isNumberStat = ["exp","niveau","ecash","charisme","reputation","missions","gameover","pvp","points_combat","points_chasse","points_recoltes","points_hacking","points_conduite","points_exploration","trophies"].includes(stat);

    if (isNumberStat) {
      let oldNum = Number(oldValue) || 0;
      let newNum;

      if (signe === "+") newNum = oldNum + Number(valeur);
      else if (signe === "-") newNum = Math.max(0, oldNum - Number(valeur));
      else newNum = Number(valeur);

      if (isNaN(newNum)) throw new Error(`❌ Valeur invalide pour ${stat} : ${valeur}`);

      updates.push({ colonne: stat, oldValue: oldNum, newValue: newNum });
    } 
    // === Stats texte ===
    else {
      let newText = oldValue;

      if (stat === "cyberwares") {
        const list = oldValue.split("\n").filter(Boolean);

        if (signe === "+") {
          if (!list.includes(valeur)) list.push(valeur);
        } else if (signe === "-") {
          const index = list.indexOf(valeur);
          if (index !== -1) list.splice(index, 1);
        } else if (signe === "=") {
          list.length = 0;
          if (valeur) list.push(valeur);
        }

        newText = list.join("\n");
      } 
      else {
        // Autres champs texte
        if (signe === "+") newText = oldValue ? oldValue + " " + valeur : valeur;
        else if (signe === "-") newText = oldValue.replace(valeur, "").trim();
        else if (signe === "=") newText = valeur;
      }

      updates.push({ colonne: stat, oldValue, newValue: newText });
    }
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

  // 🔹 Calcul automatique du total des cyberwares
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
🩻Cyberwares ➤ ${cyberwaresCount}
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

  // 🔹 Envoi avec image et légende
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

  const playerRaw = await PlayerFunctions.getPlayer({ jid });

  if (!playerRaw) {
    // ⚠️ Joueur n'a pas encore de fiche
    return sendProgressiveText(
      ovl,
      ms_org,
      `❌ Joueur @${jid.split("@")[0]} n'a pas encore de fiche.`,
      2
    );
  }

  await sendProgressiveText(
    ovl,
    ms_org,
    "💠 [ SYSTEM-ELYSIUM ] Chargement des données du joueur ♻️....",
    2
  );

  await sendFiche(ms_org, ovl, jid, ms);
});

// +add💠
ovlcmd({
  nom_cmd: "add💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { arg, repondre, auteur_Message }) => {

  // ✅ Vérification setsudo
  if (!SETSUDO.includes(auteur_Message.split("@")[0])) {
    return sendProgressiveText(
      ovl,
      ms_org,
      "❌ Seul un setsudo peut créer une fiche avec +add💠.",
      2
    );
  }

  if (arg.length < 2) {
    return sendProgressiveText(
      ovl,
      ms_org,
      "❌ Syntaxe : +add💠 <jid> <code_fiche>",
      2
    );
  }

  const jid = arg[0];
  const code_fiche = arg.slice(1).join(" ");

  const existing = await PlayerFunctions.getPlayer({ jid });
  if (existing && existing.code_fiche !== "aucun") {
    return sendProgressiveText(
      ovl,
      ms_org,
      `❌ Le joueur @${jid.split("@")[0]} possède déjà une fiche.`,
      2
    );
  }

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

  return sendProgressiveText(
    ovl,
    ms_org,
    `✅ Fiche créée : ${code_fiche}`,
    2
  );
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
// COMMANDE DYNAMIQUE POUR MODIFIER oc_url
// ============================
function registerOcUrlCommand(identifier) {
  if (!identifier) return;

  const cleanIdentifier = identifier.replace(/💠/g, "");
  const cmd = `${cleanIdentifier}💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "🖼️"
  }, async (ms_org, ovl, { arg, repondre }) => {
    try {
      if (!arg.length) return repondre(`❌ Syntaxe : +${cleanIdentifier}💠 oc_url = <lien>`);

      const input = arg.join(" ");
      const match = input.match(/oc_url\s*=\s*(.+)/i);
      if (!match) return repondre("❌ Syntaxe invalide. Ex: +username💠 oc_url = https://files.catbox.moe/xxxxx.jpg");

      const newUrl = match[1].trim();
      if (!newUrl.startsWith("http")) return repondre("❌ Lien invalide.");

      // Récupérer le JID du joueur
      let targetJid;
      if (/^\d+$/.test(cleanIdentifier) || cleanIdentifier.includes("@")) {
        targetJid = cleanIdentifier.includes("@") ? cleanIdentifier : cleanIdentifier + "@s.whatsapp.net";
      } else {
        const allPlayers = await PlayerFunctions.getAllPlayers();
        const playerMatch = allPlayers.find(p => {
          const data = p.dataValues ?? p;
          return (data.user?.replace(/💠/g, "").toLowerCase() === cleanIdentifier.toLowerCase());
        });
        if (!playerMatch) return repondre("❌ Joueur introuvable.");
        targetJid = (playerMatch.dataValues ?? playerMatch).jid;
      }

      const playerRaw = await PlayerFunctions.getPlayer({ jid: targetJid });
      if (!playerRaw) return repondre("❌ Fiche introuvable.");

      // Mise à jour de l'URL
      await PlayerFunctions.setPlayer("oc_url", newUrl, targetJid);

      await sendProgressiveText(
        ovl,
        ms_org,
        `✅ [ SYSTEM - ELYSIUM ] L'URL de l'image du joueur @${targetJid.split("@")[0]} a été mise à jour.`,
        2
      );

    } catch (err) {
      console.error(`[${cleanIdentifier}💠]`, err);
      await sendProgressiveText(ovl, ms_org, "❌ [ SYSTEM - ELYSIUM ] Erreur interne.", 2);
    }
  });
}

// ============================
// INIT DYNAMIQUE oc_url POUR TOUS LES USERS
// ============================
async function initDynamicOcUrlCommands() {
  try {
    const players = await PlayerFunctions.getAllPlayers();

    for (const p of players) {
      const data = p.dataValues ?? p;
      if (!data.user || !data.jid) continue;

      registerOcUrlCommand(data.user); // username
      registerOcUrlCommand(data.jid.replace("@s.whatsapp.net", "")); // JID
    }

    console.log("[ELYSIUM] Commandes oc_url initialisées (username + JID)");
  } catch (e) {
    console.error("[ELYSIUM INIT OC_URL]", e);
  }
}

// 🔥 Appel unique après initElysiumFiches
initDynamicOcUrlCommands(); 


// ============================
// DYNAMIQUE USERS / JID
// ============================
function registerDynamicCommand(identifier) {
  if (!identifier) return;

  const cleanIdentifier = identifier.replace(/💠/g, "");
  const cmd = `${cleanIdentifier.toLowerCase()}💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "⚙️"
  }, async (ms_org, ovl, { repondre, arg }) => {
    try {
      if (!arg.length || arg.length % 3 !== 0) {
        return repondre(`❌ Syntaxe : +${cleanIdentifier}💠 stat +|- valeur [stat +|- valeur ...]`);
      }

      let targetJid;

      if (/^\d+$/.test(cleanIdentifier) || cleanIdentifier.includes("@")) {
        targetJid = cleanIdentifier.includes("@") ? cleanIdentifier : cleanIdentifier + "@s.whatsapp.net";
      } else {
        const allPlayers = await PlayerFunctions.getAllPlayers();
        const playerMatch = allPlayers.find(p => {
          const data = p.dataValues ?? p;
          return (data.user?.replace(/💠/g, "").toLowerCase() === cleanIdentifier.toLowerCase());
        });
        if (!playerMatch) return repondre("❌ Joueur introuvable.");
        targetJid = (playerMatch.dataValues ?? playerMatch).jid;
      }

      const playerRaw = await PlayerFunctions.getPlayer({ jid: targetJid });
      if (!playerRaw) return repondre("❌ Fiche introuvable.");

      const player = playerRaw.dataValues ?? playerRaw;
      const updates = await processUpdates(arg, targetJid);
await updatePlayerData(updates, targetJid, ovl, ms_org);

      const message =
        `✅ [ SYSTEM - ELYSIUM ] Mise à jour réussie\n\n` +
        updates.map(u => `🛠️ ${u.colonne} : ${u.oldValue} ➤ ${u.newValue}`).join("\n");

      await sendProgressiveText(ovl, ms_org, message, 2);

    } catch (err) {
      console.error(`[${cleanIdentifier}💠]`, err);
      await sendProgressiveText(ovl, ms_org, `❌ [ SYSTEM - ELYSIUM ] Erreur interne.`, 2);
    }
  });
}

// ============================
// INIT DYNAMIQUE DE TOUS LES USERS ET JID
// ============================
async function initDynamicUserCommands() {
  try {
    const players = await PlayerFunctions.getAllPlayers();

    for (const p of players) {
      const data = p.dataValues ?? p;
      if (!data.user || !data.jid) continue;

      registerDynamicCommand(data.user); // username
      registerDynamicCommand(data.jid.replace("@s.whatsapp.net", "")); // JID
    }

    console.log("[ELYSIUM] Commandes users initialisées (username + JID)");
  } catch (e) {
    console.error("[ELYSIUM INIT USERS]", e);
  }
}

// ============================
// INIT GLOBAL AU DÉMARRAGE
// ============================
async function initElysiumFiches() {
  const all = await PlayerFunctions.getAllPlayers();

  for (const p of all) {
    const data = p.dataValues ?? p;
    if (data.code_fiche && data.jid && !registeredFiches.has(data.code_fiche)) {
      registeredFiches.set(data.code_fiche, data.jid);
    }
  }

  await initDynamicUserCommands();
}

// 🔥 Appel unique
initElysiumFiches();
