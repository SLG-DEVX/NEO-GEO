const { ovlcmd } = require("../lib/ovlcmd");
const { HUDFunctions } = require("../DataBase/ElysiumHudDB");

const registeredHUDs = new Map();

const SETSUDO = [
  "242055759975",
  "22651463203",
  "242069983150"
];

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

// ================= UTILITAIRES =================
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

// ================= PROCESS HUD UPDATES =================
async function processUpdates(args, jid) {
  const updates = [];
  const hudRaw = await HUDFunctions.getUserData(jid);
  if (!hudRaw) throw new Error("❌ HUD introuvable.");
  const values = hudRaw.dataValues ?? hudRaw;

  for (let i = 0; i < args.length; i += 3) {
    const stat = args[i]?.toLowerCase();
    const op = args[i + 1];
    const val = Number(args[i + 2]);
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

// ================= SEND HUD =================
async function sendHUD(ms_org, ovl, jid, ms) {
  const dataRaw = await HUDFunctions.getUserData(jid);
  if (!dataRaw) return ovl.sendMessage(ms_org, { text: "❌ HUD introuvable." }, ms ? { quoted: ms } : {});
  const data = dataRaw.dataValues ?? dataRaw;

  // Valeurs par défaut si manquantes
  data.user ||= jid.split("@")[0];
  data.besoins ||= 0;
  data.pv ||= 0;
  data.energie ||= 0;
  data.forme ||= 0;
  data.stamina ||= 0;
  data.plaisir ||= 0;
  data.intelligence ||= 0;
  data.force ||= 0;
  data.vitesse ||= 0;
  data.reflexes ||= 0;
  data.resistance ||= 0;
  data.gathering ||= 0;
  data.driving ||= 0;
  data.hacking ||= 0;

  const hud = `
➤ ──⦿ \`P L A Y E R\` | ⦿──
*👤\`User\`:* ${data.user}

🍗: ${data.besoins}%   ❤️: ${data.pv}%   💠: ${data.energie}%
💪🏻: ${data.forme}%   🫁: ${data.stamina}%   🙂: ${data.plaisir}%
▔▔▔▔▔▔▔▔░░░ SKILLS📊
                              
🧠 Intelligence: ${data.intelligence}
🔍 Gathering: ${data.gathering}
🛞 Driving: ${data.driving}
👾 Hacking: ${data.hacking}
---------------------[ COMBAT
👊 Force: ${data.force}
⚡ Vitesse: ${data.vitesse}
👁️ Réflexes: ${data.reflexes}
🛡️ Résistance: ${data.resistance}

➤ \`+Package\` 🎒   ➤ \`+Phone\` 📱
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                              💠▯▯▯▯▯▯⎢⎢⎢⎢⎢
`;

  await sendProgressiveText(ovl, ms_org, "💠 Chargement du HUD ♻️ ...", 2, ms);
  return ovl.sendMessage(ms_org, { text: hud }, ms ? { quoted: ms } : {});
}

// ================= COMMANDES =================

// +addhud💠
ovlcmd({
  nom_cmd: "addhud💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { arg, auteur_Message }) => {
  try {
    if (!SETSUDO.includes(auteur_Message.split("@")[0]))
      return sendProgressiveText(ovl, ms_org, "❌ Seul un setsudo peut créer un HUD.", 2);

    if (arg.length < 2)
      return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +addhud💠 <jid> <username>", 2);

    const jid = normalizeJID(arg[0]);
    const username = arg.slice(1).join(" "); // Permet les noms avec espaces
    if (!jid) return sendProgressiveText(ovl, ms_org, "❌ JID invalide.", 2);

    const exists = await HUDFunctions.getUserData(jid);
    if (exists) return sendProgressiveText(ovl, ms_org, `❌ HUD existe déjà pour @${username}`, 2);

    await HUDFunctions.saveUser(jid, {
      jid,
      user: username,
      besoins: 100,
      pv: 100,
      energie: 100,
      forme: 100,
      stamina: 100,
      plaisir: 50,
      intelligence: 0,
      force: 0,
      vitesse: 0,
      reflexes: 0,
      resistance: 0,
      gathering: 0,
      driving: 0,
      hacking: 0
    });

    registeredHUDs.set(jid, true);
    return sendProgressiveText(ovl, ms_org, `✅ HUD créé pour @${username}`, 2);

  } catch (err) {
    console.error("[+addhud💠]", err);
    return sendProgressiveText(ovl, ms_org, "❌ Erreur interne lors de la création du HUD.", 2);
  }
});

// +hud💠
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { arg, auteur_Message, ms }) => {
  try {
    const jid = normalizeJID(arg[0] || auteur_Message);
    return sendHUD(ms_org, ovl, jid, ms);
  } catch (err) {
    console.error("[+hud💠]", err);
    return sendProgressiveText(ovl, ms_org, "❌ Erreur interne lors de l'affichage du HUD.", 2);
  }
});

// +delhud💠
ovlcmd({
  nom_cmd: "delhud💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { arg, repondre }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +delhud💠 <username>");
  
  const username = arg.join(" "); // Support noms avec espaces
  const clean = username.replace(/💠/g, ""); // Ignore le 💠 pour chercher le HUD

  // Cherche le HUD par username nettoyé
  const allHUDs = await HUDFunctions.getAllHUDs();
  const target = allHUDs.find(h => {
    const data = h.dataValues ?? h;
    return data.user.replace(/💠/g, "").toLowerCase() === clean.toLowerCase();
  });

  if (!target) return repondre("❌ Aucun HUD trouvé pour ce joueur.");

  const jid = target.dataValues?.jid ?? target.jid;

  await HUDFunctions.deleteUser(jid);
  registeredHUDs.delete(jid);

  return repondre(`✅ HUD supprimé pour @${target.dataValues?.user ?? target.user}`);
});

// ================= DYNAMIQUE =================
function registerDynamicHUD(identifier) {
  if (!identifier) return;

  const clean = identifier.replace(/💠/g, ""); // supprime les 💠 pour créer la commande
  const cmd = `${clean.toLowerCase()}hud💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "⚙️"
  }, async (ms_org, ovl, { repondre, arg }) => {
    try {
      if (!arg.length)
        return repondre(`❌ Syntaxe : +${clean}hud💠 stat +|- valeur ...`);

      // Récupération du JID par username, IGNORE le 💠
      const allHUDs = await HUDFunctions.getAllHUDs();
      const target = allHUDs.find(h => {
        const data = h.dataValues ?? h;
        return data.user.replace(/💠/g, "").toLowerCase() === clean.toLowerCase();
      });
      if (!target) return repondre("❌ Joueur introuvable.");

      const jid = target.dataValues?.jid ?? target.jid;
      if (arg.length % 3 !== 0)
        return repondre(`❌ Syntaxe : +${clean}hud💠 stat +|- valeur ...`);

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

// ================= INIT =================
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

initDynamicHUDs();

module.exports = {
  sendHUD,
  registeredHUDs,
  registerDynamicHUD,
  sendProgressiveText
};
