const { ovlcmd } = require('../lib/ovlcmd');
const { HUDFunctions } = require("../DataBase/ElysiumHudDB"); 
const { saveUser: saveHUD, deleteUser: delHUD, getUserData: getHUD, updateUser: updateHUD, updateBulk: updateHUDBulk } = HUDFunctions;
const PlayerFunctions = require('../DataBase/ElysiumFichesDB');

// ============================
// UTILITAIRES
// ============================
function normalizeJid(input) {
  if (!input) return null;
  if (input.endsWith("@s.whatsapp.net")) return input;
  if (/^\d+$/.test(input)) return input + "@s.whatsapp.net";
  return String(input);
}

// ============================
// 🎮 Commande +HUD💠 (affichage / modification)
// ============================
ovlcmd({
  nom_cmd: "hud💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, arg, ms }) => {
  const jid = normalizeJid(arg[0] || ms_org.sender.id || ms_org.sender);
  if (!jid) return repondre("❌ Impossible de récupérer le JID du joueur.");

  try {
    const data = await PlayerFunctions.getPlayer({ id: jid });
    if (!data) return repondre("❌ Aucun HUD trouvé pour ce joueur.");

    // Affichage simple si pas d'arguments
    if (arg.length <= 1) {
      const hud = `➤ ──⦿ \`P L A Y E R\` | ⦿──

> 🍗: ${data.besoins || 100}%    ❤️: ${data.pv || 100}%   💠: ${data.energie || 100}%
💪🏼: ${data.forme || 100}%    🫁: ${data.stamina || 100}%   🙂: ${data.plaisir || 100}%

🧠Intelligence: ${data.intelligence || 1}     👊🏽Force: ${data.force || 1}
🔍Gathering: ${data.gathering || 0}     ⚡Vitesse: ${data.vitesse || 1}
🛞Driving: ${data.driving || 0}        👁️Reflexes: ${data.reflexes || 1}
👾Hacking: ${data.hacking || 0}      🛡️Résistance: ${data.resistance || 1}

➤ \`+Package\`🎒 ➤ \`+Phone\`📱`;

      const payload = data.oc_url ? { image: { url: data.oc_url } } : {};
      return ovl.sendMessage(ms_org, { ...payload, caption: hud }, { quoted: ms || ms_org });
    }

    // --- Modification du HUD ---
    const modifiables = [
      "besoins","pv","energie","forme","stamina","plaisir",
      "intelligence","force","vitesse","reflexes","resistance",
      "gathering","driving","hacking"
    ];

    let updates = {};
    for (let i = 1; i < arg.length;) {
      const field = arg[i]?.toLowerCase();
      const op = arg[i+1];
      const val = parseInt(arg[i+2], 10);

      if (!modifiables.includes(field) || !['+','-','='].includes(op) || isNaN(val)) { i++; continue; }

      if (op === '=') updates[field] = val;
      if (op === '+') updates[field] = (data[field] || 0) + val;
      if (op === '-') updates[field] = (data[field] || 0) - val;

      i += 3;
    }

    if (Object.keys(updates).length === 0) return repondre("⚠️ Format incorrect. Exemple : +hud💠 pv + 10 énergie - 5");

    const message = await PlayerFunctions.setPlayerBulk(updates, jid);
    return repondre(message || "✅ HUD mis à jour avec succès !");

  } catch (err) {
    console.error("[HUD] Erreur :", err);
    return repondre("❌ Une erreur est survenue lors de l'affichage ou modification du HUD.");
  }
});

// ============================
// +SAVE HUD💠
// ============================
ovlcmd({
  nom_cmd: "save",
  classe: "Other",
  react: "💾",
  desc: "Enregistrer un HUD pour un joueur"
}, async (ms_org, ovl, { arg, repondre, prenium_id }) => {
  if (!prenium_id) return repondre("⚠️ Seuls les membres de la NS peuvent enregistrer un HUD.");
  const type = arg[0]?.toLowerCase();
  const rawMention = arg[1] || arg[0];
  if (!rawMention) return repondre("⚠️ Mentionne un utilisateur.");
  const mention = normalizeJid(rawMention);

  if (type !== "hud💠") return repondre("⚠️ Type invalide. Utilise : hud💠");

  const existing = await PlayerFunctions.getPlayer({ id: mention });
  if (existing) return repondre("⚠️ Ce joueur possède déjà un HUD.");

  const baseHUD = {
    besoins: 100, pv: 100, energie: 100,
    forme: 100, stamina: 100, plaisir: 100,
    intelligence: 1, force: 1, vitesse: 1,
    reflexes: 1, resistance: 1,
    gathering: 0, driving: 0, hacking: 0,
    oc_url: ""
  };

  try {
    await PlayerFunctions.savePlayer(mention, baseHUD);
    return repondre(`✅ HUD créé pour le joueur : ${rawMention} (JID : ${mention})`);
  } catch (err) {
    console.error("❌ Erreur save HUD:", err);
    return repondre("⚠️ Une erreur est survenue lors de la création du HUD.");
  }
});

// ============================
// +DEL HUD💠
// ============================
ovlcmd({
  nom_cmd: "delete",
  classe: "Other",
  react: "🗑️",
  desc: "Supprimer le HUD d’un joueur"
}, async (ms_org, ovl, { arg, repondre, prenium_id }) => {
  if (!prenium_id) return repondre("⚠️ Seuls les membres de la NS peuvent supprimer un HUD.");
  const type = arg[0]?.toLowerCase();
  const rawMention = arg[1] || arg[0];
  if (!rawMention) return repondre("⚠️ Mentionne un utilisateur.");
  const mention = normalizeJid(rawMention);

  if (type !== "hud💠") return repondre("⚠️ Type invalide. Utilise : hud💠");

  try {
    const deleted = await PlayerFunctions.deletePlayer(mention);
    if (!deleted) return repondre("⚠️ Aucun HUD trouvé pour ce joueur.");
    return repondre(`✅ HUD supprimé pour le joueur : ${rawMention} (JID : ${mention})`);
  } catch (err) {
    console.error("❌ Erreur delete HUD:", err);
    return repondre("⚠️ Une erreur est survenue lors de la suppression du HUD.");
  }
});
