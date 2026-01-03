const { ovlcmd } = require("../lib/ovlcmd");
const PlayerFunctions = require("../DataBase/ElysiumFichesDB");

const registeredElysium = new Set();

// ================= UTILITAIRES =================
function normalizeText(text) {
  if (!text) text = "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveJid(arg, sender) {
  if (arg && arg.length) {
    return arg[0].replace(/[^\d]/g, "") + "@s.whatsapp.net";
  }
  return sender;
}

function countList(raw) {
  if (!raw || typeof raw !== "string") return 0;
  return raw.split("\n").map(x => x.trim()).filter(Boolean).length;
}

// ================= FICHE ÉLYSIUM =================
function add_elysium(code_cmd) {
  if (registeredElysium.has(code_cmd)) return;
  registeredElysium.add(code_cmd);

  ovlcmd({
    nom_cmd: "elysiumme💠",
    classe: "Elysium",
    react: "💠"
  }, async (ms_org, ovl, { repondre, ms, arg }) => {

    const jid = resolveJid(arg, ms_org.sender);

    try {
      const data = await PlayerFunctions.getPlayer(jid);
      if (!data) return repondre("❌ Aucune fiche trouvée.");

      // sécurisation
      data.cyberwares = data.cyberwares != null ? data.cyberwares : "";
data.exp = data.exp != null ? data.exp : 0;
data.niveau = data.niveau != null ? data.niveau : 0;

      // ===== AFFICHAGE FICHE =====
      if (!arg.length) {

        const fiche = `➤ ──⦿ P L A Y E R | ⦿──

▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
🫆Pseudo:  ➤ ${data.pseudo}
🫆User:    ➤ ${data.user}
⏫Exp:     ➤ ${data.exp}/4000 XP
🔰Niveau:  ➤ ${data.niveau} ▲
🎖️Rang:   ➤ ${data.rang}

▒▒▒░░ \`P L A Y E R\` 💠
💲ECash:       ➤ ${data.ecash}
🌟Lifestyle:  ➤ ${data.lifestyle}
⭐Charisme:   ➤ ${data.charisme}
🫱🏼‍🫲🏽Réputation: ➤ ${data.reputation}

░▒▒▒▒░ \`C Y B E R W A R E S\` 💠
🩻Cyberwares (${countList(data.cyberwares)})
➤ ${data.cyberwares.split("\n").join(" • ") || "-"}

░▒▒▒▒░ \`S T A T S\` 💠
✅ Missions: ${data.missions}
❌ Game Over: ${data.gameover}
🏆 PVP: ${data.pvp}

👊 Combat: ${data.points_combat}
🪼 Chasse: ${data.points_chasse}/4000
🪸 Récoltes: ${data.points_recoltes}/4000
👾 Hacking: ${data.points_hacking}/4000
🏁 Conduite: ${data.points_conduite}/4000
🌍 Exploration: ${data.points_exploration}/4000

░▒░▒░ ACHIEVEMENTS 💠
🏆 Trophies: ${data.trophies}`;

        const payload = data.oc_url
          ? { image: { url: data.oc_url }, caption: fiche }
          : { text: fiche };

        return ovl.sendMessage(
          ms_org,
          payload,
          { quoted: ms || ms_org }
        );
      }

      // ===== MODIFICATIONS AVANCÉES =====
      const updates = await processElysiumUpdates(arg, jid);
      await applyElysiumUpdates(updates, jid);

      const log = updates.map(u =>
        `🛠️ *${u.colonne}* : \`${u.oldValue}\` ➤ \`${u.newValue}\``
      ).join("\n");

      return repondre("✅ Fiche Élysium mise à jour :\n\n" + log);

    } catch (e) {
      console.error("[ELY_FICHE]", e);
      return repondre("❌ Une erreur est survenue.");
    }
  });
}

// ================= PROCESS UPDATES =================
async function processElysiumUpdates(args, jid) {
  const updates = [];
  const data = await PlayerFunctions.getPlayer(jid);
  const columns = Object.keys(data.dataValues);

  let i = 0;
  while (i < args.length) {

    const colonne = args[i++];
    const signe = args[i++];

    let texte = [];
    while (
      i < args.length &&
      !["+", "-", "=", "add", "supp"].includes(args[i]) &&
      !columns.includes(args[i])
    ) {
      texte.push(args[i++]);
    }

    if (!columns.includes(colonne)) {
      throw new Error(`❌ Colonne inconnue : ${colonne}`);
    }

    const oldValue = data[colonne];
    let newValue;

    // ===== CYBERWARES (LISTE) =====
    if (colonne === "cyberwares") {
      let list = (oldValue || "").split("\n").filter(Boolean);
      const items = texte.join(" ")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

      if (signe === "+") {
        for (const c of items) {
          if (!list.some(x => normalizeText(x) === normalizeText(c))) {
            list.push(c);
          }
        }
      } else if (signe === "-") {
        const rm = items.map(normalizeText);
        list = list.filter(x => !rm.includes(normalizeText(x)));
      } else if (signe === "=") {
        list = items;
      } else {
        throw new Error("❌ cyberwares accepte uniquement + - =");
      }

      updates.push({
        colonne,
        oldValue,
        newValue: list.join("\n")
      });
      continue;
    }

    // ===== COLONNES NORMALES =====
    if (signe === "+" || signe === "-") {
      const n1 = Number(oldValue) || 0;
      const n2 = Number(texte.join(" ")) || 0;
      newValue = signe === "+" ? n1 + n2 : n1 - n2;
    }
    else if (signe === "=") {
      newValue = texte.join(" ");
    }
    else if (signe === "add") {
      newValue = `${oldValue || ""} ${texte.join(" ")}`.trim();
    }
    else if (signe === "supp") {
      const regex = new RegExp(`\\b${normalizeText(texte.join(" "))}\\b`, "gi");
      newValue = normalizeText(oldValue).replace(regex, "").trim();
    }
    else {
      throw new Error(`❌ Signe invalide : ${signe}`);
    }

    updates.push({ colonne, oldValue, newValue });
  }

  return updates;
}

// ================= APPLY UPDATES =================
async function applyElysiumUpdates(updates, jid) {
  for (const u of updates) {
    await PlayerFunctions.updatePlayer(jid, {
      [u.colonne]: u.newValue
    });
  }
}

// ================= INITIALISATION =================
add_elysium("elysiumme💠");

// ================= HUD =================
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, arg }) => {

  try {
    const jid = resolveJid(arg, ms_org.sender);
    const data = await PlayerFunctions.getPlayer(jid);
    if (!data) return repondre("❌ Aucune fiche trouvée.");

    const hud = `➤ ──⦿ HUD | PLAYER ⦿──

🍗 ${data.besoins}%   ❤️ ${data.pv}%   💠 ${data.energie}%
💪 ${data.forme}%   🫁 ${data.stamina}%   🙂 ${data.plaisir}%

🧠 Int: ${data.intelligence}   👊 Force: ${data.force}
⚡ Vit: ${data.vitesse}   👁️ Ref: ${data.reflexes}
🛡️ Res: ${data.resistance}

🛠️ Gathering: ${data.gathering}
🚗 Driving: ${data.driving}
👾 Hacking: ${data.hacking}

➤ +Package🎒   +Phone📱`;

    const payload = data.oc_url
      ? { image: { url: data.oc_url }, caption: hud }
      : { text: hud };

    return ovl.sendMessage(
      ms_org,
      payload,
      { quoted: ms_org }
    );

  } catch (e) {
    console.error("[HUD]", e);
    return repondre("❌ Erreur HUD.");
  }
});

// ================= ADD PLAYER =================
ovlcmd({
  nom_cmd: "add💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { repondre, arg }) => {

  if (!arg.length) return repondre("❌ Syntaxe : +add💠 @tag");

  try {
    const jid = resolveJid(arg, ms_org.sender);
    const result = await PlayerFunctions.savePlayer(jid, {
      pseudo: "Nouveau Joueur",
      user: arg[0],
    });
    return repondre(result);
  } catch (e) {
    console.error("[ADD]", e);
    return repondre("❌ Erreur création fiche.");
  }
});

// ================= DEL PLAYER =================
ovlcmd({
  nom_cmd: "del💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { repondre, arg }) => {

  if (!arg.length) return repondre("❌ Syntaxe : +del💠 @tag");

  try {
    const jid = resolveJid(arg, ms_org.sender);
    const result = await PlayerFunctions.deletePlayer(jid);
    return repondre(result);
  } catch (e) {
    console.error("[DEL]", e);
    return repondre("❌ Erreur suppression.");
  }
});

// ================= OC =================
ovlcmd({
  nom_cmd: "oc💠",
  classe: "Elysium",
  react: "🖼️"
}, async (ms_org, ovl, { repondre, arg }) => {

  if (arg.length < 4) {
    return repondre("❌ Syntaxe : +oc💠 @tag oc_url = lien");
  }

  try {
    const jid = resolveJid(arg, ms_org.sender);
    const newUrl = arg.slice(3).join(" ").trim();
    await PlayerFunctions.updatePlayer(jid, { oc_url: newUrl });
    return repondre("✅ OC mis à jour.");
  } catch (e) {
    console.error("[OC]", e);
    return repondre("❌ Erreur OC.");
  }
});
