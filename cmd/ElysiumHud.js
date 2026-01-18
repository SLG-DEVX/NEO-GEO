const { ovlcmd } = require("../lib/ovlcmd");
const { HUDFunctions } = require("../DataBase/ElysiumHudDB");
const { saveUser: saveHUD, deleteUser: delHUD, getUserData: getHUD, updateUser: updateHUD, getAllHUDs } = HUDFunctions;

const registeredHUDs = new Map(); // jid => jid

// ============================
// NORMALIZE JID
// ============================
function normalizeJID(jid) {
  if (!jid) return null;
  return jid.includes("@") ? jid.split("@")[0] + "@s.whatsapp.net" : jid + "@s.whatsapp.net";
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
// AFFICHAGE HUD
// ============================
async function sendHUD(ms_org, ovl, jid, ms) {
  const dataRaw = await getHUD(normalizeJID(jid));
  if (!dataRaw) return sendProgressiveText(ovl, ms_org, "❌ Aucun HUD trouvé pour ce joueur.", 2, ms);

  const data = dataRaw?.dataValues ?? dataRaw;
  const hud = `
➤ ──⦿ \`P L A Y E R\` | ⦿──
*User:* ${data.user} 
> 🍗: ${data.besoins}%    ❤️: ${data.pv}%   💠: ${data.energie}%
💪🏼: ${data.forme}%    🫁: ${data.stamina}%   🙂: ${data.plaisir}%

🧠Intelligence: ${data.intelligence}     👊🏽Force: ${data.force}
🔍Gathering: ${data.gathering}     ⚡Vitesse: ${data.vitesse}
🛞Driving: ${data.driving}        👁️Reflexes: ${data.reflexes}
👾Hacking: ${data.hacking}      🛡️Résistance: ${data.resistance}

➤ \`+Package\`🎒 ➤ \`+Phone\`📱
`;
  return sendProgressiveText(ovl, ms_org, hud, 2, ms);
}

// ============================
// COMMANDES HUD
// ============================

// +savehud💠
ovlcmd({
  nom_cmd: "savehud💠",
  classe: "Elysium",
  react: "💾"
}, async (ms_org, ovl, { arg }) => {
  if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +savehud💠 <JID>", 2);

  const targetJid = normalizeJID(arg[0].replace(/💠/g,""));
  const exists = await getHUD(targetJid);
  if (exists) return sendProgressiveText(ovl, ms_org, `❌ HUD déjà existant pour @${targetJid.split("@")[0]}`, 2);

  await saveHUD(targetJid, {
    besoins: 100, pv: 100, energie: 100, forme: 100, stamina: 100, plaisir: 100,
    intelligence: 0, force: 0, vitesse: 0, reflexes: 0, resistance: 0,
    gathering: 0, driving: 0, hacking: 0
  });

  registeredHUDs.set(targetJid, targetJid);
  registerDynamicHUD(targetJid);

  return sendProgressiveText(ovl, ms_org, `✅ HUD créé pour @${targetJid.split("@")[0]}`, 2);
});

// +hud💠
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { ms }) => {
  const rawJid = ms?.key?.participant || ms?.key?.remoteJid;
  const senderJid = normalizeJID(rawJid);
  if (!senderJid) return sendProgressiveText(ovl, ms_org, "❌ Impossible de récupérer votre JID.", 2, ms);

  await sendProgressiveText(ovl, ms_org, "[ SYSTEM-ELYSIUM ] Chargement du HUD...", 2, ms);
  return sendHUD(ms_org, ovl, senderJid, ms);
});

// +delhud💠
ovlcmd({
  nom_cmd: "delhud💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { arg }) => {
  if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +delhud💠 <JID>", 2);

  const targetJid = normalizeJID(arg[0].replace(/💠/g,""));
  const exists = await getHUD(targetJid);
  if (!exists) return sendProgressiveText(ovl, ms_org, `❌ Aucun HUD trouvé pour @${targetJid.split("@")[0]}`, 2);

  await delHUD(targetJid);
  registeredHUDs.delete(targetJid);
  return sendProgressiveText(ovl, ms_org, `✅ HUD supprimé pour @${targetJid.split("@")[0]}`, 2);
});

// ============================
// COMMANDES DYNAMIQUES
// ============================
function registerDynamicHUD(identifier) {
  if (!identifier) return;
  const cleanIdentifier = normalizeJID(identifier);
  const cmd = `${cleanIdentifier.split("@")[0]}💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "💠"
  }, async (ms_org, ovl, { arg, ms }) => {
    const targetJid = cleanIdentifier;
    const hudRaw = await getHUD(targetJid);
    if (!hudRaw) return sendProgressiveText(ovl, ms_org, "❌ Aucun HUD trouvé pour ce joueur.", 2, ms);

    if (!arg.length) return sendHUD(ms_org, ovl, targetJid, ms);

    // Process updates
    const updates = {};
    const modifiables = ["besoins","pv","energie","forme","stamina","plaisir","intelligence","force","vitesse","reflexes","resistance","gathering","driving","hacking"];
    for (let i = 0; i < arg.length;) {
      const field = arg[i]?.toLowerCase();
      const op = arg[i+1];
      const val = parseInt(arg[i+2], 10);
      if (!modifiables.includes(field) || !["+", "-", "="].includes(op) || isNaN(val)) { i++; continue; }
      if (op === "=") updates[field] = val;
      if (op === "+") updates[field] = (hudRaw[field] || 0) + val;
      if (op === "-") updates[field] = (hudRaw[field] || 0) - val;
      i += 3;
    }

    if (!Object.keys(updates).length) return sendProgressiveText(ovl, ms_org, "⚠️ Format incorrect. Ex: pv + 10 énergie - 5", 2, ms);

    await updateHUD(targetJid, updates);

    const msg = `✅ Mise à jour réussie pour @${targetJid.split("@")[0]}\n` +
                Object.entries(updates).map(([k,v]) => `🛠️ ${k} ➤ ${v}`).join("\n");
    return sendProgressiveText(ovl, ms_org, msg, 2, ms);
  });
}

// ============================
// INIT DYNAMIQUE
// ============================
async function initDynamicHUDs() {
  const all = await getAllHUDs();
  for (const h of all) {
    const data = h.dataValues ?? h;
    if (!data.id) continue;
    const jid = normalizeJID(data.id);
    registerDynamicHUD(jid);
    registeredHUDs.set(jid, jid);
  }
  console.log("[HUD] Initialisation dynamique terminée.");
}

initDynamicHUDs();

module.exports = { sendHUD, registeredHUDs, registerDynamicHUD, sendProgressiveText };
