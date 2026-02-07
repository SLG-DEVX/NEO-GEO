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

        if (mots.length === 4 && mots[0].startsWith("@")) {
            const userW = mots[0].slice(1);
            let userId;
            if (userW.endsWith('lid')) {
                userId = await getJid(userW, ms_org, ovl);
            }

            const joueurKey = mots[1];
            if (/^j\d+$/.test(joueurKey)) {
                const statKey = `stat${joueurKey.replace("j", "")}`;
                const signe = mots[2];
                const valeur = parseInt(mots[3], 10);
                if (!isNaN(valeur) && valeur > 0 && ['+', '-'].includes(signe)) {
                    await updateStats(userId, statKey, signe, valeur);
                }
            }
        } else if (mots.length === 2 && mots[1] === "reset_stats" && mots[0].startsWith("@")) {
            const userW = mots[0].slice(1);
            let userId;
            if (userW.endsWith('lid')) {
                userId = await getJid(userW, ms_org, ovl);
            }
            if (typeof BlueLockFunctions?.resetStats === "function") {
                await BlueLockFunctions.resetStats(userId);
            }
        }
    } catch (e) {
        // console.error("Erreur stats_lineup:", e);
    }
});

// ──────────────────────────────────────────────
// LISTENER AUTO MATCH RESULTS
// ──────────────────────────────────────────────
ovlcmd({
  nom: "auto_match_results",
  isfunc: true
}, async (ms_org, ovl, { texte }) => {
  await handleMatchResults(texte, ovl, ms_org);
});


// ──────────────────────────────────────────────
// TRAITEMENT MATCH RESULTS + UPDATE CLASSEMENT
// ──────────────────────────────────────────────
async function handleMatchResults(texte, ovl, ms_org) {
  try {
    if (!texte || !texte.includes("MATCH RESULTS")) return;

    // ─── PARSING MATCH ───
const linePlayers = texte.match(
  /👤(.+?)\s+\*(\d+)\s-\s(\d+)\*\s+👤(.+)/
);
const lineRatings = texte.match(
  /📊Rating:\s*(✅|❌)?\s+-\s+📊Rating:\s*(✅|❌)?/
);

    if (!linePlayers) return;

    const joueur1Name = linePlayers[1].trim();
    const score1 = parseInt(linePlayers[2], 10);
    const score2 = parseInt(linePlayers[3], 10);
    const joueur2Name = linePlayers[4].trim();

    const rating1 = lineRatings?.[1] || null;
    const rating2 = lineRatings?.[2] || null;

    // ─── RÉCUPÉRATION TEAMS ───
    const allTeams = await getTeam();
    if (!allTeams) return;

    const team1Entry = Object.entries(allTeams).find(
      ([_, d]) => pureName(d.users) === pureName(joueur1Name)
    );
    const team2Entry = Object.entries(allTeams).find(
      ([_, d]) => pureName(d.users) === pureName(joueur2Name)
    );

    if (!team1Entry || !team2Entry) return;

    const [jid1, data1] = team1Entry;
    const [jid2, data2] = team2Entry;

    const updates1 = {};
    const updates2 = {};

    // ─── GOALS ───
    updates1.goals = (data1.goals || 0) + score1;
    updates2.goals = (data2.goals || 0) + score2;

    // ─── NIVEAU ───
    if (rating1 === "❌") updates1.niveau = (data1.niveau || 0) - 1;
    else if (rating1 === "✅" && score1 > 0) updates1.niveau = (data1.niveau || 0) + 1;

    if (rating2 === "❌") updates2.niveau = (data2.niveau || 0) - 1;
    else if (rating2 === "✅" && score2 > 0) updates2.niveau = (data2.niveau || 0) + 1;

    // ─── WINS / LOSS ───
    if (score1 > score2) {
      updates1.wins = (data1.wins || 0) + 1;
      updates2.loss = (data2.loss || 0) + 1;
    } else if (score2 > score1) {
      updates2.wins = (data2.wins || 0) + 1;
      updates1.loss = (data1.loss || 0) + 1;
    }

    // ─── UPDATE DB DES JOUEURS ───
    await updateTeam(jid1, updates1);
    await updateTeam(jid2, updates2);

    console.log(`⚽ MATCH AUTO OK : ${joueur1Name} ${score1}-${score2} ${joueur2Name}`);

    // ─── UPDATE CLASSEMENT GLOBAL APRÈS CHAQUE MATCH ───
    await updateGlobalRanking();

  } catch (err) {
    console.error("❌ handleMatchResults error:", err);
  }
}


// ──────────────────────────────────────────────
// CLASSEMENT AUTOMATIQUE PAR GOALS + DÉPARTAGE
// ──────────────────────────────────────────────
async function updateGlobalRanking() {
  try {
    const allTeams = await getTeam();
    if (!allTeams) return;

    const teamsArray = Object.entries(allTeams)
      .map(([jid, data]) => ({
        jid,
        users: data.users,
        goals: data.goals || 0,
        wins: data.wins || 0,
        niveau: data.niveau || 0,
        loss: data.loss || 0
      }))
      .filter(t => t.users && typeof t.goals === "number");

    if (teamsArray.length === 0) return;

    // ─── TRI AVEC DÉPARTAGE ───
    teamsArray.sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;        // plus de buts
      if (b.wins !== a.wins) return b.wins - a.wins;          // plus de victoires
      if (b.niveau !== a.niveau) return b.niveau - a.niveau;  // plus de niveau
      return a.loss - b.loss;                                  // moins de défaites
    });

    // ─── ATTRIBUTION CLASSEMENT VISUEL ───
    for (let i = 0; i < teamsArray.length; i++) {
      let rankLabel;
      if (i === 0) rankLabel = "1er🥇";
      else if (i === 1) rankLabel = "2e🥈";
      else if (i === 2) rankLabel = "3e🥉";
      else rankLabel = `${i + 1}e`;

      await updateTeam(teamsArray[i].jid, { classement: rankLabel });
    }

    console.log("🏆 Classement mis à jour automatiquement avec départage");

  } catch (err) {
    console.error("❌ updateGlobalRanking error:", err);
  }
}


// ──────────────────────────────────────────────
// COMMANDE +classement⚽ POUR AFFICHER TOUT LE CLASSEMENT
// ──────────────────────────────────────────────
ovlcmd({
  nom_cmd: "classement⚽",
  classe: "Other",
  react: "🏆",
  desc: "Afficher le classement complet des joueurs par goals",
}, async (ms_org, ovl, cmd) => {
  try {
    const { repondre } = cmd;

    const allTeams = await getTeam();
    if (!allTeams) return repondre("⚠️ Aucune team enregistrée.");

    const teamsArray = Object.values(allTeams)
      .filter(d => d.users && typeof d.goals === "number")
      .sort((a, b) => b.goals - a.goals);

    if (teamsArray.length === 0) return repondre("⚠️ Aucune team valide.");

    let text = `*🏆CLASSEMENT BLUE🔷LOCK⚽ 🏆*\n`;
    text += "▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n";

    teamsArray.forEach((d, i) => {
      let rankLabel;
      if (i === 0) rankLabel = "1er🥇";
      else if (i === 1) rankLabel = "2e🥈";
      else if (i === 2) rankLabel = "3e🥉";
      else rankLabel = `${i + 1}e`;

      text += `${rankLabel}: ${d.users} | ${d.goals} ⚽\n`;
    });

    text += "\n╰───────────────────\n";
    text += "                  *BLUE🔷LOCK⚽🥅*";

    return repondre(text);

  } catch (err) {
    console.error("❌ +classement⚽ error:", err);
    return repondre("❌ Une erreur est survenue lors de l'affichage du classement.");
  }
});
