const { ovlcmd } = require("../lib/ovlcmd");
const { HUDFunctions } = require("../DataBase/ElysiumHudDB");
const { saveUser: saveHUD, deleteUser: delHUD, getUserData: getHUD, updateUser: updateHUD, getAllHUDs } = HUDFunctions;
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

const registeredHUDs = new Map(); // username/jid => id

// ============================
// UTILITAIRES
// ============================
function normalizeJid(input) {
  if (!input) return null;
  if (input.endsWith("@s.whatsapp.net")) return input;
  if (/^\d+$/.test(input)) return input + "@s.whatsapp.net";
  return String(input);
}

// ============================
// TEXTE PROGRESSIF
// ============================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendProgressiveText(ovl, ms_org, text, speed = 2, ms = null) {
  let currentText = "";
  const { key } = await ovl.sendMessage(ms_org, { text: "|" }, ms ? { quoted: ms } : {});
  
  for (let i = 0; i < text.length; i++) {
    currentText += text[i];
    if ((i + 1) % 5 === 0 || i === text.length - 1) {
      await ovl.sendMessage(ms_org, { text: currentText + " |", edit: key });
    }
    await sleep(speed);
  }

  await ovl.sendMessage(ms_org, { text: currentText, edit: key });
  return key;
}

// ============================
// PROCESS UPDATE HUD
// ============================
async function processHUDUpdates(args, data) {
  const modifiables = [
    "besoins","pv","energie","forme","stamina","plaisir",
    "intelligence","force","vitesse","reflexes","resistance",
    "gathering","driving","hacking"
  ];

  const updates = {};
  for (let i = 0; i < args.length;) {
    const field = args[i]?.toLowerCase();
    const op = args[i+1];
    const val = parseInt(args[i+2], 10);

    if (!modifiables.includes(field) || !['+','-','='].includes(op) || isNaN(val)) { i++; continue; }

    if (op === '=') updates[field] = val;
    if (op === '+') updates[field] = (data[field] || 0) + val;
    if (op === '-') updates[field] = (data[field] || 0) - val;

    i += 3;
  }

  return updates;
}

// ============================
// AFFICHAGE HUD
// ============================
async function sendHUD(ms_org, ovl, jid, ms) {
  const dataRaw = await getHUD(jid);
  if (!dataRaw) return sendProgressiveText(ovl, ms_org, "❌ Aucun HUD trouvé pour ce joueur.", 2, ms);

  const data = dataRaw.dataValues ?? dataRaw;

  const hud = `
➤ ──⦿ \`P L A Y E R\` | ⦿──

> 🍗: ${data.besoins}%    ❤️: ${data.pv}%   💠: ${data.energie}%
💪🏼: ${data.forme}%    🫁: ${data.stamina}%   🙂: ${data.plaisir}%

🧠Intelligence: ${data.intelligence}     👊🏽Force: ${data.force}
🔍Gathering: ${data.gathering}     ⚡Vitesse: ${data.vitesse}
🛞Driving: ${data.driving}        👁️Reflexes: ${data.reflexes}
👾Hacking: ${data.hacking}      🛡️Résistance: ${data.resistance}

➤ \`+Package\`🎒 ➤ \`+Phone\`📱`;

  return sendProgressiveText(ovl, ms_org, hud, 2, ms);
}

// ============================
// COMMANDE +SAVEHUD💠
// ============================
ovlcmd({
  nom_cmd: "savehud💠",
  classe: "Elysium",
  react: "💾"
}, async (ms_org, ovl, { arg, repondre, auteur_Message }) => {
  try {
    if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +savehud💠 <username/JID>", 2);

    const identifier = arg[0].replace(/💠/g,"");
    let targetJid = /^\d+$/.test(identifier) ? identifier + "@s.whatsapp.net" : (identifier.includes("@") ? identifier : identifier + "@s.whatsapp.net");

    const existing = await getHUD(targetJid);
    if (existing) return sendProgressiveText(ovl, ms_org, `❌ HUD déjà existant pour @${targetJid.split("@")[0]}`, 2);

    await saveHUD(targetJid, {
      besoins: 100, pv: 100, energie: 100, forme: 100, stamina: 100, plaisir: 100,
      intelligence: 0, force: 0, vitesse: 0, reflexes: 0, resistance: 0,
      gathering: 0, driving: 0, hacking: 0
    });

    registeredHUDs.set(targetJid, targetJid);
    registerDynamicHUD(targetJid);

    return sendProgressiveText(ovl, ms_org, `✅ HUD créé pour @${targetJid.split("@")[0]}`, 2);
  } catch (err) {
    console.error("[SAVEHUD]", err);
    return sendProgressiveText(ovl, ms_org, "❌ Erreur lors de la création du HUD.", 2);
  }
});

// ============================
// COMMANDE +DELHUD💠
// ============================
ovlcmd({
  nom_cmd: "delhud💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { arg, repondre }) => {
  try {
    if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +delhud💠 <username/JID>", 2);

    const identifier = arg[0].replace(/💠/g,"");
    let targetJid = /^\d+$/.test(identifier) ? identifier + "@s.whatsapp.net" : (identifier.includes("@") ? identifier : identifier + "@s.whatsapp.net");

    const existing = await getHUD(targetJid);
    if (!existing) return sendProgressiveText(ovl, ms_org, `❌ Aucun HUD trouvé pour @${targetJid.split("@")[0]}`, 2);

    await delHUD(targetJid);
    registeredHUDs.delete(targetJid);

    return sendProgressiveText(ovl, ms_org, `✅ HUD supprimé pour @${targetJid.split("@")[0]}`, 2);
  } catch (err) {
    console.error("[DELHUD]", err);
    return sendProgressiveText(ovl, ms_org, "❌ Erreur lors de la suppression du HUD.", 2);
  }
});

// ============================
// COMMANDE DYNAMIQUE +HUD💠
// ============================
function registerDynamicHUD(identifier) {
  if (!identifier) return;

  const cleanIdentifier = identifier.replace(/💠/g, "");
  const cmd = `${cleanIdentifier.toLowerCase()}💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "💠"
  }, async (ms_org, ovl, { repondre, arg, ms }) => {
    try {
      let targetJid;
      if (/^\d+$/.test(cleanIdentifier) || cleanIdentifier.includes("@")) {
        targetJid = cleanIdentifier.includes("@") ? cleanIdentifier : cleanIdentifier + "@s.whatsapp.net";
      } else {
        const allPlayers = await PlayerFunctions.getAllPlayers();
        const playerMatch = allPlayers.find(p => {
          const data = p.dataValues ?? p;
          return (data.user?.replace(/💠/g,"").toLowerCase() === cleanIdentifier.toLowerCase());
        });
        if (!playerMatch) return sendProgressiveText(ovl, ms_org, "❌ Joueur introuvable.", 2, ms);
        targetJid = (playerMatch.dataValues ?? playerMatch).jid;
      }

      const hudDataRaw = await getHUD(targetJid);
      if (!hudDataRaw) return sendProgressiveText(ovl, ms_org, "❌ Aucun HUD trouvé pour ce joueur.", 2, ms);

      if (!arg.length || arg.length === 1) return sendHUD(ms_org, ovl, targetJid, ms);

      const updates = await processHUDUpdates(arg, hudDataRaw.dataValues ?? hudDataRaw);
      if (!Object.keys(updates).length) return sendProgressiveText(ovl, ms_org, "⚠️ Format incorrect. Exemple : +hud NEO💠 pv + 10 énergie - 5", 2, ms);

      await updateHUD(targetJid, updates);

      const message =
        `✅ [ SYSTEM - HUD ] Mise à jour réussie pour @${targetJid.split("@")[0]}\n` +
        Object.entries(updates).map(([k,v]) => `🛠️ ${k} ➤ ${v}`).join("\n");

      return sendProgressiveText(ovl, ms_org, message, 2, ms);

    } catch (err) {
      console.error(`[HUD ${cleanIdentifier}]`, err);
      return sendProgressiveText(ovl, ms_org, "❌ Une erreur est survenue lors de la mise à jour ou affichage du HUD.", 2, ms);
    }
  });
}

// ============================
// INIT DYNAMIQUE DE TOUS LES HUDS
// ============================
async function initDynamicHUDs() {
  const huds = await getAllHUDs?.() ?? [];
  for (const h of huds) {
    const data = h.dataValues ?? h;
    if (!data.id || !data.user) continue;
    registerDynamicHUD(data.user); // username
    registerDynamicHUD(data.id);   // id / JID
    registeredHUDs.set(data.id, data.id);
  }
  console.log("[HUD] Initialisation dynamique terminée.");
}

// 🔥 Appel initial
initDynamicHUDs();

module.exports = { sendHUD, processHUDUpdates, registeredHUDs, registerDynamicHUD, sendProgressiveText };
