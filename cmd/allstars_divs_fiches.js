const { ovlcmd } = require("../lib/ovlcmd");
const { getData, setfiche, getAllFiches, add_id, del_fiche } = require('../DataBase/allstars_divs_fiches');

const registeredFiches = new Set();

// ================= UTILITAIRES =================
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function countCards(cardsRaw) {
  if (!cardsRaw || typeof cardsRaw !== "string") return 0;
  return cardsRaw
    .split(/[\n•]/)
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .length;
}

// ================= CONSTANTES =================
const LEVEL_REWARD_FIXED = {
  golds: 500000,
  fans: 50000
};

// ================= RECOMPENSES =================
async function giveLevelRewards(jid, level, ovl, ms) {
  const dataRaw = await getData({ jid });
  const data = dataRaw.dataValues ?? dataRaw;

  for (const [col, value] of Object.entries(LEVEL_REWARD_FIXED)) {
    const oldVal = Number(data[col]) || 0;
    const newVal = oldVal + value;
    await setfiche(col, newVal, jid);
  }

  await ovl.sendMessage(ms, {
    text:
`🎁 *Récompenses du niveau ${level} obtenues !*\n
🎁 golds +${LEVEL_REWARD_FIXED.golds}🧭
🎁 fans +${LEVEL_REWARD_FIXED.fans}👥`
  });
}

// ================= LEVEL-UP / LEVEL-DOWN =================
async function checkLevel(jid, oldExp, newExp, ovl, ms_org) {
  oldExp = Number(oldExp) || 0;
  newExp = Number(newExp) || 0;

  const dataRaw = await getData({ jid });
  const data = dataRaw.dataValues ?? dataRaw;

  let currentLevel = Number(data.niveau) || 0;
  const maxLevel = 20;

  const oldLevelByExp = Math.floor(oldExp / 100);
  const newLevelByExp = Math.floor(newExp / 100);

  if (newLevelByExp > oldLevelByExp) {
    const levelsGained = newLevelByExp - oldLevelByExp;
    for (let i = 0; i < levelsGained; i++) {
      if (currentLevel >= maxLevel) break;
      currentLevel++;
      await setfiche("niveau", currentLevel, jid);

      await ovl.sendMessage(ms_org, {
        text: `🏆🎉 Félicitations Promotion ! Joueur @${jid.split('@')[0]} passe au *niveau ${currentLevel}* ▲`,
        mentions: [jid]
      });

      await giveLevelRewards(jid, currentLevel, ovl, ms_org);
    }
  } else if (newLevelByExp < oldLevelByExp) {
    const levelsLost = oldLevelByExp - newLevelByExp;
    for (let i = 0; i < levelsLost; i++) {
      if (currentLevel <= 0) break;
      currentLevel--;
      await setfiche("niveau", currentLevel, jid);

      await ovl.sendMessage(ms_org, {
        text: `🔻 Chute de niveau ! Joueur @${jid.split('@')[0]} redescend au *niveau ${currentLevel}* ▼`,
        mentions: [jid]
      });
    }
  }
}

// ================= UPDATE DES DONNÉES JOUEUR =================
async function updatePlayerData(updates, jid, ovl, ms_org) {
  for (const update of updates) {
    await setfiche(update.colonne, update.newValue, jid);

    if (update.colonne === "exp") {
      try {
        const oldExp = Number(update.oldValue) || 0;
        const newExp = Number(update.newValue) || 0;
        await checkLevel(jid, oldExp, newExp, ovl, ms_org);
      } catch (e) {
        console.error("Erreur checkLevel :", e);
      }
    }
  }
}

// ================= PROCESS UPDATES =================
async function processUpdates(args, jid) {
  const updates = [];
  const dataRaw = await getData({ jid });
  const values = dataRaw.dataValues ?? dataRaw;
  const columns = Object.keys(values);

  let i = 0;
  while (i < args.length) {
    const object = args[i++];
    const signe = args[i++];

    if (!columns.includes(object)) {
      throw new Error(`❌ La colonne '${object}' n'existe pas.`);
    }

    const oldValue = values[object];
    let newValue;

    let texte = [];

    if (object === "commentaire") {
      texte = args.slice(i);
      i = args.length;
    } else {
      while (
        i < args.length &&
        !['+', '-', '=', 'add', 'supp'].includes(args[i]) &&
        !columns.includes(args[i])
      ) {
        texte.push(args[i++]);
      }
    }

    texte = texte.join(" ");

    if (object === "cards") {
      const old = oldValue || "";
      let list = old.split("\n").filter(x => x.trim() !== "");

      const items = texte.length
        ? texte.split(",").map(x => x.trim()).filter(Boolean)
        : [];

      if (signe === "+") {
        for (const card of items) {
          if (!list.some(c => normalizeText(c) === normalizeText(card))) {
            list.push(card);
          }
        }
      } else if (signe === "-") {
        list = list.filter(c => !items.map(normalizeText).includes(normalizeText(c)));
      } else if (signe === "=") {
        list = items;
      } else {
        throw new Error("❌ Le champ 'cards' accepte uniquement '+', '-' ou '='");
      }

      newValue = list.join("\n");
      updates.push({ colonne: "cards", oldValue: old, newValue });
      continue;
    }

    if (signe === "+" || signe === "-") {
      const n1 = Number(oldValue) || 0;
      const n2 = Number(texte) || 0;
      newValue = signe === "+" ? n1 + n2 : n1 - n2;
    } else if (signe === "=") {
      newValue = texte;
    } else if (signe === "add") {
      newValue = (oldValue + " " + texte).trim();
    } else if (signe === "supp") {
      const regex = new RegExp(`\\b${normalizeText(texte)}\\b`, "gi");
      newValue = normalizeText(oldValue).replace(regex, "").trim();
    } else {
      throw new Error(`❌ Signe non reconnu : ${signe}`);
    }

    updates.push({ colonne: object, oldValue, newValue });
  }

  return updates;
}

// ================= ADD OR UPDATE FICHE =================
async function addOrUpdateFiche(nom_joueur, jid, image_oc, joueur_div) {
  try {
    const existing = await getData({ jid });
    if (existing && existing.dataValues) {
      await setfiche("code_fiche", nom_joueur, jid);
      await setfiche("division", joueur_div, jid);
      await setfiche("oc_url", image_oc, jid);

      if (!registeredFiches.has(nom_joueur)) registeredFiches.add(nom_joueur);
      return { action: "mise à jour", jid };
    } else {
      await add_id(jid, { code_fiche: nom_joueur, division: joueur_div, oc_url: image_oc });
      if (!registeredFiches.has(nom_joueur)) registeredFiches.add(nom_joueur);
      return { action: "ajoutée", jid };
    }
  } catch (err) {
    console.error("Erreur addOrUpdateFiche :", err);
    throw err;
  }
}

// ================= ADD FICHE =================
function add_fiche(nom_joueur, jid, image_oc, joueur_div) {
  if (registeredFiches.has(nom_joueur)) return;
  registeredFiches.add(nom_joueur);

  ovlcmd({
    nom_cmd: nom_joueur,
    classe: joueur_div,
    react: "✅"
  }, async (ms_org, ovl, cmd_options) => {
    const { repondre, ms, arg, prenium_id } = cmd_options;

    try {
      const dataRaw = await getData({ jid });
      const data = dataRaw?.dataValues ?? dataRaw;

      if (!data) {
        return await repondre("❌ Fiche introuvable pour ce joueur.");
      }

      // Valeurs par défaut
      data.exp = Number(data.exp) || 0;
      data.niveau = Math.min(Number(data.niveau) || 0, 20);
      data.close_fight = Number(data.close_fight) || 0;
      data.cards = data.cards || "";
      data.pseudo = data.pseudo || jid.split("@")[0];
      data.user = data.user || "Inconnu";
      data.surnom = data.surnom || "—";
      data.classement = data.classement || "—";
      data.rang = data.rang || "—";
      data.classe = data.classe || "—";
      data.archetype = data.archetype || "—";
      data.victoires = data.victoires || 0;
      data.defaites = data.defaites || 0;
      data.championnants = data.championnants || 0;
      data.neo_cup = data.neo_cup || 0;
      data.evo = data.evo || 0;
      data.grandslam = data.grandslam || 0;
      data.tos = data.tos || 0;
      data.the_best = data.the_best || 0;
      data.sigma = data.sigma || 0;
      data.neo_globes = data.neo_globes || 0;
      data.golden_boy = data.golden_boy || 0;
      data.note = data.note || 0;
      data.talent = data.talent || 0;
      data.strikes = data.strikes || 0;
      data.attaques = data.attaques || 0;
      data.oc_url = data.oc_url || image_oc || "https://default-image.png";
      
// --- AFFICHAGE DE LA FICHE ---
if (!arg.length || arg[0] === nom_joueur) {
  const fiche = `░▒░ *👤N E O P L A Y E R | RAZORX⚡™ 🎮*
▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
◇ *Pseudo👤*: ${data.pseudo}
◇ *User👤*: ${data.user}
◇ *Surnom(s)👤*: ${data.surnom}
◇ *Classement continental🌍:* ${data.classement}
◇ *Experience⏫:* ${data.exp} Exp
◇ *Niveau🎖️*: ${data.niveau} ▲
◇ *Division🛡️*: ${data.division}
◇ *Rank 🎖️*: ${data.rang}
◇ *Classe🎖️*: ${data.classe}

▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
◇ *Golds🧭*: ${data.golds} ©🧭
◇ *Fans👥*: ${data.fans} 👥
◇ *Archetype ⚖️*: ${data.archetype}

░▒░░ PALMARÈS🏆
▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
✅ Victoires: ${data.victoires} - ❌ Défaites: ${data.defaites}
*◇🏆Championnats*: ${data.championnants}
*◇🏆NEO cup💫*: ${data.neo_cup}
*◇🏆EVO💠*: ${data.evo}
*◇🏆GrandSlam🅰️*: ${data.grandslam}
*◇🌟TOS*: ${data.tos}
*◇👑The BEST🏆*: ${data.the_best}
*◇🗿Sigma🏆*: ${data.sigma}
*◇🎖️Neo Globes*: ${data.neo_globes}
*◇🏵️Golden Rookie🏆*: ${data.golden_boy}

░▒░▒░ STATS 📊
▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
📈 Note: ${data.note}/100
⌬ *Talent⭐:* ▱▱▱▱▬▬▬ ${data.talent}
⌬ *Strikes👊🏻:* ▱▱▱▱▬▬▬ ${data.strikes}
⌬ *Attaques🌀:* ▱▱▱▱▬▬▬ ${data.attaques}

░▒░▒░ CARDS 🎴: ${countCards(data.cards)}
▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
🎴 ${data.cards.split("\n").join(" • ")}

╰───────────────────
░▒░  *𝗡𝗘𝗢🔷 ESPORTS ARENA®🏆* ░▒░`;
        try {
          await ovl.sendMessage(ms_org, {
            video: { url: 'https://files.catbox.moe/0qzigf.mp4' },
            gifPlayback: true,
            caption: ""
          }, { quoted: ms });
        } catch (e) { console.warn("Vidéo non envoyée:", e.message); }

        return ovl.sendMessage(ms_org, {
          image: { url: data.oc_url },
          caption: fiche
        }, { quoted: ms });
      }

      // --- MISE À JOUR (requiert prenium) ---
      if (!prenium_id) {
        return await repondre("⛔ Accès refusé ! Seuls les membres de la NS peuvent faire ça.");
      }

      const updates = await processUpdates(arg, jid);
      await updatePlayerData(updates, jid, ovl, ms_org);

      const message = updates
        .map(u => `🛠️ *${u.colonne}* modifié : \`${u.oldValue}\` ➤ \`${u.newValue}\``)
        .join("\n");

      await repondre("✅ Fiche mise à jour avec succès !\n\n" + message);

    } catch (err) {
      console.error("Erreur add_fiche:", err);
      await repondre("❌ Une erreur est survenue. Vérifie les paramètres ou la fiche du joueur.");
    }
  });
}

// ================= INIT FICHES AUTO =================
async function initFichesAuto() {
  try {
    const all = await getAllFiches();
    for (const player of all) {
      if (!player.code_fiche || player.code_fiche === "pas de fiche" || !player.division || !player.oc_url || !player.id) {
        continue;
      }
      const nom = player.code_fiche;
      const jid = player.jid;
      const division = player.division.replace(/\*/g, '');
      add_fiche(nom, jid, player.oc_url, division);
    }
  } catch (e) {
    console.error("Erreur d'initFichesAuto:", e);
  }
}

initFichesAuto();

// ================= COMMANDES ADD / DEL =================
ovlcmd({
  nom_cmd: "add_fiche",
  classe: "Other",
  react: "➕"
}, async (ms_org, ovl, { repondre, arg, prenium_id }) => {

  if (!prenium_id) return await repondre("⛔ Accès refusé !");
  if (arg.length < 3) return await repondre("❌ Syntaxe : add_fiche <jid> <code_fiche> <division>");

  const jid = arg[0];
  const code_fiche = arg[1];
  const division = arg.slice(2).join(" ");

  try {
    await addOrUpdateFiche(code_fiche, jid, "", division);
    await initFichesAuto();

    await repondre(
      `✅ Nouvelle fiche enregistrée :\n` +
      `• *JID* : \`${jid}\`\n` +
      `• *Code Fiche* : \`${code_fiche}\`\n` +
      `• *Division* : \`${division}\``
    );
  } catch (err) {
    console.error("❌ Erreur lors de l'ajout de la fiche :", err);
    await repondre("❌ Erreur lors de l'ajout de la fiche.");
  }
});

ovlcmd({
  nom_cmd: "del_fiche",
  classe: "Other",
  react: "🗑️"
}, async (ms_org, ovl, { repondre, arg, prenium_id }) => {

  if (!prenium_id) return await repondre("⛔ Accès refusé !");
  if (!arg.length) return await repondre("❌ Syntaxe : del_fiche <code_fiche>");

  const code_fiche = arg.join(" ");

  try {
    const deleted = await del_fiche(code_fiche);
    if (deleted === 0) return await repondre("❌ Aucune fiche trouvée.");

    registeredFiches.delete(code_fiche);
    await repondre(`✅ Fiche supprimée : \`${code_fiche}\``);

    await initFichesAuto();
  } catch (err) {
    console.error(err);
    await repondre("❌ Erreur lors de la suppression de la fiche.");
  }
});
