
const { ovlcmd } = require("../lib/ovlcmd");
const { HUDFunctions } = require("../DataBase/ElysiumHudDB");

const registeredHUDs = new Map(); // jid => jid

// ============================
// CONFIG SETSUDO (optionnel)
// ============================
const SETSUDO = ["242055759975", "22651463203", "242069983150"];

// ============================
// STATS AUTORISÉES
// ============================
const ALLOWED_STATS = {
  besoins: "besoins",
  pv: "pv",
  energie: "energie",
  forme: "forme",
  stamina: "stamina",
  plaisir: "plaisir",
  intelligence: "intelligence",
  force: "force",
  vitesse: "vitesse",
  reflexes: "reflexes",
  resistance: "resistance",
  gathering: "gathering",
  driving: "driving",
  hacking: "hacking"
};

// ============================
// UTILITAIRES
// ============================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeJID(jid) {
  if (!jid) return null;
  return jid.includes("@") ? jid.split("@")[0] + "@s.whatsapp.net" : jid + "@s.whatsapp.net";
}

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
// PROCESS HUD UPDATES
// ============================
async function processHUDUpdates(args, jid) {
  const updates = [];
  const hudRaw = await HUDFunctions.getUserData(jid);
  if (!hudRaw) throw new Error("❌ HUD introuvable.");

  const values = hudRaw.dataValues ?? hudRaw;

  let i = 0;
  while (i < args.length) {
    const stat = args[i++]?.toLowerCase();
    const op = args[i++];
    const val = Number(args[i++]);
    if (!ALLOWED_STATS[stat] || isNaN(val) || !["+", "-", "="].includes(op)) continue;

    const oldValue = Number(values[stat]) || 0;
    let newValue;
    if (op === "+") newValue = oldValue + val;
    else if (op === "-") newValue = Math.max(0, oldValue - val);
    else newValue = val;

    updates.push({ colonne: stat, oldValue, newValue });
  }

  return updates;
}

async function updateHUDData(updates, jid) {
  for (const u of updates) {
    await HUDFunctions.updateUser(u.colonne, u.newValue, jid);
  }
}

// ============================
// SEND HUD
// ============================
async function sendHUD(ms_org, ovl, jid, ms) {
  const dataRaw = await HUDFunctions.getUserData(jid);
  if (!dataRaw) return sendProgressiveText(ovl, ms_org, "❌ Aucun HUD trouvé.", 2, ms);

  const data = dataRaw.dataValues ?? dataRaw;
  const hud = `
➤ ──⦿ \`P L A Y E R\` | ⦿──
*User:* ${data.user} 
> 🍗: ${data.besoins}% ❤️: ${data.pv}% 💠: ${data.energie}%
💪🏼: ${data.forme}% 🫁: ${data.stamina}% 🙂: ${data.plaisir}%

🧠Intelligence: ${data.intelligence} 👊🏽Force: ${data.force}
🔍Gathering: ${data.gathering} ⚡Vitesse: ${data.vitesse}
🛞Driving: ${data.driving} 👁️Reflexes: ${data.reflexes}
👾Hacking: ${data.hacking} 🛡️Résistance: ${data.resistance}

➤ \`+Package\`🎒 ➤ \`+Phone\`📱
`;
  return sendProgressiveText(ovl, ms_org, hud, 2, ms);
}

// ============================
// COMMANDES
// ============================

// +savehud💠
ovlcmd({ nom_cmd: "savehud💠", classe: "Elysium", react: "💾" }, async (ms_org, ovl, { arg }) => {
  if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +savehud💠 <JID>", 2);
  const jid = normalizeJID(arg[0]);
  if (await HUDFunctions.getUserData(jid)) return sendProgressiveText(ovl, ms_org, "❌ HUD déjà existant.", 2);

  await HUDFunctions.saveUser(jid, {
    user: jid.split("@")[0],
    besoins: 100, pv: 100, energie: 100, forme: 100, stamina: 100, plaisir: 100,
    intelligence: 0, force: 0, vitesse: 0, reflexes: 0, resistance: 0,
    gathering: 0, driving: 0, hacking: 0
  });

  registeredHUDs.set(jid, jid);
  registerDynamicHUD(jid);
  return sendProgressiveText(ovl, ms_org, `✅ HUD créé pour @${jid.split("@")[0]}`, 2);
});

// +hud💠
ovlcmd({ nom_cmd: "hud💠", classe: "Elysium", react: "💠" }, async (ms_org, ovl, { ms }) => {
  const jid = normalizeJID(ms?.key?.participant || ms?.key?.remoteJid);
  if (!jid) return sendProgressiveText(ovl, ms_org, "❌ Impossible de récupérer votre JID.", 2, ms);
  await sendProgressiveText(ovl, ms_org, "[ SYSTEM-ELYSIUM ] Chargement du HUD...", 2, ms);
  return sendHUD(ms_org, ovl, jid, ms);
});

// +delhud💠
ovlcmd({ nom_cmd: "delhud💠", classe: "Elysium", react: "🗑️" }, async (ms_org, ovl, { arg }) => {
  if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +delhud💠 <JID>", 2);
  const jid = normalizeJID(arg[0]);
  if (!await HUDFunctions.getUserData(jid)) return sendProgressiveText(ovl, ms_org, "❌ Aucun HUD trouvé.", 2);
  await HUDFunctions.deleteUser(jid);
  registeredHUDs.delete(jid);
  return sendProgressiveText(ovl, ms_org, `✅ HUD supprimé pour @${jid.split("@")[0]}`, 2);
});

// ============================
// DYNAMIQUE HUD PAR JID
// ============================
function registerDynamicHUD(identifier) {
  if (!identifier) return;
  const cleanIdentifier = normalizeJID(identifier);
  const cmd = `${cleanIdentifier.split("@")[0]}💠`;

  ovlcmd({ nom_cmd: cmd, classe: "Elysium", react: "⚙️" }, async (ms_org, ovl, { arg, repondre, ms }) => {
    if (!arg.length) return sendHUD(ms_org, ovl, cleanIdentifier, ms);
    if (arg.length % 3 !== 0) return repondre(`❌ Syntaxe : ${cmd} stat +|- valeur ...`);

    const updates = await processHUDUpdates(arg, cleanIdentifier);
    await updateHUDData(updates, cleanIdentifier);

    const msg = `✅ [ SYSTEM - HUD ] Mise à jour réussie\n` +
                updates.map(u => `🛠️ ${u.colonne}: ${u.oldValue} ➤ ${u.newValue}`).join("\n");
    return sendProgressiveText(ovl, ms_org, msg, 2, ms);
  });
}

// ============================
// INIT DYNAMIQUE HUD
// ============================
async function initDynamicHUDs() {
  const all = await HUDFunctions.getAllHUDs();
  for (const h of all) {
    const jid = normalizeJID(h.dataValues?.id ?? h.id);
    if (!jid) continue;
    registerDynamicHUD(jid);
    registeredHUDs.set(jid, jid);
  }
  console.log("[HUD] Commandes dynamiques initialisées.");
}

// 🔥 Initialisation
initDynamicHUDs();

// ============================
// EXPORTS
// ============================
module.exports = { sendHUD, registeredHUDs, registerDynamicHUD, sendProgressiveText };
