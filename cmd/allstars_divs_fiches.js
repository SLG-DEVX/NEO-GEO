const { ovlcmd } = require("../lib/ovlcmd");
const { getData, setfiche, getAllFiches, add_id, del_fiche } = require('../DataBase/allstars_divs_fiches');

const registeredFiches = new Set();

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// --- Utilitaires ---
function countCards(cardsRaw) {
    if (!cardsRaw || typeof cardsRaw !== "string") return 0;

    return cardsRaw
        .split(/[\n•]/)     // accepte \n ou le séparateur •
        .map(c => c.trim())
        .filter(c => c.length > 0)
        .length;
}

// --- Fonction pour gérer le niveau max et level-up/level-down ---
async function checkLevel(jid, oldExp, newExp, ovl, ms) {
  const oldLevel = Math.min(Math.floor(oldExp / 100), 20);
  const newLevel = Math.min(Math.floor(newExp / 100), 20);

  if (newLevel > oldLevel) {
    // Level up
    await ovl.sendMessage(ms, { text: `🏆🎉 Félicitations Promotion ! <@${jid}> atteint le niveau supérieur ! Niveau actuel ${newLevel} ▲` });
  } else if (newLevel < oldLevel) {
    // Level down
    await ovl.sendMessage(ms, { text: `🔻 <@${jid}> redescend d'un niveau ! Niveau actuel ${newLevel} ▼` });
  }

  // Mettre à jour le niveau dans la fiche
  await setfiche("niveau", newLevel, jid);
}

// --- Ajout d'une fiche ---
function add_fiche(nom_joueur, jid, image_oc, joueur_div) {
  if (registeredFiches.has(nom_joueur)) return;
  registeredFiches.add(nom_joueur);

  ovlcmd({
    nom_cmd: nom_joueur,
    classe: joueur_div,
    react: "✅"
  },
  async (ms_org, ovl, cmd_options) => {
    const { repondre, ms, arg, prenium_id } = cmd_options;

    try {
      const data = await getData({ jid: jid });

      data.exp = data.exp ?? 0;
      data.niveau = data.niveau ?? 0;
      data.close_fight = data.close_fight ?? 0;
      data.cards = data.cards ?? "";

      // Limite du niveau max 20
      data.niveau = Math.min(data.niveau, 20);

      if (!arg.length) {
        const fiche = `░▒▒░░▒░ *👤N E O P L A Y E R 🎮*
▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
◇ *Pseudo👤*: ${data.pseudo}
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
◇ *Commentaire*: ${data.commentaire}

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
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™`;

        await ovl.sendMessage(ms_org, {
          video: { url: 'https://files.catbox.moe/0qzigf.mp4' },
          gifPlayback: true,
          caption: ""
        }, { quoted: ms });

        return ovl.sendMessage(ms_org, {
          image: { url: data.oc_url },
          caption: fiche
        }, { quoted: ms });
      }

      if (!prenium_id) return await repondre("⛔ Accès refusé ! Seuls les membres de la NS peuvent faire ça.");

      const updates = await processUpdates(arg, jid);
      await updatePlayerData(updates, jid, ovl, ms);

      const message = updates
        .map(u => `🛠️ *${u.colonne}* modifié : \`${u.oldValue}\` ➤ \`${u.newValue}\``)
        .join('\n');

      await repondre("✅ Fiche mise à jour avec succès !\n\n" + message);

    } catch (err) {
      console.error("Erreur:", err);
      await repondre("❌ Une erreur est survenue. Vérifie les paramètres.");
    }
  });
}

// --- Process updates ---
async function processUpdates(args, jid) {
  const updates = [];
  const data = await getData({ jid });
  const columns = Object.keys(data.dataValues);

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

    // --- Cards Fix ---
    if (object === "cards") {
      const old = oldValue || "";
      let list = old.split("\n").filter(x => x.trim() !== "");

      const fullText = texte.join(" ");
      const items = fullText.length
        ? fullText.split(",").map(x => x.trim()).filter(x => x.length > 0)
        : [];

      if (signe === "+") {
        for (const card of items) {
          const normCard = normalizeText(card);
          if (!list.some(c => normalizeText(c) === normCard)) {
            list.push(card);
          }
        }
      } else if (signe === "-") {
        const removeList = items.map(normalizeText);
        list = list.filter(c => !removeList.includes(normalizeText(c)));
      } else if (signe === "=") {
        list = items;
      } else {
        throw new Error("❌ Le champ 'cards' accepte uniquement '+', '-' ou '='");
      }

      newValue = list.join("\n");

      updates.push({ colonne: "cards", oldValue: old, newValue });
      continue;
    }

    // --- Colonnes normales ---
    if (signe === "+" || signe === "-") {
      const n1 = Number(oldValue) || 0;
      const n2 = Number(texte.join(" ")) || 0;
      newValue = signe === "+" ? n1 + n2 : n1 - n2;
    } 
    else if (signe === "=") {
      newValue = texte.join(" ");
    }
    else if (signe === "add") {
      newValue = (oldValue + " " + texte.join(" ")).trim();
    } 
    else if (signe === "supp") {
      const regex = new RegExp(`\\b${normalizeText(texte.join(" "))}\\b`, "gi");
      newValue = normalizeText(oldValue).replace(regex, "").trim();
    } 
    else {
      throw new Error(`❌ Signe non reconnu : ${signe}`);
    }

    updates.push({ colonne: object, oldValue, newValue });
  }

  return updates;
}

// --- Update player data avec check niveau ---
async function updatePlayerData(updates, jid, ovl, ms) {
  for (const update of updates) {
    await setfiche(update.colonne, update.newValue, jid);

    // Si c'est exp, on vérifie le niveau
    if (update.colonne === "exp") {
      const oldExp = Number(update.oldValue) || 0;
      const newExp = Number(update.newValue) || 0;
      await checkLevel(jid, oldExp, newExp, ovl, ms);
    }
  }
}

// --- Initialisation des fiches ---
async function initFichesAuto() {
  try {
    const all = await getAllFiches();

    for (const player of all) {
      if (!player.code_fiche || player.code_fiche == "pas de fiche" || !player.division || !player.oc_url || !player.id)
        continue;

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

// --- add_fiche command ---
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
    await add_id(jid, { code_fiche, division });
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

// --- del_fiche command ---
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
