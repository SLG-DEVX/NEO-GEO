const { ovlcmd } = require("../lib/ovlcmd");
const { HUDFunctions } = require("../DataBase/ElysiumHudDB");

const registeredHUDs = new Map(); // jid => true

// ============================
// CONFIG SETSUDO
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

function normalizeJID(jid) {
  if (!jid) return null;
  return jid.includes("@") ? jid.split("@")[0] + "@s.whatsapp.net" : jid + "@s.whatsapp.net";
}

// ============================
// PROCESS HUD UPDATES
// ============================
async function processUpdates(args, jid) {
  const updates = [];
  const hudRaw = await HUDFunctions.getUserData(jid);
  if (!hudRaw) throw new Error("❌ HUD introuvable.");

  const values = hudRaw.dataValues ?? hudRaw;

  let i = 0;
  while (i < args.length) {
    const stat = args[i++]?.toLowerCase();
    const op = args[i++];
    const val = args[i++];
    if (!ALLOWED_STATS[stat] || !["+", "-", "="].includes(op)) continue;
    const oldValue = Number(values[stat]) || 0;
    let newValue;
    if (op === "+") newValue = oldValue + Number(val);
    else if (op === "-") newValue = Math.max(0, oldValue - Number(val));
    else newValue = Number(val);
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
  if (!dataRaw) return ovl.sendMessage(ms_org, { text: "❌ HUD introuvable." }, ms ? { quoted: ms } : {});
  const data = dataRaw.dataValues ?? dataRaw;

  const hud = `
➤ ──⦿ \`P L A Y E R\` | ⦿──
*User:* ${data.user}

🍗Besoins: ${data.besoins}%   ❤️PV: ${data.pv}%   💠Énergie: ${data.energie}%
💪Forme: ${data.forme}%   🫁Stamina: ${data.stamina}%   🙂Plaisir: ${data.plaisir}%

🧠 Intelligence: ${data.intelligence}
👊 Force: ${data.force}
⚡ Vitesse: ${data.vitesse}
👁️ Réflexes: ${data.reflexes}
🛡️ Résistance: ${data.resistance}

🔍 Gathering: ${data.gathering}
🛞 Driving: ${data.driving}
👾 Hacking: ${data.hacking}

➤ \`+Package\` 🎒   ➤ \`+Phone\` 📱
`;

  return ovl.sendMessage(ms_org, { text: hud }, ms ? { quoted: ms } : {});
}

// ============================
// COMMANDES
// ============================

// +addhud💠
ovlcmd({
  nom_cmd: "addhud💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { arg, auteur_Message }) => {
  if (!SETSUDO.includes(auteur_Message.split("@")[0])) return sendProgressiveText(ovl, ms_org, "❌ Seul un setsudo peut créer un HUD.", 2);
  if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +addhud💠 <jid>", 2);

  const jid = normalizeJID(arg[0]);
  if (!jid) return sendProgressiveText(ovl, ms_org, "❌ JID invalide.", 2);

  const existing = await HUDFunctions.getUserData(jid);
  if (existing) return sendProgressiveText(ovl, ms_org, `❌ HUD existe déjà pour @${jid.split("@")[0]}`, 2);

  await HUDFunctions.saveUser(jid, {
    jid,
    user: jid.replace("@s.whatsapp.net", ""),
    besoins: 100, pv: 100, energie: 100, forme: 100,
    stamina: 100, plaisir: 50,
    intelligence: 0, force: 0, vitesse: 0,
    reflexes: 0, resistance: 0,
    gathering: 0, driving: 0, hacking: 0
  });

  registeredHUDs.set(jid, true);
  return sendProgressiveText(ovl, ms_org, `✅ HUD créé pour @${jid.split("@")[0]}`, 2);
});

// +hud💠
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { arg, auteur_Message, ms }) => {
  const jid = normalizeJID(arg[0] || auteur_Message);
  return sendHUD(ms_org, ovl, jid, ms);
});

// +delhud💠
ovlcmd({
  nom_cmd: "delhud💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { arg, repondre }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +delhud💠 <jid>");
  const jid = normalizeJID(arg[0]);
  if (!jid) return repondre("❌ JID invalide.");
  const hud = await HUDFunctions.getUserData(jid);
  if (!hud) return repondre("❌ Aucun HUD trouvé.");

  await HUDFunctions.deleteUser(jid);
  registeredHUDs.delete(jid);
  return repondre(`✅ HUD supprimé pour @${jid.split("@")[0]}`);
});

// ============================
// DYNAMIQUE
// ============================
function registerDynamicHUD(identifier) {
  if (!identifier) return;
  const clean = identifier.replace(/💠/g, "");
  const cmd = `${clean.toLowerCase()}hud💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "⚙️"
  }, async (ms_org, ovl, { repondre, arg }) => {
    try {
      if (!arg.length) return repondre(`❌ Syntaxe : +${clean}hud💠 stat +|- valeur ...`);
      let jid = normalizeJID(clean.includes("@") ? clean : clean + "@s.whatsapp.net");
      const hud = await HUDFunctions.getUserData(jid);
      if (!hud) return repondre("❌ HUD introuvable.");
      if (arg.length % 3 !== 0) return repondre(`❌ Syntaxe : +${clean}hud💠 stat +|- valeur ...`);

      const updates = await processUpdates(arg, jid);
      await updateHUDData(updates, jid);

      const msg = `✅ HUD mis à jour\n` +
        updates.map(u => `🛠️ ${u.colonne} : ${u.oldValue} ➤ ${u.newValue}`).join("\n");

      await sendProgressiveText(ovl, ms_org, msg, 2);
    } catch (err) {
      console.error(`[${clean}hud💠]`, err);
      await sendProgressiveText(ovl, ms_org, "❌ Erreur interne.", 2);
    }
  });
}

// ============================
// INIT DYNAMIQUE
// ============================
async function initDynamicHUDs() {
  try {
    const allHUDs = await HUDFunctions.getAllHUDs();
    for (const h of allHUDs) {
      const jid = normalizeJID(h.dataValues?.jid ?? h.jid);
      registeredHUDs.set(jid, true);
      registerDynamicHUD(jid);
    }
    console.log("✔ [HUD] Commandes dynamiques initialisées");
  } catch (err) {
    console.error("[HUD INIT ERROR]", err);
  }
}

// 🔥 Initialisation à l'import
initDynamicHUDs();

module.exports = { sendHUD, registeredHUDs, registerDynamicHUD, sendProgressiveText };
