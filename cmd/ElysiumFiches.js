// ============================
// ElysiumCommands.js
// ============================

const { ovlcmd } = require("../lib/ovlcmd");
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

// ============================
// REGISTRE COMMANDES
// ============================
const registeredFiches = new Set();

// ============================
// UTILS
// ============================
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ============================
// AJOUT COMMANDE DYNAMIQUE (COMME ALL STARS)
// ============================
function addElysiumFiche(code_fiche, jid) {
  if (!code_fiche || !jid) return;
  if (registeredFiches.has(code_fiche)) return;

  registeredFiches.add(code_fiche);

  ovlcmd({
    nom_cmd: code_fiche,
    classe: "Elysium",
    react: "💠"
  }, async (ms_org, ovl, { repondre, ms }) => {
    try {
      const data = await PlayerFunctions.getPlayer({ jid });

      data.cyberwares ||= "";
      data.oc_url ||= "";

      const cyberwaresCount = data.cyberwares
        ? data.cyberwares.split("\n").filter(c => c.trim()).length
        : 0;

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
    } catch (err) {
      console.error("[ELY-FICHE]", err);
      return repondre("❌ Une erreur est survenue.");
    }
  });
}

// ============================
// INIT AUTO (ENREGISTRE COMMANDES EXISTANTES)
// ============================
async function initElysiumFiches() {
  try {
    const all = await PlayerFunctions.getAllPlayers();

    for (const p of all) {
      if (!p.code_fiche || p.code_fiche === "aucun") continue;
      if (!p.jid) continue;

      addElysiumFiche(p.code_fiche, p.jid);
    }

  } catch (e) {
    console.error("[INIT ELYSIUM]", e);
  }
}

initElysiumFiches();

// ============================
// COMMANDE +add💠
// ============================
ovlcmd({
  nom_cmd: "add💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { repondre, arg }) => {

  if (arg.length < 2)
    return repondre("❌ Syntaxe : +add💠 <jid> <code_fiche>");

  const jid = arg[0];
  const code_fiche = arg.slice(1).join(" ");

  const existing = await PlayerFunctions.getPlayer({ jid });
  if (existing && existing.code_fiche !== "aucun")
    return repondre("❌ Ce joueur possède déjà une fiche.");

  await PlayerFunctions.addPlayer(jid, {
    code_fiche,
    pseudo: "Nouveau Joueur",
    user: jid,
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
    trophies: 0
  });

  addElysiumFiche(code_fiche, jid);

  return repondre(
    `✅ Fiche créée :\n` +
    `• JID : ${jid}\n` +
    `• Commande : +${code_fiche}`
  );
});

// ============================
// COMMANDE +del💠
// ============================
ovlcmd({
  nom_cmd: "del💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { repondre, arg }) => {

  if (!arg.length)
    return repondre("❌ Syntaxe : +del💠 <code_fiche>");

  const code_fiche = arg.join(" ");
  const all = await PlayerFunctions.getAllPlayers();
  const player = all.find(p => p.code_fiche === code_fiche);

  if (!player) return repondre("❌ Aucune fiche trouvée.");

  await PlayerFunctions.deletePlayer(player.jid);
  registeredFiches.delete(code_fiche);
  await initElysiumFiches();

  return repondre(`✅ Fiche supprimée : ${code_fiche}`);
});
