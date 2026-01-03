const { ovlcmd } = require("../lib/ovlcmd");
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

// --- Utilitaires ---
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// --- Récupération sécurisée du JID ---
function resolveJid(arg, sender) {
  // Si on mentionne un joueur
  if (arg && arg.length && arg[0]) {
    return arg[0].replace(/[^\d]/g, "") + "@s.whatsapp.net";
  }
  // Si sender est un objet { id: "xxx" }
  if (sender && typeof sender === "object" && sender.id) return sender.id;
  // Si sender est déjà une string
  if (typeof sender === "string") return sender;
  // Sinon rien
  return null;
}

// ============================
// 🎮 Commande principale +ElysiumMe💠
// ============================
ovlcmd({
  nom_cmd: "elysiumme💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, arg, ms }) => {
  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID du joueur.");

  try {
    console.log("[ELYME] Commande déclenchée pour JID:", jid, "arg:", arg);

    const data = await PlayerFunctions.getPlayer({ id: jid });
    if (!data) return repondre("❌ Aucune fiche trouvée.");

    data.cyberwares = data.cyberwares || "";
    data.oc_url = data.oc_url || "";

    const cyberwaresCount = data.cyberwares
      ? data.cyberwares.split("\n").filter(c => c.trim() !== "").length
      : 0;

    if (!arg.length) {
      // Affichage fiche complète
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

      const imagePayload = data.oc_url ? { image: { url: data.oc_url } } : {};
      return ovl.sendMessage(ms_org, { ...imagePayload, caption: fiche }, { quoted: ms || ms_org });
    }

  } catch (err) {
    console.error("[ELYME] Erreur dans +ElysiumMe💠:", err);
    return repondre("❌ Une erreur est survenue.");
  }
});

// ============================
// 🎮 Commande +HUD💠
// ============================
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, arg }) => {
  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID du joueur.");

  try {
    const data = await PlayerFunctions.getPlayer({ id: jid });
    if (!data) return repondre("❌ Aucune fiche trouvée.");

    const hud = `➤ ──⦿ \`P L A Y E R\` | ⦿──

> 🍗: ${data.besoins || 100}%    ❤️: ${data.pv || 100}%   💠: ${data.energie || 100}%
💪🏼: ${data.forme || 100}%    🫁: ${data.stamina || 100}%   🙂: ${data.plaisir || 100}%

🧠Intelligence: ${data.intelligence || 1}     👊🏽Force: ${data.force || 1}
🔍Gathering: ${data.gathering || 0}     ⚡Vitesse: ${data.vitesse || 1}
🛞Driving: ${data.driving || 0}        👁️Reflexes: ${data.reflexes || 1}
👾Hacking: ${data.hacking || 0}      🛡️Résistance: ${data.resistance || 1}

➤ \`+Package\`🎒 ➤ \`+Phone\`📱`;

    const imagePayload = data.oc_url ? { image: { url: data.oc_url } } : {};
    return ovl.sendMessage(ms_org, { ...imagePayload, caption: hud }, { quoted: ms_org });

  } catch (err) {
    console.error("[HUD] Erreur lors de l'affichage du HUD:", err);
    return repondre("❌ Erreur lors de la mise à jour du HUD.");
  }
});

// ============================
// 🎮 Commande +add💠
// ============================
ovlcmd({
  nom_cmd: "add💠",
  classe: "Elysium",
  react: "➕"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +add💠 @tag");

  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID du joueur.");

  try {
    const existing = await PlayerFunctions.getPlayer({ id: jid });
    if (existing) return repondre("❌ Ce joueur possède déjà une fiche.");

    await PlayerFunctions.addPlayer(jid, {
      pseudo: "Nouveau Joueur",
      user: arg[0],
      besoins: 100,
      pv: 100,
      energie: 100,
      forme: 100,
      stamina: 100,
      plaisir: 100,
      intelligence: 1,
      force: 1,
      vitesse: 1,
      reflexes: 1,
      resistance: 1,
      gathering: 0,
      driving: 0,
      hacking: 0,
      cyberwares: "",
      exp: 0,
      niveau: 1,
      rang: "Novice🥉",
      ecash: 50000,
      lifestyle: 0,
      charisme: 0,
      reputation: 0,
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

  } catch (err) {
    console.error("[ADD💠] Erreur lors de la création :", err);
    return repondre("❌ Erreur lors de la création de la fiche.");
  }
});

// ============================
// 🎮 Commande +del💠
// ============================
ovlcmd({
  nom_cmd: "del💠",
  classe: "Elysium",
  react: "🗑️"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (!arg.length) return repondre("❌ Syntaxe : +del💠 @tag");

  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID du joueur.");

  try {
    const deleted = await PlayerFunctions.deletePlayer(jid);
    if (!deleted) return repondre("❌ Aucune fiche trouvée pour ce joueur.");

    return repondre(`✅ Fiche supprimée pour le joueur : ${arg[0]} (JID : ${jid})`);

  } catch (err) {
    console.error("[DEL💠] Erreur lors de la suppression :", err);
    return repondre("❌ Erreur lors de la suppression de la fiche.");
  }
});

// ============================
// 🎮 Commande +oc💠
// ============================
ovlcmd({
  nom_cmd: "oc💠",
  classe: "Elysium",
  react: "🖼️"
}, async (ms_org, ovl, { repondre, arg }) => {
  if (arg.length < 3) return repondre("❌ Syntaxe : +oc💠 @tag = [lien fichier Catbox]");

  const jid = resolveJid(arg, ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID du joueur.");

  try {
    const colonne = arg[1];
    const signe = arg[2];

    if (colonne !== "oc_url" || signe !== "=") 
      return repondre("❌ Syntaxe invalide. Utilise : oc_url = [lien]");

    const newValue = arg.slice(3).join(" ").trim();
    if (!newValue) return repondre("❌ Fournis un lien valide pour l'image/GIF Catbox.");

    const data = await PlayerFunctions.getPlayer({ id: jid });
    if (!data) return repondre("❌ Joueur introuvable.");

    await PlayerFunctions.setPlayer("oc_url", newValue, jid);

    return repondre(`✅ Image/GIF du joueur ${data.pseudo} mise à jour avec succès !`);

  } catch (err) {
    console.error("[OC💠] Erreur lors de la mise à jour :", err);
    return repondre("❌ Erreur lors de la mise à jour du oc_url.");
  }
});
