const ovlcmd  = require("../lib/ovlcmd");
const PlayerFunctions  = require("../DataBase/ElysiumFichesDB");

// ================= UTILITAIRES =================
function normalizeText(text) {
  return text
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

// ================= +ELYSIUMME =================
ovlcmd({
  nom_cmd: "elysiumme💠",
  classe: "Elysium",
  react: "💠"
}, async (ms_org, ovl, { repondre, ms, arg }) => {

  const jid = resolveJid(arg, ms_org.sender);

  try {
    const data = await PlayerFunctions.getPlayer(jid);
    if (!data) return repondre("❌ Aucune fiche trouvée.");

    data.cyberwares = data.cyberwares || "";
    const cyberwaresCount = data.cyberwares
      ? data.cyberwares.split("\n").filter(x => x.trim()).length
      : 0;

    if (!arg.length) {
      const fiche = `➤ ──⦿ P L A Y E R | ⦿──

▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░░
🫆Pseudo:  ➤ ${data.pseudo}
🫆User:    ➤ ${data.user}
⏫Exp:     ➤ ${data.exp}/4000 XP
🔰Niveau:  ➤ ${data.niveau} ▲
🎖️Rang:   ➤ ${data.rang}

▒▒▒░░ \`P L A Y E R\` 💠
💲ECash:       ➤ ${data.ecash} E¢
🌟Lifestyle:  ➤ ${data.lifestyle}
⭐Charisme:   ➤ ${data.charisme}
🫱🏼‍🫲🏽Réputation: ➤ ${data.reputation}

░▒▒▒▒░ \`C Y B E R W A R E S\` 💠
🩻Cyberwares (${cyberwaresCount})
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

      const imagePayload = data.oc_url
        ? { image: { url: data.oc_url } }
        : {};

      return ovl.sendMessage(
        ms_org,
        { ...imagePayload, caption: fiche },
        { quoted: ms || ms_org }
      );
    }

    return repondre("ℹ️ Les modifications avancées arrivent bientôt.");

  } catch (e) {
    console.error("[ELYMIUMME]", e);
    return repondre("❌ Une erreur est survenue.");
  }
});

// ================= +HUD =================
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

    const imagePayload = data.oc_url
      ? { image: { url: data.oc_url } }
      : {};

    return ovl.sendMessage(
      ms_org,
      { ...imagePayload, caption: hud },
      { quoted: ms_org }
    );

  } catch (e) {
    console.error("[HUD]", e);
    return repondre("❌ Erreur HUD.");
  }
});

// ================= +ADD =================
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

// ================= +DEL =================
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

// ================= +OC =================
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
