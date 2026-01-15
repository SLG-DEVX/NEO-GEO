const { ovlcmd } = require('../lib/ovlcmd');
const { HUDFunctions } = require("../DataBase/ElysiumHudDB"); 
const { saveUser: saveHUD, deleteUser: delHUD, getUserData: getHUD, updateUser: updateHUD } = HUDFunctions;
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
// PROCESS UPDATE HUD
// ============================
async function processHUDUpdates(args, data) {
  const modifiables = [
    "besoins","pv","energie","forme","stamina","plaisir",
    "intelligence","force","vitesse","reflexes","resistance",
    "gathering","driving","hacking"
  ];

  let updates = {};
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
  if (!dataRaw) return ovl.sendMessage(ms_org, { text: "❌ Aucun HUD trouvé pour ce joueur." }, { quoted: ms });

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

  return ovl.sendMessage(ms_org, { caption: hud }, { quoted: ms });
}

// ============================
// COMMANDE +HUD💠 (DYNAMIQUE USERNAME / JID)
// ============================
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, arg, ms, auteur_Message }) => {
  try {
    if (!arg.length) return repondre("❌ Syntaxe : +hud username💠 stat +|-|= valeur");

    const usernameOrJid = arg[0].replace(/💠/g,"");
    let targetJid;

    // Chercher par JID ou username
    if (/^\d+$/.test(usernameOrJid) || usernameOrJid.includes("@")) {
      targetJid = usernameOrJid.includes("@") ? usernameOrJid : usernameOrJid + "@s.whatsapp.net";
    } else {
      const allPlayers = await PlayerFunctions.getAllPlayers();
      const playerMatch = allPlayers.find(p => {
        const data = p.dataValues ?? p;
        return (data.user?.replace(/💠/g,"").toLowerCase() === usernameOrJid.toLowerCase());
      });
      if (!playerMatch) return repondre("❌ Joueur introuvable.");
      targetJid = (playerMatch.dataValues ?? playerMatch).jid;
    }

    const hudDataRaw = await getHUD(targetJid);
    if (!hudDataRaw) return repondre("❌ Aucun HUD trouvé pour ce joueur.");

    // Si pas d'arguments supplémentaires, afficher le HUD
    if (arg.length === 1) return sendHUD(ms_org, ovl, targetJid, ms);

    const updates = await processHUDUpdates(arg.slice(1), hudDataRaw.dataValues ?? hudDataRaw);
    if (!Object.keys(updates).length) return repondre("⚠️ Format incorrect. Exemple : +hud NEO💠 pv + 10 énergie - 5");

    await updateHUD(targetJid, updates);

    const message =
      `✅ [ SYSTEM - HUD ] Mise à jour réussie pour @${targetJid.split("@")[0]}\n` +
      Object.entries(updates).map(([k,v]) => `🛠️ ${k} ➤ ${v}`).join("\n");

    return repondre(message);

  } catch (err) {
    console.error("[HUD DYNAMIQUE] Erreur :", err);
    return repondre("❌ Une erreur est survenue lors de la mise à jour ou affichage du HUD.");
  }
});

// ============================
// INIT DYNAMIQUE
// ============================
async function initDynamicHUDs() {
  const huds = await HUDFunctions.getAllHUDs?.() ?? [];
  for (const h of huds) {
    const data = h.dataValues ?? h;
    if (!data.id) continue;
    registeredHUDs.set(data.id, data.id);
  }
  console.log("[HUD] Initialisation dynamique terminée.");
}

// 🔥 Appel initial
initDynamicHUDs();

module.exports = { sendHUD, processHUDUpdates, registeredHUDs };
