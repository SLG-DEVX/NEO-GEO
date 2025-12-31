const { ovlcmd } = require('../lib/ovlcmd');
const fs = require('fs');
const { cards } = require('../DataBase/cards');
const { MyNeoFunctions } = require("../DataBase/myneo_lineup_team");
const { getData, setfiche } = require("../DataBase/allstars_divs_fiches");

// --- Helpers ---
const generateRandomNumbers = (min, max, count) => {
  const numbers = new Set();
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(numbers);
};

const generateRewards = () => {
  const rewards = ['50🔷', '100.000 G🧭', '25🎟','100.000💶' ];
  return rewards.sort(() => 0.5 - Math.random()).slice(0, 3);
};

function tirerParProbabilite(table) {
  const random = Math.random() * 100;
  let cumulative = 0;
  for (const item of table) {
    cumulative += item.probability;
    if (random < cumulative) return item.value;
  }
  return table[table.length - 1].value;
}

function getAllCategories(type) {
  return [...new Set(cards[type].map(card => card.category))];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function trouverCarte(type, gradeInit, catInit, tirees) {
  const grades = ['or', 'argent', 'bronze'];
  const tries = [gradeInit, ...shuffle(grades.filter(g => g !== gradeInit))];
  const cats = getAllCategories(type);
  for (const g of tries) {
    const catTry = [catInit, ...cats.filter(c => c !== catInit)];
    for (const c of catTry) {
      const dispo = cards[type].filter(
        x => x.grade === g && x.category === c && !tirees.includes(x.name)
      );
      if (dispo.length) return dispo[Math.floor(Math.random() * dispo.length)];
    }
  }
  return null;
}

async function envoyerCarte(dest, ovl, ms, type, gradeTable, catTable, tirees) {
  for (let i = 0; i < 10; i++) {
    const grade = tirerParProbabilite(gradeTable);
    const category = tirerParProbabilite(catTable);
    const card = trouverCarte(type, grade, category, tirees);
    if (card) {
      tirees.push(card.name);
      await ovl.sendMessage(dest, {
        image: { url: card.image },
        caption: `Grade: ${card.grade}\nCategory: ${card.category}\nName: ${card.name}\nPrix: ${card.price}`
      }, { quoted: ms });
      return;
    }
  }
  throw new Error("Aucune carte valide trouvée");
}

async function envoyerVideo(dest, ovl, videoUrl) {
  await ovl.sendMessage(dest, { video: { url: videoUrl }, gifPlayback: true });
}

// --- Check Jackpot ---
async function checkJackpot(auteur, ovl, ms_org, ms) {
  try {
    const user = await MyNeoFunctions.getUserData(auteur);
    const fiche = await getData({ jid: auteur });
    if (!user || !fiche) return;
    if ((parseInt(user.wins_roulette) || 0) < 3) return;

    await setfiche("golds", parseInt(fiche.golds) + 1000000, auteur);
    await MyNeoFunctions.updateUser(auteur, {
      nc: parseInt(user.nc) + 100,
      coupons: parseInt(user.coupons) + 100,
      wins_roulette: 0
    });

    await ovl.sendMessage(ms_org, {
      video: { url: "https://files.catbox.moe/vfv2hk.mp4" },
      gifPlayback: true,
      caption: 
`FÉLICITATIONS!! 🥳🥳🎉🎉🎉🍾🍾💯 @${auteur.split('@')[0]} a réussi le *JACKPOT* 🎰🔥  
Tes récompenses ont été ajoutées 🎁🎁
╰───────────────────
▒▒▒▒░░ *NEO🎰CASINO* ▚▙▚▚▚`
    }, { quoted: ms });

  } catch (e) {
    console.error("Erreur JACKPOT :", e);
  }
}

// --- Commande Roulette ---
ovlcmd({
  nom_cmd: 'roulette',
  classe: 'NEO_GAMES🎰',
  react: '🎰',
  desc: 'Lance une roulette aléatoire avec récompenses.'
}, async (ms_org, ovl, { ms, repondre, auteur_Message }) => {

  const rouletteHandler = async () => {
    try {
      const authorizedChats = [
        '120363024647909493@g.us',
        '120363307444088356@g.us', 
        '120363403433342575@g.us', 
        '22651463203@s.whatsapp.net',
        '22605463559@s.whatsapp.net'
      ];
      if (!authorizedChats.includes(ms_org)) return repondre("Commande non autorisée pour ce chat.");

      const userData = await MyNeoFunctions.getUserData(auteur_Message);
if (!userData) return repondre("❌ Joueur introuvable dans MyNeo.");

const fiche = await getData({ jid: auteur_Message });
if (!fiche) return repondre("❌ Fiche All Stars introuvable pour ce joueur.");

// -----------------------------------------
// 🔥 AJOUT ICI : compteur de roulettes d'affilée
// -----------------------------------------
let plays_in_row = parseInt(userData.plays_in_row) || 0;

      
      let valeur_np = parseInt(userData.np) || 0;
      if (valeur_np < 1) return repondre("❌ Tu n’as pas assez de np (au moins 1 requis).");

      let valeur_nc = parseInt(userData.nc) || 0;
      let valeur_coupons = parseInt(userData.coupons) || 0;
      let valeur_golds = parseInt(fiche.golds) || 0;

      const numbers = generateRandomNumbers(0, 50, 50);
      const winningNumbers = generateRandomNumbers(0, 50, 3);
      const rewards = generateRewards();

      // --- Message initial ---
      const msga = `*🎰𝗧𝗘𝗡𝗧𝗘𝗭 𝗩𝗢𝗧𝗥𝗘 𝗖𝗛𝗔𝗡𝗖𝗘🥳 !!*🎉🎉
▭▬▭▬▭▬▭▬▭▬▭▬════░▒▒▒▒░░
Bienvenue dans la Roulette, choisissez un chiffre parmis les 5️⃣0️⃣. Si vous choisissez le bon chiffre alors vous gagnez une récompense 🎁. ⚠️Vous avez 2 chances pour choisir le bon numéro.
🎊▔▔🎊▔🎊▔🎊▔▔🎊▔▔🎊▔🎊▔🎊
╭─────〔 🎰CASINO🎰 〕───
*\ ${numbers.join(', ')}\ *.
 🎊▔▔🎊▔🎊▔🎊▔▔🎊▔▔🎊▔🎊▔🎊 
 $Gains:  🎁50🔷 🎁100.000🧭 🎁25🎟️ 🎁100.000💵

☞ *🎰JACKPOT:*si vous réussissez à gagner 3x de suite c'est la récompense max +1.000.000🧭+1.000.000💶+100🔷+50🎟️ 🎊🎉🎉🍾🍾🎇🎇
╰───────────────────

🎊Voulez-vous tenter votre chance ? (1min)
✅: Oui
❌: Non
╰────────────────
▒▒▒▒░░ *NEO🎰CASINO* ▚▙▚▚▚`
      await ovl.sendMessage(ms_org, {
        video: { url: 'https://files.catbox.moe/amtfgl.mp4' },
        caption: msga,
        gifPlayback: true
      }, { quoted: ms });

      const getConfirmation = async (attempt = 1) => {
        if (attempt > 3) throw new Error('TooManyAttempts');
        const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
        const response = (rep?.message?.extendedTextMessage?.text || rep?.message?.conversation || "").trim().toLowerCase();
        if (response == 'oui') return true;
        if (response == 'non') throw new Error('GameCancelledByUser');
        await repondre('❓ Veuillez répondre par Oui ou Non.');
        return await getConfirmation(attempt + 1);
      };
      await getConfirmation();

      valeur_np -= 1;
      await MyNeoFunctions.updateUser(auteur_Message, { np: valeur_np });

      const getChosenNumber = async (isSecond = false, attempt = 1) => {
        if (attempt > 3) throw new Error('TooManyAttempts');
        await ovl.sendMessage(ms_org, {
          video: { url: 'https://files.catbox.moe/amtfgl.mp4' },
          caption: isSecond ? '🎊😃: *Vous avez une deuxième chance ! Choisissez un autre numéro. Vous avez 1 min ⚠️* (Répondre à ce message)' : '🎊😃: *Choisissez un numéro. Vous avez 1 min ⚠️* (Répondre à ce message)',
          gifPlayback: true
        }, { quoted: ms });
        const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
        const number = parseInt(rep?.message?.extendedTextMessage?.text || rep?.message?.conversation);
        if (isNaN(number) || number < 0 || number > 50) {
          await repondre('❌ Numéro invalide.');
          return await getChosenNumber(isSecond, attempt + 1);
        }
        return number;
      };

      const checkNumber = async (num, isSecond = false) => {
    if (winningNumbers.includes(num)) {
        const idx = winningNumbers.indexOf(num);
        let reward = rewards[idx];

        switch (reward) {
            case '50🔷':
                let ficheUserNC = await MyNeoFunctions.getUserData(auteur_Message);
                let newNC = (parseInt(ficheUserNC.nc) || 0) + 50;
                await MyNeoFunctions.updateUser(auteur_Message, { nc: newNC });
                break;

            case '100.000 G🧭':
                let ficheGolds = await getData("golds", auteur_Message);
                let newGolds = (parseInt(ficheGolds) || 0) + 100000;
                await setfiche("golds", newGolds, auteur_Message);
                break;

            case '25🎟':
                let ficheUserCoupons = await MyNeoFunctions.getUserData(auteur_Message);
                let newCoupons = (parseInt(ficheUserCoupons.coupons) || 0) + 25;
                await MyNeoFunctions.updateUser(auteur_Message, { coupons: newCoupons });
                break;

            case '100.000💶':
                let ficheArgent = await MyNeoFunctions.getUserData(auteur_Message);
                let newArgent = (parseInt(ficheArgent.argent) || 0) + 100000;
                await MyNeoFunctions.updateUser(auteur_Message, { argent: newArgent });
                break;
        }           
          await ovl.sendMessage(ms_org, {
            video: { url: 'https://files.catbox.moe/vfv2hk.mp4' },
            caption: `🎰FÉLICITATIONS ! 🥳🥳 vous avez gagné +${reward} 🎁🎊
══░▒▒▒▒░░▒░`,
            gifPlayback: true
          }, { quoted: ms });
          return true;
        } else if (isSecond) {
          await ovl.sendMessage(ms_org, {
            video: { url: 'https://files.catbox.moe/hmhs29.mp4' },
            caption: `😫😖💔 ▭▬▭▬▭▬▭▬▭▬▭▬▭▬▭▬❌NON ! C'était le mauvais numéro ! Dommage tu y étais presque💔▭▬▭▬▭▬▭▬▭▬▭▬▭▬😫😖💔`,
            gifPlayback: true
          }, { quoted: ms });
        }
        return false;
      };
      
// --- Roulette main ---
// Le joueur paie 1 NP pour jouer → il aura 2 roulettes
for (let tour = 1; tour <= 2; tour++) {

    await repondre(`🎰 *Roulette ${tour}/2* — Bonne chance !`);

    const chosen1 = await getChosenNumber();
    const win1 = await checkNumber(chosen1);

    if (win1) {
        await MyNeoFunctions.updateUser(auteur_Message, {
            wins_roulette: (parseInt(userData.wins_roulette) || 0) + 1,
            ns: (parseInt(userData.ns) || 0) + 5
        });

        await ovl.send(ms_org, `
🎉😎 Félicitations <@${auteur_Message}> tu gagnes **+5👑 royalities xp** 🍾🎉
        `);

        await checkJackpot(auteur_Message, ovl, ms_org, ms);
        continue;
    }

    const chosen2 = await getChosenNumber(true);
    const win2 = await checkNumber(chosen2, true);

    if (win2) {
        await MyNeoFunctions.updateUser(auteur_Message, {
            wins_roulette: (parseInt(userData.wins_roulette) || 0) + 1,
            ns: (parseInt(userData.ns) || 0) + 5
        });

        await ovl.send(ms_org, `
🎉😎 Félicitations <@${auteur_Message}> tu gagnes **+5👑 royalities xp** 🍾🎉
        `);

        await checkJackpot(auteur_Message, ovl, ms_org, ms);
    } else {
        await MyNeoFunctions.updateUser(auteur_Message, { wins_roulette: 0 });
    }
}            
    } catch (e) {
      console.error('Erreur roulette:', e);
      repondre("❌ Une erreur est survenue.");
    }
  };

  await rouletteHandler();
});

function countCards(cardsRaw) {
    if (!cardsRaw || typeof cardsRaw !== "string") return 0;

    return cardsRaw
        .split(/[\n\ • ]/)     // accepte \n OU .
        .map(c => c.trim())
        .filter(c => c.length > 0)
        .length;
}

// --- Tirage All Stars ---
ovlcmd({
  nom_cmd: "tirageallstars",
  react: "🎰",
  classe: "NEO_GAMES🎰",
  desc: "Lance un tirage All Stars"
}, async (ms_org, ovl, { ms, auteur_Message, repondre }) => {

  const tirageHandler = async () => {
    try {
      const autorises = [
        '120363049564083813@g.us',
        '120363307444088356@g.us',
        '120363403433342575@g.us', 
        '22651463203@s.whatsapp.net',
        '22605463559@s.whatsapp.net', 
        
      ];
      if (!autorises.includes(ms_org)) return;

      // IMAGE DE DÉBUT
      await ovl.sendMessage(ms_org, {
        image: { url: 'https://files.catbox.moe/swbsgf.jpg' },
        caption: ''
      }, { quoted: ms });

      // -------------------------
      //   DEMANDE DE NIVEAU
      // -------------------------
      const demanderNiveau = async (tentative = 1) => {
        if (tentative > 3) throw new Error("MaxAttempts");
        try {
          const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
          const texte = rep.message?.extendedTextMessage?.text || rep.message?.conversation || "";
          const r = texte.toLowerCase();
          if (["legend", "legends"].includes(r)) return "legend";
          if (r === "ultra") return "ultra";
          if (r === "sparking") return "sparking";
          await repondre("Choix invalide. Réponds par *legend*, *ultra* ou *sparking*.");
          return await demanderNiveau(tentative + 1);
        } catch {
          throw new Error("Timeout");
        }
      };

      const niveau = await demanderNiveau();

      // -------------------------
      //  Récupération fiche MyNeo
      // -------------------------
      const ficheNeo = await MyNeoFunctions.getUserData(auteur_Message);
      if (!ficheNeo) return repondre(`❌ Aucun joueur trouvé avec l'id : ${auteur_Message}`);

      // -------------------------
      //  DÉDUCTION DES NC
      // -------------------------
      const prixNC = { sparking: 20, ultra: 40, legend: 60 }[niveau];
      if ((ficheNeo.nc || 0) < prixNC) return repondre(`❌ Tu n’as pas assez de NC 🔷 (il te faut ${prixNC})`);

      await MyNeoFunctions.updateUser(auteur_Message, { nc: (ficheNeo.nc || 0) - prixNC });
      await repondre(`🔷 *${prixNC} NC* retirés de ta fiche. Nouveau solde : *${(ficheNeo.nc || 0) - prixNC} NC*`);

      // -------------------------
      //   VIDÉO DE TIRAGE
      // -------------------------
      const videoLinks = {
        sparking: 'https://files.catbox.moe/hm3t85.mp4',
        ultra: 'https://files.catbox.moe/kodcj4.mp4',
        legend: 'https://files.catbox.moe/3x9cvk.mp4'
      };
      await envoyerVideo(ms_org, ovl, videoLinks[niveau]);

      const probasGrade = [
        { value: "or", probability: 3 },
        { value: "argent", probability: 25 },
        { value: "bronze", probability: 70 }
      ];
      const probasCategorie = [
        { value: "ss+", probability: 1 },
        { value: "ss", probability: 2 },
        { value: "ss-", probability: 5 },
        { value: "s+", probability: 18 },
        { value: "s", probability: 25 },
        { value: "s-", probability: 40 }
      ];

      // -------------------------
      //   Vérification All Stars
      // -------------------------
      const ficheAllStars = await getData({ jid: auteur_Message });
      if (!ficheAllStars) 
        return repondre("❌ Fiche All Stars introuvable pour ce joueur.");

      let allStarsArray = ficheAllStars.all_stars
        ? ficheAllStars.all_stars.split(". ")
        : [];

      if (allStarsArray.length >= 9) {
        return repondre("❌ Impossible de tirer de nouvelles cartes : tu dois avoir moins de 9 cartes pour pouvoir tirer 2 cartes (10 max au total).");
      }

      // -------------------------
      //   Tirage de 2 cartes max
      // -------------------------
      const tirees = [];
      const maxCardsToAdd = Math.min(2, 10 - allStarsArray.length);

      for (let i = 0; i < maxCardsToAdd; i++) {
        await envoyerCarte(ms_org, ovl, ms, niveau, probasGrade, probasCategorie, tirees);
      }

      // -------------------------
      //   AJOUT +5 NS
      // -------------------------
      const newNS = (parseInt(ficheNeo.ns) || 0) + 5;
      await MyNeoFunctions.updateUser(auteur_Message, { ns: newNS });
      await repondre(`🎉 Félicitations +5👑 Royalities ajoutés à ta fiche 🎉🎉🥳🥳🍾`);

 // -------------------------
//   AJOUT DES CARTES DANS ALL STARS
// -------------------------

// Récupération de la fiche All Stars correctement
const ficheAllStars2 = await getData({ jid: auteur_Message });

let allStarsCardsArray = [];

if (ficheAllStars2 && typeof ficheAllStars2.cards === "string") {
    allStarsCardsArray = ficheAllStars2.cards.length > 0
        ? ficheAllStars2.cards.split(" • ")
        : [];
}

// Ajouter les nouvelles cartes
for (let card of tirees) {
    if (allStarsCardsArray.length < 10) {
        allStarsCardsArray.push(card + "🎰");
    }
}

// Sauvegarde propre
await setfiche("cards", allStarsCardsArray.join(" • "), auteur_Message);

await repondre(
  `🎉 Cartes ajoutées à ta fiche All Stars : ${tirees
    .map(c => c + "🎰")
    .join(", ")}`
);
    } catch (e) {
      if (e.message === "Timeout") return repondre("*⏱️ Temps écoulé sans réponse.*");
      if (e.message === "MaxAttempts") return repondre("*❌ Trop de tentatives échouées.*");
      repondre("Erreur lors du tirage : " + e.message);
      console.error(e);
    }
  };

  await tirageHandler();
}); 
