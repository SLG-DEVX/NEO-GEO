const { ovlcmd } = require('../lib/ovlcmd');
const { MyNeoFunctions, TeamFunctions, BlueLockFunctions } = require("../DataBase/myneo_lineup_team");
const { cardsBlueLock } = require("../DataBase/cardsBL");
const { getData, setfiche } = require("../DataBase/allstars_divs_fiches");
const { saveUser: saveMyNeo, deleteUser: delMyNeo, getUserData: getNeo, updateUser: updateMyNeo } = MyNeoFunctions;
const { saveUser: saveTeam, deleteUser: delTeam, getUserData: getTeam, updateUser: updateTeam } = TeamFunctions;
const { saveUser: saveLineup, deleteUser: delLineup, getUserData: getLineup, updatePlayers, updateStats } = BlueLockFunctions;

// --- NORMALISATION NOM ---
const pureName = str => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

// --- EMOJI PAYS (UNICODE SAFE) ---
const countryEmojis = {
  "Japan": "\u{1F1EF}\u{1F1F5}",   // 🇯🇵
  "France": "\u{1F1EB}\u{1F1F7}",  // 🇫🇷
  "Brazil": "\u{1F1E7}\u{1F1F7}",  // 🇧🇷
  "Germany": "\u{1F1E9}\u{1F1EA}", // 🇩🇪
  "Malta": "\u{1F1F2}\u{1F1F9}"    // 🇲🇹
};

const getCountryEmoji = country => countryEmojis[country] || "";


// --- RECHERCHE JOUEUR DB AVEC OVR ---
function findPlayerInDB(inputName) {
  if (!inputName) return null;

  const input = pureName(inputName);
  const wantsNEL = /nel/i.test(inputName);

  console.log("Recherche joueur pour:", inputName, "=> normalisé:", input);

  const players = Object.values(cardsBlueLock);

  // 1️⃣ Match exact
  let exact = players.filter(p => pureName(p.name) === input);
  console.log("Exact match trouvés:", exact.map(p => p.name));
  if (exact.length) {
    exact.sort((a, b) => b.ovr - a.ovr);
    const p = exact[0];
    return `${p.name} (${p.ovr}) ${getCountryEmoji(p.country)}`;
  }

  // 2️⃣ Match partiel
  let filtered = players.filter(p => {
    const pname = pureName(p.name);
    if (!pname.includes(input)) return false;
    if (!wantsNEL && /nel/i.test(p.name)) return false;
    return true;
  });
  console.log("Match partiel trouvés:", filtered.map(p => p.name));

  if (!filtered.length) return null;

  filtered.sort((a, b) => b.ovr - a.ovr);
  const p = filtered[0];
  return `${p.name} (${p.ovr}) ${getCountryEmoji(p.country)}`;
}
  
// --- Helper ---
function normalizeJid(input) {
  if (!input) return null;
  if (input.endsWith("@s.whatsapp.net")) return input;
  if (/^\d+$/.test(input)) return input + "@s.whatsapp.net";
  return String(input);
}

function generateStarterLineupFromDB() {
  // 1️⃣ Récupération DB
  const allPlayers = Object.values(cardsBlueLock);
  if (!allPlayers.length) {
    throw new Error("cardsBlueLock vide");
  }

  // 2️⃣ Filtre rang B
  const rankB = allPlayers.filter(p =>
    p &&
    p.rank === "B" &&
    typeof p.name === "string" &&
    typeof p.ovr === "number" &&
    typeof p.country === "string"
  );

  // 3️⃣ Séparation OVR
  const ovr78 = rankB.filter(p => p.ovr === 78);
  const ovrLow = rankB.filter(p => [75, 76, 77].includes(p.ovr));

  if (ovr78.length < 2 || ovrLow.length < 8) {
    throw new Error(
      `Pas assez de joueurs B (78:${ovr78.length}, low:${ovrLow.length})`
    );
  }

  // 4️⃣ Shuffle sécurisé
  const shuffle = arr => arr
    .map(v => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.v);

  // 5️⃣ Sélection
  const selected78 = shuffle(ovr78).slice(0, 2);
  const selectedLow = shuffle(ovrLow).slice(0, 8);
  const starters = shuffle([...selected78, ...selectedLow]);

  // 6️⃣ FORMAT FINAL (DB SAFE + FLAG UNICODE)
  return starters.map(p => {
    const flag = getCountryEmoji(p.country); // ✅ Unicode safe
    return `${p.name} (${p.ovr}) ${flag}`.trim();
  });
    }


function normalizeName(str) {
    return String(str || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .toLowerCase()
        .trim();
}

async function findTeamJidByUsers(targetName) {
    const allPlayersObj = await getData({ allPlayers: true });
    if (!allPlayersObj || typeof allPlayersObj !== "object") return null;

    const target = normalizeName(targetName);

    for (const fiche of Object.values(allPlayersObj)) {
        if (!fiche || fiche.team !== "⚽") continue;

        const usersName = normalizeName(fiche.users);
        if (usersName === target) {
            return fiche.jid;
        }
    }
    return null;
}


// ------------------- Commandes -------------------
ovlcmd({
  nom_cmd: "save",
  classe: "Other",
  react: "💾",
  desc: "Enregistrer un joueur (myneo/team/lineup)",
}, async (ms_org, ovl, cmd) => {
  const { arg, repondre, prenium_id } = cmd;

  if (!prenium_id) return repondre("⚠️ Seuls les membres de la NS peuvent enregistrer un joueur.");
 const mention = normalizeJid(arg[0]); 
  if (!mention) return repondre("⚠️ Mentionne un utilisateur.");

  const type = arg[1]?.toLowerCase();
  const bases = { 
    myneo: {
      users: "aucun", tel: mention.replace("@s.whatsapp.net",""), points_jeu: 0, nc: 0, np: 0,
      coupons: 0, gift_box: 0, all_stars: "", blue_lock: "+Team⚽", elysium: "+ElysiumMe💠"
    },
    team: {
      users: "aucun", team: "aucun", argent: 0, classement: "aucun", wins: 0, loss: 0, niveau: 0, trophies: 0, goals: 0
    },
    lineup: {} // on remplira plus bas après génération
  };

  const saves = { myneo: saveMyNeo, team: saveTeam, lineup: saveLineup };
  const gets = { myneo: getNeo, team: getTeam, lineup: getLineup };

  if (!bases[type]) return repondre("⚠️ Type invalide. Utilise : myneo, team ou lineup.");

  // Vérifier si le joueur existe déjà
  const existing = await gets[type](mention);
  if (existing) return repondre("⚠️ Ce joueur est déjà enregistré.");

  let base = { ...bases[type] };

  // --- Génération lineup si type = 'lineup' ---
  if (type === "lineup") {
    let starters = [];
    try {
      starters = generateStarterLineupFromDB(); // sync, ou await si async
    } catch (e) {
  console.error("LINEUP GEN ERROR:", e.message);
  return repondre("⚠️ Impossible de générer le lineup de départ.");
    }

    base = {
      nom: "Starter Squad",
      joueur1: starters[0] || "",
      joueur2: starters[1] || "",
      joueur3: starters[2] || "",
      joueur4: starters[3] || "",
      joueur5: starters[4] || "",
      joueur6: starters[5] || "",
      joueur7: starters[6] || "",
      joueur8: starters[7] || "",
      joueur9: starters[8] || "",
      joueur10: starters[9] || "",
      joueur11: "",
      joueur12: "",
      joueur13: "",
      joueur14: "",
      joueur15: "",
      stat1: 100, stat2: 100, stat3: 100, stat4: 100,
      stat5: 100, stat6: 100, stat7: 100, stat8: 100,
      stat9: 100, stat10: 100
    };
  }

  // --- Mise à jour des champs supplémentaires depuis les arguments ---
  for (let i = 2; i < arg.length; i += 2) {
    const key = arg[i]?.toLowerCase();
    const val = arg[i + 1];
    if (key in base) {
      base[key] = isNaN(val) ? val : parseInt(val);
    }
  }

  try {
    const msg = await saves[type](mention, base);
    return repondre(msg || "✅ Joueur enregistré avec succès !");
  } catch (e) {
    console.error("❌ Erreur save:", e);
   return repondre("⚠️ Une erreur est survenue lors de l'enregistrement.");
  }
});


// DELETE
ovlcmd({
  nom_cmd: "delete",
  classe: "Other",
  react: "🗑️",
  desc: "Supprimer un joueur (myneo/team/lineup)",
}, async (ms_org, ovl, cmd) => {
  const { arg, repondre, prenium_id } = cmd;
  if (!prenium_id) return repondre("⚠️ Seuls les membres de la NS peuvent supprimer un joueur.");
  const rawMention = arg[0];
  if (!rawMention) return repondre("⚠️ Mentionne un utilisateur.");
  const mention = normalizeJid(rawMention);
  const type = arg[1]?.toLowerCase();
  const dels = { myneo: delMyNeo, team: delTeam, lineup: delLineup };
  if (!dels[type]) return repondre("⚠️ Type invalide. Utilise : myneo, team ou lineup.");

  const msg = await dels[type](mention);
  return repondre(msg);
});


// --- Commande myneo🔷 ---
ovlcmd({
  nom_cmd: "myneo🔷",
  classe: "Other",
  react: "🪪",
  desc: "Afficher ou modifier les données NEO d'un joueur.",
}, async (ms_org, ovl, cmd_options) => {
  const { arg, auteur_Message, prenium_id, repondre } = cmd_options;
  const userId = arg.length >= 1 && arg[0].includes("@") ? normalizeJid(arg[0]) : auteur_Message;

  try {
    const data = await getNeo(userId);
    if (!data) return repondre("⚠️ Aucune donnée trouvée pour cet utilisateur.");

    // 1️⃣ Affichage compte
    if (arg.length <= 1) {
      const myn = `╭───〔 *🪀 COMPTE NEO 🔷* 〕
👤User: ${data.users}
📳Téléphone: ${data.tel}
👑NEOscore: ${data.ns}👑
🔷NEOcoins: ${data.nc}🔷
🔶NEOpoints: ${data.np}🔶
🎫Coupons: ${data.coupons}🎫

🎮MY GAMES🪀
🌀All Stars: ${data.all_stars}
⚽Blue Lock: ${data.blue_lock}
💠Élysium: ${data.elysium}
╰───────────────────
🔷NEOVERSE🎮`;

      await ovl.sendMessage(ms_org,{video:{url:"https://files.catbox.moe/yimc4o.mp4"},gifPlayback:true},{quoted:cmd_options.ms});
      return await ovl.sendMessage(ms_org,{image:{url:"https://files.catbox.moe/nyy6fb.jpg"},caption:myn},{quoted:cmd_options.ms});
    }

    // 2️⃣ Vérification prenium
    if (!prenium_id) return repondre("⚠️ Seuls les membres Premium peuvent actualiser un joueur.");

    const modifiables = ["users","tel","ns","nc","np","coupons","gift_box","all_stars","blue_lock","elysium"];
    let updates = {};
    let nsDelta = 0;

    // 3️⃣ Lecture des arguments
    for (let i = 1; i < arg.length;) {
      const field = arg[i]?.toLowerCase();
      const op = arg[i + 1];
      if (!modifiables.includes(field) || !["=", "+", "-"].includes(op)) { i++; continue; }

      const isNumeric = ["ns","nc","np","coupons","gift_box"].includes(field);
      let value;

      if (op === "=" && !isNumeric) {
        let valParts=[], j=i+2;
        while(j<arg.length && !modifiables.includes(arg[j]?.toLowerCase())) valParts.push(arg[j++]);
        value = valParts.join(" "); i=j;
      } else {
        value = arg[i+2]; i+=3;
      }

      if (value !== undefined) {
        if (isNumeric) {
          const val = parseInt(value);
          if (!isNaN(val)) {
            if (field==="ns") {
              if(op==="=") nsDelta = val-(data.ns||0);
              else if(op==="+") nsDelta = val;
              else if(op==="-") nsDelta = -val;
            } else {
              if(op==="=") updates[field]=val;
              else if(op==="+") updates[field]=(data[field]||0)+val;
              else if(op==="-") updates[field]=(data[field]||0)-val;
            }
          }
        } else if(op==="=") updates[field]=value;
      }
    }

    if('np' in updates) updates.np = Math.min(updates.np, 20);

    if(Object.keys(updates).length===0 && nsDelta===0)
      return repondre("⚠️ Aucun champ mis à jour. Exemple : +myNeo @user nc + 200 ou ns + 1");

    // 4️⃣ NS via giveNS
    if(nsDelta!==0) await giveNS(userId, nsDelta, ovl, ms_org);

    // 5️⃣ Mise à jour autres champs
    if(Object.keys(updates).length>0){
      const msg = await updateMyNeo(userId, updates);
      return repondre(msg || "✅ Joueur mis à jour avec succès !");
    } else {
      return repondre("✅ Joueur mis à jour avec succès !");
    }

  } catch(err) {
    console.error("❌ Erreur myNeo:", err);
    return repondre("❌ Une erreur est survenue.");
  }
});

// --- Fonction centralisée pour ajouter des NS (automatique et safe) ---
async function giveNS(userId, amount, ovl, ms_org) {
  try {
    if (!amount || amount === 0) return;

    // 1️⃣ Récupération données actuelles
    const data = await getNeo(userId);
    if (!data) return;

    const ancienNS = data.ns || 0;
    const nouveauNS = ancienNS + amount;

    // 2️⃣ Détermination des paliers
    const lastReward = Number.isFinite(data.lastRewardNS) ? data.lastRewardNS : 0;
    const dernierPalier = Math.floor(lastReward / 100);
    const palierActuel = Math.floor(nouveauNS / 100);
    const paliersGagnes = palierActuel - dernierPalier;

    // 3️⃣ Mise à jour NS de la DB
    await updateMyNeo(userId, { ns: nouveauNS });

    // 4️⃣ Gestion des récompenses si nouveaux paliers franchis
    if (paliersGagnes > 0) {
      const recompenses = {
        golds: 500_000 * paliersGagnes,
        nc: 50 * paliersGagnes,
        coupons: 25 * paliersGagnes
      };

      // Mise à jour des champs NC et coupons + dernier palier
      await updateMyNeo(userId, {
        nc: (data.nc || 0) + recompenses.nc,
        coupons: (data.coupons || 0) + recompenses.coupons,
        lastRewardNS: palierActuel * 100
      });

      // ⚡ Mise à jour golds dans AllStars
      const allStarsFiche = await getData({ jid: userId });
      await setfiche("golds", (allStarsFiche.golds || 0) + recompenses.golds, userId);

      // ⚡ Message au joueur
      const mention = data.users || "@player";
      const message = `🎉👑 LEVEL UP ROYALITY XP 👑
Félicitations ${mention}, tu as franchi les ${palierActuel*100}👑 royalities !
💰 +${recompenses.golds} golds
🔷 +${recompenses.nc} NC
🎫 +${recompenses.coupons} coupons
💯 Royalities👑🎉`;

      await ovl.sendMessage(ms_org, { text: message });
      console.log(`[NS] ${mention} : +${amount} NS => palier ${palierActuel} (gain ${paliersGagnes} palier(s))`);
    } else {
      console.log(`[NS] ${data.users || userId} : +${amount} NS (pas de palier atteint)`);
    }

  } catch(err) {
    console.error("❌ Erreur giveNS:", err);
  }
}

ovlcmd({
  nom_cmd: "team⚽",
  classe: "Other",
  react: "⚽",
  desc: "Afficher ou modifier la team d’un joueur.",
}, async (ms_org, ovl, cmd_options) => {
  const { arg, auteur_Message, prenium_id, repondre } = cmd_options;
  let userId = auteur_Message;
  if (arg.length >= 1) {
    userId = arg[0];
    if (!userId) return repondre("⚠️ Mentionne un utilisateur.");
  }

  try {
    let data = await getTeam(userId);
    if (!data) return repondre("⚠️ Aucune donnée trouvée pour cet utilisateur.");

    if (arg.length <= 1) {
      const fiche = `░░ *👤PLAYER🥅⚽*: ${data.users}
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
*🛡️Team:* ${data.team}
*⬆️Niveau:* ${data.niveau}▲
*💰Argent:* ${data.argent} 💶
*🎖️Classement:* ${data.classement}

░░ *📊RECORDS⚽🥅*
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
*✅Wins:* ${data.wins}   *❌Loss:* ${data.loss}   *⚽Goals:* ${data.goals}
░▒▒▒▒░ *🏆Trophies:* ${data.trophies}

╭───〔 *⚽DATAS📊🔷* 〕───⬣
🥅+Lineup⚽: ⚠️pour voir la formation
🌍+player⚽: ⚠️pour voir son Hero

╰───────────────────
                 *BLUE🔷LOCK⚽*`;

      return await ovl.sendMessage(ms_org, {
        image: { url: "https://files.catbox.moe/2patx3.jpg" },
        caption: fiche,
      }, { quoted: cmd_options.ms });
    }

    if (!prenium_id) return repondre("⚠️ Seuls les membres de la NS peuvent actualiser une team.");

    const modifiables = [
      "users", "team", "niveau",
      "argent", "classement", "wins", "loss", "goals", "trophies",
    ];

    let updates = {};
    for (let i = 1; i < arg.length;) {
      const field = arg[i]?.toLowerCase();
      const op = arg[i + 1];
      if (!modifiables.includes(field) || !["=", "+", "-"].includes(op)) { i++; continue; }

      const isNumeric = [
        "niveau", "argent", "classement",
        "wins", "loss", "goals", "trophies",
      ].includes(field);

      let value;
      if (op === "=" && !isNumeric) {
        let valParts = [], j = i + 2;
        while (j < arg.length && !modifiables.includes(arg[j].toLowerCase())) valParts.push(arg[j++]);
        value = valParts.join(" "); i = j;
      } else {
        value = arg[i + 2]; i += 3;
      }

      if (value !== undefined) {
        if (isNumeric) {
          const val = parseInt(value);
          if (!isNaN(val)) {
            if (op === "=") updates[field] = val;
            else if (op === "+") updates[field] = data[field] + val;
            else if (op === "-") updates[field] = data[field] - val;
          }
        } else if (op === "=") updates[field] = value;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      
      const message = await updateTeam(userId, updates);
      return repondre(message);
    } else {
      return repondre("⚠️ Format incorrect ou champ non valide. Exemple : +team @user wins + 2 team = BlueLock Elite");
    }

  } catch (err) {
    console.error("❌ Erreur ligne team:", err);
    return repondre("❌ Une erreur est survenue.");
  }
});
 
ovlcmd({
    nom: "stats_lineup",
    isfunc: true
}, async (ms_org, ovl, { texte, getJid }) => {
    try {
        if (!texte) return;
        const mots = texte.trim().toLowerCase().split(/\s+/);

        // Exemple : @user j1 + 5
        if (mots.length === 4 && mots[0].startsWith("@")) {
            const userW = mots[0].slice(1);
            let userId;

            if (userW.endsWith("lid")) {
                userId = await getJid(userW, ms_org, ovl);
            } else {
                userId = userW + "@s.whatsapp.net";
            }

            const joueurKey = mots[1];
            if (/^j\d+$/.test(joueurKey)) {
                const statKey = `stat${joueurKey.replace("j", "")}`;
                const signe = mots[2];
                const valeur = parseInt(mots[3], 10);

                if (!isNaN(valeur) && valeur > 0 && ["+", "-"].includes(signe)) {
                    await updateStats(userId, statKey, signe, valeur);
                }
            }

        // Exemple : @user reset_stats
        } else if (mots.length === 2 && mots[1] === "reset_stats" && mots[0].startsWith("@")) {
            const userW = mots[0].slice(1);
            let userId;

            if (userW.endsWith("lid")) {
                userId = await getJid(userW, ms_org, ovl);
            } else {
                userId = userW + "@s.whatsapp.net";
            }

            if (typeof BlueLockFunctions?.resetStats === "function") {
                await BlueLockFunctions.resetStats(userId);
            }
        }

    } catch (e) {
        console.error("❌ Erreur stats_lineup:", e);
    }
});

/* ================= LISTENER AUTOMATIQUE MATCH RESULTS ================= */
/* ================= LISTENER AUTOMATIQUE MATCH RESULTS ================= */
ovlcmd({
    nom: "match_results_listener",
    isfunc: true
}, async (ms_org, ovl, { texte, ms }) => {
    if (!texte) return;
    if (!texte.includes("🔷⚽ MATCH RESULTS 🥅")) return;

    try {
        // ─── PARSE MATCH ───
        const matchLine = texte.match(
            /👤\s*(.+?)\s*\*(\d+)\s*-\s*(\d+)\*\s*👤\s*(.+?)\s*(?:\n|$)/
        );

        const ratingLine = texte.match(
            /📊Rating:\s*(✅|❌)\s*-\s*📊Rating:\s*(✅|❌)/
        );

        console.log("MATCH LINE:", matchLine);
        console.log("RATING LINE:", ratingLine);

        if (!matchLine || !ratingLine) return;

        let [_, name1, score1, score2, name2] = matchLine;
        let [__, rating1, rating2] = ratingLine;

        // ─── Fonction pour trouver le JID depuis le nom ───
        async function findTeamJidByUsers(name) {
            if (!name) return null;

            const cleanName = n =>
                n.normalize("NFKC")
                 .replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '')
                 .replace(/[^\p{L}\p{N}\s]/gu, '')
                 .trim();

            const target = cleanName(name);

            const allTeams = await TeamFunctions.getAllTeams();
            if (!allTeams || !allTeams.length) return null;

            for (let team of allTeams) {
                if (!team.users || team.users === "aucun") continue;

                const teamUsersClean = cleanName(team.users);

                if (teamUsersClean === target) {
                    return team.id;
                }
            }

            return null;
        }

        // Nettoyage noms
        const cleanName = n =>
            n.normalize("NFKC")
             .replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '')
             .replace(/[^\p{L}\p{N}\s]/gu, '')
             .trim();

        name1 = cleanName(name1);
        name2 = cleanName(name2);

        // ─── Récupération JID ───
        const jid1 = await findTeamJidByUsers(name1);
        const jid2 = await findTeamJidByUsers(name2);

        if (!jid1 || !jid2) {
            console.log("MATCH RESULTS — joueur introuvable", { name1, name2 });
            return;
        }

        const data1 = await TeamFunctions.getUserData(jid1);
        const data2 = await TeamFunctions.getUserData(jid2);
        if (!data1 || !data2) return;

        const s1 = parseInt(score1, 10);
        const s2 = parseInt(score2, 10);

        // ─── GOALS ───
        await TeamFunctions.updateUser(jid1, { goals: (data1.goals || 0) + s1 });
        await TeamFunctions.updateUser(jid2, { goals: (data2.goals || 0) + s2 });

        // ─── WINS / LOSS ───
        if (s1 > s2) {
            await TeamFunctions.updateUser(jid1, { wins: (data1.wins || 0) + 1 });
            await TeamFunctions.updateUser(jid2, { loss: (data2.loss || 0) + 1 });
        } else if (s2 > s1) {
            await TeamFunctions.updateUser(jid2, { wins: (data2.wins || 0) + 1 });
            await TeamFunctions.updateUser(jid1, { loss: (data1.loss || 0) + 1 });
        }

        // ─── NIVEAU ───
        if (rating1 === "✅") await TeamFunctions.updateUser(jid1, { niveau: (data1.niveau || 0) + 1 });
        if (rating1 === "❌") await TeamFunctions.updateUser(jid1, { niveau: Math.max(0, (data1.niveau || 0) - 1) });
        if (rating2 === "✅") await TeamFunctions.updateUser(jid2, { niveau: (data2.niveau || 0) + 1 });
        if (rating2 === "❌") await TeamFunctions.updateUser(jid2, { niveau: Math.max(0, (data2.niveau || 0) - 1) });

        // ─── CLASSEMENT ───
        const allTeams = await TeamFunctions.getAllTeams();
        if (!allTeams || !allTeams.length) return;

        const blueLockTeams = allTeams.filter(
            t => t.team === "⚽" && t.users && t.users !== "aucun"
        );

        blueLockTeams.sort((a, b) => {
            if ((b.goals || 0) !== (a.goals || 0)) return b.goals - a.goals;
            if ((b.wins || 0) !== (a.wins || 0)) return b.wins - a.wins;
            if ((b.niveau || 0) !== (a.niveau || 0)) return b.niveau - a.niveau;
            return (a.loss || 0) - (b.loss || 0);
        });

        const emojies = ["🥇", "🥈", "🥉"];
        for (let i = 0; i < blueLockTeams.length; i++) {
            const c = emojies[i] || `${i + 1}e`;

            await TeamFunctions.updateUser(blueLockTeams[i].id, {
                classement: `${c}: ${blueLockTeams[i].users} | ${blueLockTeams[i].goals || 0} ⚽`
            });
        }

        await ovl.sendMessage(ms_org, { text: "✅ Résultats du match mis à jour !" }, { quoted: ms });

    } catch (e) {
        console.error("❌ Erreur listener MATCH RESULTS :", e);
    }
});

/* ================= COMMANDE +CLASSEMENT⚽ ================= */
ovlcmd({
    nom_cmd: "classement⚽",
    classe: "Other",
    react: "🏆",
    desc: "Afficher le classement complet des joueurs Blue🔷Lock."
}, async (ms_org, ovl) => {
    try {
        const allPlayersObj = await getData({ allPlayers: true });
        const allTeams = Object.values(allPlayersObj)
            .filter(d => d.team === "⚽" && d.name);

        if (!allTeams.length) {
            return ovl.sendMessage(ms_org, { text: "⚠️ Aucun joueur enregistré avec une team⚽." });
        }

        // Tri : goals > wins > niveau > loss
        allTeams.sort((a, b) => {
            if ((b.goals || 0) !== (a.goals || 0)) return (b.goals || 0) - (a.goals || 0);
            if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
            if ((b.niveau || 0) !== (a.niveau || 0)) return (b.niveau || 0) - (a.niveau || 0);
            return (a.loss || 0) - (b.loss || 0);
        });

        let classementTexte = "*🏆CLASSEMENT BLUE🔷LOCK⚽ 🏆*\n▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n";
        const emojies = ["🥇", "🥈", "🥉"];

        for (let i = 0; i < allTeams.length; i++) {
            const emoji = emojies[i] || `${i + 1}e`;
            classementTexte += `${emoji}: ${allTeams[i].name} | ${allTeams[i].goals || 0} ⚽\n`;
        }

        classementTexte += "\n╰───────────────────\n                  *BLUE🔷LOCK⚽🥅*";

        await ovl.sendMessage(ms_org, { text: classementTexte });

    } catch (e) {
        console.error("❌ Erreur commande +classement⚽ :", e);
        await ovl.sendMessage(ms_org, { text: "❌ Une erreur est survenue lors de l'affichage du classement." });
    }
});
