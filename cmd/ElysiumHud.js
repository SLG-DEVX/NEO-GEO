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

  if (!dataRaw) {
    return ovl.sendMessage(ms_org, { text: "❌ HUD introuvable." }, ms ? { quoted: ms } : {});
  }

  const data = dataRaw.dataValues ?? dataRaw;

  // Valeurs par défaut
  data.user ||= jid.replace("@s.whatsapp.net", "");
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
// COMMANDES HUD
// ============================
// +savehud💠
ovlcmd({
  nom_cmd: "savehud💠",
  classe: "Elysium",
  react: "💾"
}, async (ms_org, ovl, { arg, auteur_Message }) => {
  try {
    // ✅ Vérification SETSUDO
    if (!SETSUDO.includes(auteur_Message.split("@")[0])) {
      return sendProgressiveText(ovl, ms_org, "❌ Seul un setsudo peut créer un HUD.", 2);
    }

    // ❌ Vérifie la syntaxe
    if (!arg.length) return sendProgressiveText(ovl, ms_org, "❌ Syntaxe : +savehud💠 <jid>", 2);

    const jid = normalizeJID(arg[0]);
    if (!jid) return sendProgressiveText(ovl, ms_org, "❌ JID invalide.", 2);

    // 🔍 Vérification HUD existant
    const existingHUD = await HUDFunctions.getUserData(jid);
    if (existingHUD) {
      return sendProgressiveText(ovl, ms_org, `❌ HUD pour @${jid.split("@")[0]} existe déjà.`, 2);
    }

    // ⏳ Message système
    await sendProgressiveText(ovl, ms_org, "💠 Initialisation du HUD ♻️ ...", 2);

    // 💾 Création HUD par défaut
    const newHUD = await HUDFunctions.saveUser(jid, {
      jid,
      user: jid.replace("@s.whatsapp.net", ""),
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

    if (!newHUD) {
      return sendProgressiveText(ovl, ms_org, `❌ HUD pour @${jid.split("@")[0]} existe déjà.`, 2);
    }

    // ✅ Ajout à la liste dynamique
    registeredHUDs.set(jid, true);

    // ✅ Confirmation
    return sendProgressiveText(ovl, ms_org, `✅ HUD créé pour @${jid.split("@")[0]}`, 2);

  } catch (err) {
    console.error("[+savehud💠] Exception:", err);
    return sendProgressiveText(ovl, ms_org, "❌ Erreur interne lors de la création du HUD.", 2);
  }
}); 

// +hud💠
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { auteur_Message, arg, ms }) => {
  const targetJid = normalizeJID(arg[0] || auteur_Message);
  if (!targetJid) return sendProgressiveText(ovl, ms_org, "❌ JID invalide.", 2, ms);

  await sendProgressiveText(ovl, ms_org, "💠 Chargement du HUD ♻️ ...", 2, ms);
  return sendHUD(ms_org, ovl, targetJid, ms);
});

// +delhud💠
ovlcmd({
  nom_cmd: "delhud💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { arg, repondre }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +delhud💠 @jid");

  const jidToDelete = normalizeJID(arg[0]);
  if (!jidToDelete) return repondre("❌ JID invalide.");

  const hud = await HUDFunctions.getUserData(jidToDelete);
  if (!hud) return repondre("❌ Aucun HUD trouvé pour ce joueur.");

  await sendProgressiveText(ovl, ms_org, "💠 Suppression du HUD ♻️ ...", 2);

  await HUDFunctions.deleteHUD(jidToDelete);
  registeredHUDs.delete(jidToDelete);

  return repondre(`✅ HUD supprimé pour @${jidToDelete.split("@")[0]}`);
});

// ============================
// DYNAMIQUE HUD PAR JID / USERNAME
// ============================
function registerDynamicHUD(identifier) {
  if (!identifier) return;

  const cleanIdentifier = identifier.replace(/💠/g, "");
  const cmd = `${cleanIdentifier.toLowerCase()}hud💠`;

  ovlcmd({
    nom_cmd: cmd,
    classe: "Elysium",
    react: "⚙️"
  }, async (ms_org, ovl, { repondre, arg }) => {
    try {
      if (!arg.length) return repondre(`❌ Syntaxe : +${cleanIdentifier}hud💠 stat +|- valeur ...`);

      // 🔹 Résolution JID
      let targetJid;
      if (/^\d+$/.test(cleanIdentifier) || cleanIdentifier.includes("@")) {
        targetJid = cleanIdentifier.includes("@") ? cleanIdentifier : cleanIdentifier + "@s.whatsapp.net";
      } else {
        const allPlayers = await PlayerFunctions.getAllPlayers();
        const playerMatch = allPlayers.find(p => {
          const data = p.dataValues ?? p;
          return data.user?.replace(/💠/g, "").toLowerCase() === cleanIdentifier.toLowerCase();
        });
        if (!playerMatch) return repondre("❌ Joueur introuvable.");
        targetJid = (playerMatch.dataValues ?? playerMatch).jid;
      }

      const hud = await HUDFunctions.getUserData(targetJid);
      if (!hud) return repondre("❌ HUD introuvable.");

      // 🔹 Vérification syntaxe stats
      if (arg.length % 3 !== 0) return repondre(`❌ Syntaxe : +${cleanIdentifier}hud💠 stat +|- valeur ...`);

      const updates = await processHUDUpdates(arg, targetJid);
      await updateHUDData(updates, targetJid);

      const message = `✅ [SYSTEM] HUD mis à jour\n\n` +
        updates.map(u => `🛠️ ${u.colonne} : ${u.oldValue} ➤ ${u.newValue}`).join("\n");

      await sendProgressiveText(ovl, ms_org, message, 2);
    } catch (err) {
      console.error(`[${cleanIdentifier}hud💠]`, err);
      await sendProgressiveText(ovl, ms_org, "❌ Erreur interne.", 2);
    }
  });
}

// ============================
// INIT DYNAMIQUE HUD
// ============================
async function initDynamicHUDs() {
  try {
    const allHUD = await HUDFunctions.getAllHUDs();

    for (const h of allHUD) {
      const jid = normalizeJID(h.dataValues?.jid ?? h.jid);
      if (!jid) continue;
      // enregistre dynamiquement le HUD
      registerDynamicHUD(jid);
      registeredHUDs.set(jid, true);
    }

    console.log("[HUD] Commandes dynamiques initialisées.");
  } catch (err) {
    console.error("[HUD INIT ERROR]", err);
  }
}

// 🔥 Initialisation à l'import
initDynamicHUDs();

module.exports = { sendHUD, registeredHUDs, registerDynamicHUD, sendProgressiveText };
