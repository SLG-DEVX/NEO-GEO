const { ovlcmd } = require("../lib/ovlcmd");
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

const registeredFiches = new Map(); // code_fiche => jid

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
// FONCTION POUR ENVOYER UNE FICHE
// ============================
async function sendFiche(ms_org, ovl, jid, quoted) {
  const data = await PlayerFunctions.getPlayer({ jid });
  if (!data) return ovl.sendMessage(ms_org, { text: "❌ Fiche introuvable." }, { quoted });

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
  return ovl.sendMessage(ms_org, { ...payload, caption: fiche }, { quoted });
}

// ============================
// AJOUT COMMANDE DYNAMIQUE
// ============================
function registerFicheCommand(code_fiche, jid) {
  if (!code_fiche || !jid || registeredFiches.has(code_fiche)) return;

  registeredFiches.set(code_fiche, jid);

  ovlcmd({
    nom_cmd: code_fiche,
    classe: "Elysium",
    react: "💠"
  }, async (ms_org, ovl, { ms }) => {
    await sendFiche(ms_org, ovl, jid, ms || ms_org);
  });
}

// ============================
// INIT AUTOMATIQUE
// ============================
async function initElysiumFiches() {
  try {
    const all = await PlayerFunctions.getAllPlayers();
    for (const p of all) {
      if (!p.code_fiche || p.code_fiche === "aucun" || !p.jid) continue;
      registerFicheCommand(p.code_fiche, p.jid);
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
  if (arg.length < 2) return repondre("❌ Syntaxe : +add💠 <jid> <code_fiche>");

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

  registerFicheCommand(code_fiche, jid);

  return repondre(`✅ Fiche créée :\n• JID : ${jid}\n• Commande : +${code_fiche}`);
});

// ============================
// COMMANDE +del💠
// ============================
ovlcmd({
  nom_cmd: "del💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +del💠 <code_fiche>");

  const code_fiche = arg.join(" ");
  const player = await PlayerFunctions.getAllPlayers()
    .then(all => all.find(p => p.code_fiche === code_fiche));

  if (!player) return repondre("❌ Aucune fiche trouvée.");

  await PlayerFunctions.deletePlayer(player.jid);
  registeredFiches.delete(code_fiche);

  return repondre(`✅ Fiche supprimée : ${code_fiche}`);
});

//---------- COMMANDE ELYSIUM ----------
ovlcmd({
  nom_cmd: "elysiumme💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, mentions }) => {
  try {
    // Cas 1 : mentionné un joueur
    let jidToFetch;
    if (mentions && Object.keys(mentions).length > 0) {
      jidToFetch = Object.keys(mentions)[0];
      console.log("[ELY-ME] JID mentionné :", jidToFetch);
    } else {
      // Cas 2 : pas de mention → utiliser l'expéditeur
      jidToFetch = ms_org.sender?.id || ms_org.sender;
      console.log("[ELY-ME] JID expéditeur :", jidToFetch);
    }

    // Vérification
    if (!jidToFetch)
      return repondre("❌ Impossible de récupérer le JID.");

    // Récupération de la fiche
    const player = await PlayerFunctions.getPlayer({ jid: jidToFetch });
    if (!player || !player.code_fiche || player.code_fiche === "aucun")
      return repondre("❌ Fiche introuvable pour ce joueur.");

    // Enregistrer la commande dynamiquement si nécessaire
    registerFicheCommand(player.code_fiche, jidToFetch);

    // Envoi de la fiche
    await sendFiche(ms_org, ovl, jidToFetch, ms_org);

  } catch (err) {
    console.error("══════════ ❌ ELYSIUMME ERROR ❌ ══════════");
    console.error("▶ Type :", err?.name);
    console.error("▶ Message :", err?.message);
    console.error("▶ Stack :", err?.stack);
    console.error("▶ Error brute :", err);
    console.error("════════════════════════════════════════");

    return repondre("❌ Une erreur est survenue (voir console).");
  }
});
