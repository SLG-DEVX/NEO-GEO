const { ovlcmd } = require("../lib/ovlcmd");
const { HUDFunctions } = require("../DataBase/ElysiumHudDB");

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
// UTILITAIRES (COPIE FICHES)
// ============================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function sendProgressiveText(ovl, ms_org, text, speed = 2, ms = null) {
  let current = "";
  const { key } = await ovl.sendMessage(ms_org, { text: "|" }, ms ? { quoted: ms } : {});
  for (let i = 0; i < text.length; i++) {
    current += text[i];
    if ((i + 1) % 5 === 0 || i === text.length - 1) {
      await ovl.sendMessage(ms_org, { text: current + " |", edit: key });
    }
    await sleep(speed);
  }
  await ovl.sendMessage(ms_org, { text: current, edit: key });
}

// ============================
// UPDATE HUD DATA
// ============================
async function updateHUDData(updates, jid) {
  for (const u of updates) {
    await HUDFunctions.setHUD(u.colonne, u.newValue, jid);
  }
}

// ============================
// PROCESS MULTI UPDATES (COPIE FICHES)
// ============================
async function processHUDUpdates(args, jid) {
  const updates = [];

  const hudRaw = await HUDFunctions.getHUD({ jid });
  if (!hudRaw) throw new Error("❌ HUD introuvable.");

  const values = hudRaw.dataValues ?? hudRaw;

  let i = 0;
  while (i < args.length) {
    const stat = args[i++]?.toLowerCase();
    const signe = args[i++];
    const valeur = Number(args[i++]);

    if (!ALLOWED_STATS[stat]) throw new Error(`❌ Stat inconnue : ${stat}`);
    if (!["+","-","="].includes(signe)) throw new Error(`❌ Signe invalide`);
    if (isNaN(valeur)) throw new Error(`❌ Valeur invalide`);

    const oldValue = Number(values[stat]) || 0;
    let newValue;

    if (signe === "+") newValue = oldValue + valeur;
    else if (signe === "-") newValue = Math.max(0, oldValue - valeur);
    else newValue = valeur;

    updates.push({ colonne: stat, oldValue, newValue });
  }

  return updates;
}

// ============================
// SEND HUD
// ============================
async function sendHUD(ms_org, ovl, jid, ms) {
  const dataRaw = await HUDFunctions.getHUD({ jid });
  if (!dataRaw) {
    return ovl.sendMessage(ms_org, { text: "❌ HUD introuvable." }, ms ? { quoted: ms } : {});
  }

  const d = dataRaw.dataValues ?? dataRaw;

  const hud = `
➤ ──⦿ \`HUD ELYSIUM\` ⦿──
*User:* ${d.user}

🍗 Besoins: ${d.besoins}%   ❤️ PV: ${d.pv}%   ⚡ Énergie: ${d.energie}%
💪 Forme: ${d.forme}%   🫁 Stamina: ${d.stamina}%   🙂 Plaisir: ${d.plaisir}%

🧠 Intelligence: ${d.intelligence}
👊 Force: ${d.force}
⚡ Vitesse: ${d.vitesse}
👁️ Réflexes: ${d.reflexes}
🛡️ Résistance: ${d.resistance}

🔍 Gathering: ${d.gathering}
🛞 Driving: ${d.driving}
👾 Hacking: ${d.hacking}
`;

  return ovl.sendMessage(ms_org, { text: hud }, ms ? { quoted: ms } : {});
}

// ============================
// COMMANDES
// ============================

// +hud💠
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { auteur_Message, arg, ms }) => {
  const jid = (arg[0] || auteur_Message).replace("@s.whatsapp.net", "") + "@s.whatsapp.net";

  await sendProgressiveText(ovl, ms_org, "💠 Chargement du HUD ♻️ ...", 2, ms);
  await sendHUD(ms_org, ovl, jid, ms);
});

// +addhud💠
ovlcmd({
  nom_cmd: "addhud💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { arg, auteur_Message }) => {
  if (!SETSUDO.includes(auteur_Message.split("@")[0])) {
    return sendProgressiveText(ovl, ms_org, "❌ Seul un setsudo peut créer un HUD.", 2);
  }

  const jid = arg[0]?.replace("@s.whatsapp.net", "") + "@s.whatsapp.net";
  if (!jid) return;

  const exists = await HUDFunctions.getHUD({ jid });
  if (exists) {
    return sendProgressiveText(ovl, ms_org, "❌ HUD déjà existant.", 2);
  }

  await HUDFunctions.addHUD(jid, {
    user: jid.replace("@s.whatsapp.net", "")
  });

  return sendProgressiveText(ovl, ms_org, "✅ HUD créé avec succès.", 2);
});

// +deletehud💠
ovlcmd({
  nom_cmd: "delhud💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { arg, auteur_Message }) => {

  if (!SETSUDO.includes(auteur_Message.split("@")[0])) {
    return sendProgressiveText(
      ovl,
      ms_org,
      "❌ Seul un setsudo peut supprimer un HUD.",
      2
    );
  }

  const jid = arg[0]?.replace("@s.whatsapp.net", "") + "@s.whatsapp.net";
  if (!arg[0]) {
    return sendProgressiveText(
      ovl,
      ms_org,
      "❌ JID manquant.",
      2
    );
  }

  const hud = await HUDFunctions.getHUD({ jid });
  if (!hud) {
    return sendProgressiveText(
      ovl,
      ms_org,
      "❌ HUD introuvable.",
      2
    );
  }

  await HUDFunctions.deleteHUD({ jid });

  return sendProgressiveText(
    ovl,
    ms_org,
    `🗑️ HUD supprimé avec succès : ${jid.replace("@s.whatsapp.net", "")}`,
    2
  );
});

// ============================
// COMMANDE DYNAMIQUE (COPIE FICHES)
// ============================
function registerDynamicHUD(identifier) {
  const clean = identifier.replace(/💠/g, "");
  const cmd = `${clean}hud💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "⚙️"
  }, async (ms_org, ovl, { arg }) => {
    const jid = clean + "@s.whatsapp.net";

    if (arg.length % 3 !== 0) {
      return sendProgressiveText(ovl, ms_org, "❌ Syntaxe invalide.", 2);
    }

    const updates = await processHUDUpdates(arg, jid);
    await updateHUDData(updates, jid);

    const msg =
      `✅ HUD mis à jour\n\n` +
      updates.map(u => `🛠️ ${u.colonne} : ${u.oldValue} ➤ ${u.newValue}`).join("\n");

    await sendProgressiveText(ovl, ms_org, msg, 2);
  });
}

// ============================
// INIT GLOBAL (COPIE FICHES)
// ============================
async function initElysiumHUD() {
  const all = await HUDFunctions.getAllHUDs();

  for (const h of all) {
    const d = h.dataValues ?? h;
    if (!d.jid || !d.user) continue;

    registerDynamicHUD(d.user);
    registerDynamicHUD(d.jid.replace("@s.whatsapp.net", ""));
  }

  console.log("[HUD] Initialisation complète");
}

// 🔥 APPEL UNIQUE
initElysiumHUD();
