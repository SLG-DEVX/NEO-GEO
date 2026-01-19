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
async function sendHUD(
  ms_org,
  ovl,
  jid,
  ms
) {
  const dataRaw = await HUDFunctions.getUserData(jid);

  if (!dataRaw) {
    return ovl.sendMessage(
      ms_org,
      { text: "❌ HUD introuvable." },
      ms ? { quoted: ms } : {}
    );
  }

  const data = dataRaw.dataValues ?? dataRaw;

  // Valeurs par défaut (sécurité)
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

  // Envoi FINAL 
  return ovl.sendMessage(
    ms_org,
    { text: hud },
    ms ? { quoted: ms } : {}
  );
}
// ============================
// COMMANDES
// ============================
// +savehud💠
ovlcmd(
  {
    nom_cmd: "savehud💠",
    classe: "Elysium",
    react: "💾"
  },
  async (ms_org, ovl, { arg, auteur_Message }) => {

    // ✅ Vérification SETSUDO
    if (!SETSUDO.includes(auteur_Message.split("@")[0])) {
      return sendProgressiveText(
        ovl,
        ms_org,
        "❌ Seul un setsudo peut créer un HUD avec +savehud💠.",
        2
      );
    }

    // ❌ Syntaxe
    if (arg.length < 1) {
      return sendProgressiveText(
        ovl,
        ms_org,
        "❌ Syntaxe : +savehud💠 <jid>",
        2
      );
    }

    const jid = normalizeJID(arg[0]);
    if (!jid) {
      return sendProgressiveText(
        ovl,
        ms_org,
        "❌ JID invalide.",
        2
      );
    }

    // 🔍 Vérification HUD existant
    const existing = await HUDFunctions.getUserData(jid);
    if (existing) {
      return sendProgressiveText(
        ovl,
        ms_org,
        `❌ Le HUD du joueur @${jid.split("@")[0]} existe déjà.`,
        2
      );
    }

    // ⏳ Message système
    await sendProgressiveText(
      ovl,
      ms_org,
      "💠 [ SYSTEM-ELYSIUM ] Initialisation du HUD joueur ♻️ ...",
      2
    );

    // 💾 Création HUD par défaut
    await HUDFunctions.addHUD(jid, {
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

    return sendProgressiveText(
      ovl,
      ms_org,
      `✅ HUD créé pour @${jid.split("@")[0]}`,
      2
    );
  }
);

// +hud💠
ovlcmd(
  {
    nom_cmd: "hud💠",
    classe: "Elysium",
    react: "💠"
  },
  async (
    ms_org,
    ovl,
    {
      auteur_Message,
      arg,
      ms
    }
  ) => {

    let targetJid;

    if (arg[0]) {
      targetJid = arg[0];
    } else {
      targetJid = auteur_Message;
    }

    const jid = normalizeJID(
      targetJid
    );

    if (!jid) {
      return sendProgressiveText(
        ovl,
        ms_org,
        "❌ JID invalide.",
        2,
        ms
      );
    }

    await sendProgressiveText(
      ovl,
      ms_org,
      "💠 [ SYSTEM - HUD ] Chargement du HUD ♻️ ...",
      2,
      ms
    );

    return sendHUD(
      ms_org,
      ovl,
      jid,
      ms
    );
  }
);

// +delhud💠
ovlcmd(
  {
    nom_cmd: "delhud💠",
    classe: "Elysium",
    react: "🗑️"
  },
  async (ms_org, ovl, { arg, repondre }) => {

    // ❌ Syntaxe
    if (!arg.length) {
      return repondre("❌ Syntaxe : +delhud💠 @jid");
    }

    const jidToDelete = normalizeJID(arg[0]);
    if (!jidToDelete) {
      return repondre("❌ JID invalide.");
    }

    // 🔍 Vérification HUD existant
    const hud = await HUDFunctions.getUserData(jidToDelete);
    if (!hud) {
      return repondre("❌ Aucun HUD trouvé pour ce joueur.");
    }

    // ⏳ Message système
    await sendProgressiveText(
      ovl,
      ms_org,
      "💠 [ SYSTEM-ELYSIUM ] Suppression du HUD joueur ♻️ ...",
      2
    );

    // 🗑️ Suppression HUD
    await HUDFunctions.deleteHUD(jidToDelete);

    return repondre(
      `✅ HUD supprimé pour @${jidToDelete.split("@")[0]}`
    );
  }
);

// ============================
// DYNAMIQUE HUD PAR JID
// ============================
function registerDynamicHUDCommand(identifier) {
  if (!identifier) return;

  const cleanIdentifier = identifier.replace(/💠/g, "");
  const cmd = `${cleanIdentifier.toLowerCase()}hud💠`;

  ovlcmd(
    {
      nom_cmd: cmd,
      classe: "Elysium",
      react: "⚙️"
    },
    async (ms_org, ovl, { repondre, arg }) => {
      try {
        if (!arg.length) {
          return repondre(
            `❌ Syntaxe : +${cleanIdentifier}hud💠 stat +|- valeur ...`
          );
        }

        // 🔹 Résolution JID (EXACTEMENT comme fiche)
        let targetJid;

        if (/^\d+$/.test(cleanIdentifier) || cleanIdentifier.includes("@")) {
          targetJid = cleanIdentifier.includes("@")
            ? cleanIdentifier
            : cleanIdentifier + "@s.whatsapp.net";
        } else {
          const allPlayers = await PlayerFunctions.getAllPlayers();
          const playerMatch = allPlayers.find(p => {
            const data = p.dataValues ?? p;
            return (
              data.user?.replace(/💠/g, "").toLowerCase() ===
              cleanIdentifier.toLowerCase()
            );
          });

          if (!playerMatch) return repondre("❌ Joueur introuvable.");
          targetJid = (playerMatch.dataValues ?? playerMatch).jid;
        }

        const hud = await HUDFunctions.getUserData(targetJid);
        if (!hud) return repondre("❌ HUD introuvable.");

        // 🔹 Vérif syntaxe stats HUD
        if (arg.length % 3 !== 0) {
          return repondre(
            `❌ Syntaxe : +${cleanIdentifier}hud💠 stat +|- valeur ...`
          );
        }

        const updates = await processHUDUpdates(arg, targetJid);
        await updateHUDData(updates, targetJid, ovl, ms_org);

        const message =
          `✅ [ SYSTEM - ELYSIUM ] HUD mis à jour\n\n` +
          updates
            .map(
              u => `🛠️ ${u.colonne} : ${u.oldValue} ➤ ${u.newValue}`
            )
            .join("\n");

        await sendProgressiveText(
          ovl,
          ms_org,
          message,
          2
        );

      } catch (err) {
        console.error(`[${cleanIdentifier}hud💠]`, err);
        await sendProgressiveText(
          ovl,
          ms_org,
          "❌ [ SYSTEM - ELYSIUM ] Erreur interne.",
          2
        );
      }
    }
  );
}

// ============================
// INIT DYNAMIQUE HUD
// ============================
async function initDynamicHUDs() {
  const all = await HUDFunctions.getAllHUDs();
  for (const h of all) {
    const jid = normalizeJID(h.dataValues?.jid ?? h.jid); // ✅ utilise jid
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
