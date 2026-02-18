const { ovlcmd } = require("../lib/ovlcmd");
const { getData, setfiche, getAllFiches, add_id, del_fiche } = require('../DataBase/allstars_divs_fiches');

const registeredFiches = new Set();

// ================= UTIL =================

function normalizeText(text = "") {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function countCards(cardsRaw) {
  if (!cardsRaw) return 0;
  return cardsRaw.split("\n").map(x => x.trim()).filter(Boolean).length;
}

// ================= LEVEL =================

const LEVEL_REWARD_FIXED = {
  golds: 500000,
  fans: 50000
};

async function giveLevelRewards(jid, level, ovl, ms) {
  const data = await getData({ jid });
  if (!data) return;

  for (const [col, value] of Object.entries(LEVEL_REWARD_FIXED)) {
    const newVal = (Number(data[col]) || 0) + value;
    await setfiche(col, newVal, jid);
  }

  await ovl.sendMessage(ms, {
    text:
`🎁 Récompenses niveau ${level}
golds +${LEVEL_REWARD_FIXED.golds}
fans +${LEVEL_REWARD_FIXED.fans}`
  });
}

async function checkLevel(jid, oldExp, newExp, ovl, ms_org) {
  const data = await getData({ jid });
  if (!data) return;

  let currentLevel = Number(data.niveau) || 1;
  const maxLevel = 20;

  const oldLevelByExp = Math.floor(oldExp / 100);
  const newLevelByExp = Math.floor(newExp / 100);

  if (newLevelByExp > oldLevelByExp) {
    for (let i = 0; i < newLevelByExp - oldLevelByExp; i++) {
      if (currentLevel >= maxLevel) break;
      currentLevel++;
      await setfiche("niveau", currentLevel, jid);

      await ovl.sendMessage(ms_org, {
        text: `🏆 Promotion niveau ${currentLevel}`,
        mentions: [jid]
      });

      await giveLevelRewards(jid, currentLevel, ovl, ms_org);
    }
  }

  if (newLevelByExp < oldLevelByExp) {
    for (let i = 0; i < oldLevelByExp - newLevelByExp; i++) {
      if (currentLevel <= 1) break;
      currentLevel--;
      await setfiche("niveau", currentLevel, jid);

      await ovl.sendMessage(ms_org, {
        text: `🔻 Descente niveau ${currentLevel}`,
        mentions: [jid]
      });
    }
  }
}

// ================= UPDATES =================

async function updatePlayerData(updates, jid, ovl, ms_org) {
  for (const u of updates) {
    await setfiche(u.colonne, u.newValue, jid);

    if (u.colonne === "exp") {
      await checkLevel(jid, Number(u.oldValue)||0, Number(u.newValue)||0, ovl, ms_org);
    }
  }
}

async function processUpdates(args, jid) {
  const data = await getData({ jid });
  if (!data) throw new Error("Fiche introuvable");

  const columns = Object.keys(data.dataValues ?? data);
  const updates = [];

  let i = 0;

  while (i < args.length) {
    const object = args[i++];
    const signe = args[i++];

    if (!columns.includes(object)) throw new Error(`Colonne inconnue: ${object}`);

    const oldValue = data[object];
    let texte = "";

    if (object === "commentaire") {
      texte = args.slice(i).join(" ");
      i = args.length;
    } else {
      let parts = [];
      while (
        i < args.length &&
        !['+','-','=','add','supp'].includes(args[i]) &&
        !columns.includes(args[i])
      ) {
        parts.push(args[i++]);
      }
      texte = parts.join(" ");
    }

    let newValue;

    if (object === "cards") {
      let list = (oldValue || "").split("\n").filter(Boolean);
      const items = texte.split(",").map(x=>x.trim()).filter(Boolean);

      if (signe === "+") {
        for (const c of items) {
          if (!list.some(x => normalizeText(x) === normalizeText(c))) list.push(c);
        }
      }
      else if (signe === "-") {
        list = list.filter(x => !items.map(normalizeText).includes(normalizeText(x)));
      }
      else if (signe === "=") {
        list = items;
      }

      newValue = list.join("\n");
      updates.push({ colonne: object, oldValue, newValue });
      continue;
    }

    if (signe === "+" || signe === "-") {
      const n1 = Number(oldValue)||0;
      const n2 = Number(texte)||0;
      newValue = signe === "+" ? n1+n2 : n1-n2;
    }
    else if (signe === "=") newValue = texte;
    else if (signe === "add") newValue = (oldValue + " " + texte).trim();
    else if (signe === "supp") {
      const regex = new RegExp(`\\b${texte}\\b`, "gi");
      newValue = oldValue.replace(regex,"").trim();
    }
    else throw new Error("Signe invalide");

    updates.push({ colonne: object, oldValue, newValue });
  }

  return updates;
}

// ================= ADD/INIT =================

async function addOrUpdateFiche(nom, jid, img, div) {
  const existing = await getData({ jid });

  if (existing) {
    await setfiche("code_fiche", nom, jid);
    await setfiche("division", div, jid);
    if (img) await setfiche("oc_url", img, jid);
    return;
  }

  await add_id(jid, {
    code_fiche: nom,
    division: div,
    oc_url: img || undefined
  });
}

function add_fiche(nom, jid, img, div) {
  if (registeredFiches.has(nom)) return;
  registeredFiches.add(nom);

  ovlcmd({ nom_cmd: nom, classe: div, react: "✅" },
  async (ms_org, ovl, { repondre, ms, arg, prenium_id }) => {

    try {
      const data = await getData({ jid });
      if (!data) return repondre("❌ Fiche introuvable.");
if (!arg.length) {

  const cardsText = data.cards
    ? data.cards.split("\n").filter(Boolean).join(" • ")
    : "";

  const fiche = `░▒▒░░▒░ *👤N E O P L A Y E R 🎮*
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
🎴 ${cardsText}

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™`;

  // 🎬 vidéo d’intro (comme avant)
  await ovl.sendMessage(ms_org, {
    video: { url: 'https://files.catbox.moe/0qzigf.mp4' },
    gifPlayback: true,
    caption: ""
  }, { quoted: ms });

  // 🖼️ image OC safe
  if (data.oc_url && data.oc_url.startsWith("http")) {
    return ovl.sendMessage(ms_org, {
      image: { url: data.oc_url },
      caption: fiche
    }, { quoted: ms });
  }

  return repondre(fiche);
}
      
      if (!prenium_id) return repondre("⛔ Accès refusé");

      const updates = await processUpdates(arg, jid);
      await updatePlayerData(updates, jid, ovl, ms_org);

      return repondre("✅ Fiche mise à jour");

    } catch (err) {
      console.error("ERREUR FICHE =", err);
      repondre("❌ Erreur paramètres.");
    }
  });
}

// ================= INIT AUTO =================

async function initFichesAuto() {
  const all = await getAllFiches();

  for (const p of all) {
    if (!p.jid || !p.code_fiche || p.code_fiche === "aucun") continue;
    add_fiche(p.code_fiche.trim(), p.jid, p.oc_url, p.division || "Other");
  }

  console.log("✔ fiches chargées:", registeredFiches.size);
}

initFichesAuto();

// ================= COMMANDES ADMIN =================

ovlcmd({ nom_cmd:"add_fiche", classe:"Other", react:"➕" },
async (ms_org, ovl, { repondre, arg, prenium_id }) => {
  if (!prenium_id) return repondre("⛔");
  if (arg.length < 3) return repondre("Syntaxe");

  const jid = arg[0];
  const code = arg[1];
  const div = arg.slice(2).join(" ");

  await addOrUpdateFiche(code, jid, "", div);
  await initFichesAuto();

  repondre("✅ fiche ajoutée");
});

ovlcmd({ nom_cmd:"del_fiche", classe:"Other", react:"🗑️" },
async (ms_org, ovl, { repondre, arg, prenium_id }) => {
  if (!prenium_id) return repondre("⛔");
  if (!arg.length) return repondre("Syntaxe");

  await del_fiche(arg.join(" "));
  repondre("✅ supprimée");
});
