const { ovlcmd } = require("../lib/ovlcmd");
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

// ============================
// UTILITAIRES
// ============================
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveJid(arg, sender) {
  if (arg && arg.length && arg[0]) {
    return arg[0].replace(/[^\d]/g, "") + "@s.whatsapp.net";
  }
  if (sender && typeof sender === "object" && sender.id) return sender.id;
  if (typeof sender === "string") return sender;
  return null;
}

// ============================
// COMMANDE +elysiumme💠
// ============================
ovlcmd({
  nom_cmd: "elysiumme💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, arg, ms }) => {

  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID.");

  try {
    const data = await PlayerFunctions.getPlayer({ jid });
    if (!data) return repondre("❌ Aucune fiche trouvée.");

    data.cyberwares = data.cyberwares || "";
    data.oc_url = data.oc_url || "";

    const cyberwaresCount = data.cyberwares
      ? data.cyberwares.split("\n").filter(c => c.trim()).length
      : 0;

    if (!arg.length) {
      const fiche = `➤ ──⦿ P L A Y E R | ⦿──

🫆Pseudo:  ➤ ${data.pseudo}
🫆User:    ➤ ${data.user}
⏫Exp:     ➤ ${data.exp}/4000 \`XP\`
🔰Niveau:  ➤ ${data.niveau} ▲
🎖️Rang:   ➤ ${data.rang}

💲ECash:       ➤ ${data.ecash} \`E¢\`
🌟Lifestyle:  ➤ ${data.lifestyle} 🌟
⭐Charisme:   ➤ ${data.charisme} ⭐
🫱🏼‍🫲🏽Réputation: ➤ ${data.reputation} 🫱🏼‍🫲🏽

░▒▒▒▒░ \`C Y B E R W A R E S\` 💠
🩻Cyberwares : (Total) ➤ ${cyberwaresCount}
➤ ${data.cyberwares.split("\n").join(" • ") || "-"}

░▒▒▒▒░░▒░ \`S T A T S\` 💠
✅Missions: ➤ ${data.missions} ✅
❌Game over: ➤ ${data.gameover} ❌
🏆Elysium Games PVP: ➤ ${data.pvp} 🏆

👊🏽Points combat:     ➤ ${data.points_combat}
🪼Points chasse:      ➤ ${data.points_chasse}/4000 🪼
🪸Points récoltes:    ➤ ${data.points_recoltes}/4000 🪸
👾Points Hacking:     ➤ ${data.points_hacking}/4000 👾
🏁Points conduite:    ➤ ${data.points_conduite}/4000 🏁
🌍Points Exploration: ➤ ${data.points_exploration}/4000 🌍

░▒░▒░ \`A C H I E V M E N T S\` 💠
🏆Trophies: ${data.trophies} 🏆`;

      const payload = data.oc_url ? { image: { url: data.oc_url } } : {};
      return ovl.sendMessage(ms_org, { ...payload, caption: fiche }, { quoted: ms || ms_org });
    }

  } catch (err) {
    console.error("[ELYME]", err);
    return repondre("❌ Une erreur est survenue.");
  }
});

// ============================
// SYSTEME UPDATE
// ============================
async function processUpdates(args, jid) {
  const updates = [];
  const data = await PlayerFunctions.getPlayer({ jid });
  const columns = Object.keys(data.dataValues || data);

  let i = 0;
  while (i < args.length) {
    const object = args[i++];
    const signe = args[i++];

    let texte = [];
    while (
      i < args.length &&
      !['+', '-', '=', 'add', 'supp'].includes(args[i]) &&
      !columns.includes(args[i])
    ) {
      texte.push(args[i++]);
    }

    if (!columns.includes(object)) {
      throw new Error(`❌ La colonne '${object}' n'existe pas.`);
    }

    const oldValue = data[object];
    let newValue;

    if (object === "cyberwares") {
      let list = (oldValue || "").split("\n").filter(x => x.trim());
      const items = texte.join(" ").split(",").map(x => x.trim()).filter(Boolean);

      if (signe === "+") {
        for (const item of items) {
          if (!list.some(c => normalizeText(c) === normalizeText(item))) list.push(item);
        }
      } else if (signe === "-") {
        const rm = items.map(normalizeText);
        list = list.filter(c => !rm.includes(normalizeText(c)));
      } else if (signe === "=") {
        list = items;
      } else throw new Error("❌ cyberwares accepte uniquement '+', '-' ou '='");

      updates.push({ colonne: object, oldValue, newValue: list.join("\n") });
      continue;
    }

    if (signe === "+" || signe === "-") {
      const n1 = Number(oldValue) || 0;
      const n2 = Number(texte.join(" ")) || 0;
      newValue = signe === "+" ? n1 + n2 : n1 - n2;
    } else if (signe === "=") {
      newValue = texte.join(" ");
    } else if (signe === "add") {
      newValue = (oldValue + " " + texte.join(" ")).trim();
    } else if (signe === "supp") {
      const regex = new RegExp(normalizeText(texte.join(" ")), "gi");
      newValue = normalizeText(oldValue).replace(regex, "").trim();
    } else {
      throw new Error(`❌ Signe non reconnu : ${signe}`);
    }

    updates.push({ colonne: object, oldValue, newValue });
  }

  return updates;
}

async function updatePlayerData(updates, jid) {
  for (const u of updates) {
    await PlayerFunctions.setPlayer(u.colonne, u.newValue, jid);
  }
}

// ============================
// COMMANDE +oc💠
// ============================
ovlcmd({
  nom_cmd: "oc💠",
  classe: "Elysium",
  react: "🖼️"
}, async (ms_org, ovl, { repondre, arg }) => {
  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID.");

  try {
    const updates = await processUpdates(arg.slice(1), jid);
    await updatePlayerData(updates, jid);
    return repondre("✅ Image/GIF du joueur mise à jour !");
  } catch (err) {
    console.error("[OC💠]", err);
    return repondre("❌ Erreur lors de la mise à jour du OC.");
  }
});

// ============================
// COMMANDE +add💠
// ============================
ovlcmd({
  nom_cmd: "add💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +add💠 @tag");

  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ JID invalide.");

  const existing = await PlayerFunctions.getPlayer({ jid });
  if (existing) return repondre("❌ Ce joueur possède déjà une fiche.");

  await PlayerFunctions.addPlayer(jid, {
    pseudo: "Nouveau Joueur",
    user: arg[0],
    exp: 0,
    niveau: 1,
    rang: "Novice🥉",
    ecash: 50000,
    lifestyle: 0,
    charisme: 0,
    reputation: 0,
    cyberwares: "",
    missions: 0,
    gameover: 0,
    pvp: 0,
    points_combat: 0,
    points_chasse: 0,
    points_recoltes: 0,
    points_hacking: 0,
    points_conduite: 0,
    points_exploration: 0,
    trophies: 0,
    oc_url: ""
  });

  return repondre(`✅ Fiche créée pour le joueur : ${arg[0]} (JID : ${jid})`);
});

// ============================
// COMMANDE +del💠
// ============================
ovlcmd({
  nom_cmd: "del💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +del💠 @tag");

  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ JID invalide.");

  const deleted = await PlayerFunctions.deletePlayer(jid);
  if (!deleted) return repondre("❌ Aucune fiche trouvée.");

  return repondre(`✅ Fiche supprimée pour le joueur : ${arg[0]} (JID : ${jid})`);
});
