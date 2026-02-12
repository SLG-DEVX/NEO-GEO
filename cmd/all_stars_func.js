const { ovlcmd } = require("../lib/ovlcmd");
const { cardsBlueLock } = require("../DataBase/cardsBL");

ovlcmd({
    nom: "goal",
    isfunc: true
}, async (ms_org, ovl, { texte, repondre }) => {
    if (!texte.toLowerCase().startsWith("🔷⚽ goal🥅")) return;

    // Extraction des stats depuis le pavé
    const joueurMatch = texte.match(/🥅joueur\s*=\s*(.+)/i);
    const gardienMatch = texte.match(/🥅Gardien\s*=\s*(\d+)/i);
    const zoneMatch = texte.match(/🥅Zone\s*=\s*([\w\s-]+)/i);
    const distanceMatch = texte.match(/🥅Distance\s*=\s*([\d.]+)/i);

    if (!joueurMatch || !gardienMatch || !zoneMatch || !distanceMatch) {
        return repondre("⚠️ Format incorrect. Assure-toi que la fiche est bien remplie.");
    }

    // Normalisation du nom saisi
    const joueurNomSaisi = joueurMatch[1].trim().toLowerCase().replace(/\s+/g, ' ');

    // Recherche du joueur dans la database (ignore la casse et les espaces)
    const joueurData = Object.values(cardsBlueLock).find(joueur => {
    const nameNormalized = joueur.name.trim().toLowerCase().replace(/\s+/g, ' ');
    return nameNormalized === joueurNomSaisi;
});

    if (!joueurData) {
        return repondre(`⚠️ Joueur non trouvé dans la Database : *${joueurNomSaisi}*`);
    }

    const tirPuissance = parseInt(joueurData.tir || 50, 10); // Tir pris depuis la Database
    const gardien = parseInt(gardienMatch[1], 10);
    const zone = zoneMatch[1].trim().toLowerCase().replace(/\s+/g, ' ');
    const distance = parseFloat(distanceMatch[1]);

    // Calcul du résultat du tir
const sho = parseInt(joueurData.sho || 50, 10); // sho du joueur

// Calcul du résultat du tir selon la distance et l'écart sho/gardien
let probaGoal = 0;
const ecart = sho - gardien;

if (distance <= 5) {
    if (ecart > 10) probaGoal = 1.0;       // 100%
    else if (ecart > 0) probaGoal = 0.85;  // 85%
    else if (ecart === 0) probaGoal = 0.5; // 50%
    else probaGoal = 0;                     // tir < gardien → 0%
} else if (distance <= 10) {
    if (ecart > 10) probaGoal = 0.9;       // 90%
    else if (ecart > 0) probaGoal = 0.65;  // 65%
    else if (ecart === 0) probaGoal = 0.3; // 30%
    else if (ecart >= -5) probaGoal = 0.2; // tir < gardien mais < 5 points → 20%
    else probaGoal = 0;                     // sinon 0%
} else {
    // Pour les distances >10, ajustement possible
    if (ecart > 10) probaGoal = 0.85;
    else if (ecart > 0) probaGoal = 0.6;
    else if (ecart === 0) probaGoal = 0.2;
    else if (ecart >= -5) probaGoal = 0.1;
    else probaGoal = 0;
}

// Tir aléatoire selon la probabilité
const tirAleatoire = Math.random(); // valeur entre 0 et 1
const resultat = tirAleatoire <= probaGoal ? "but" : "arrêt"; 

   if (resultat === "but") {
        const commentaires = {
            "lucarne droite": ["*🎙️: COMME UN MISSILE GUIDÉ ! Le ballon se niche dans la lucarne droite - splendide !*", "*🎙️: UNE FRAPPE POUR L'HISTOIRE ! La lucarne droite explose sous l'effet de la frappe !*"],
            "lucarne gauche": ["*🎙️: MAGNIFIQUE ! La lucarne gauche est pulvérisée par cette frappe !*", "*🎙️: UNE PRÉCISION D'ORFÈVRE ! Lucarne gauche touchée, le gardien impuissant !*"],
            "lucarne milieu": ["*🎙️: JUSTE SOUS LA BARRE ! Une frappe centrée magistrale !*", "*🎙️: UNE FUSÉE POUR LES LIVRES D’HISTOIRE ! En pleine lucarne centrale !*"],
            "mi-hauteur droite": ["*🎙️: UNE FRAPPE SÈCHE ET PRÉCISE ! Filets droits transpercés !*"],
            "mi-hauteur gauche": ["*🎙️: PUISSANCE ET PRÉCISION ! Le ballon traverse la défense à gauche !*"],
            "mi-hauteur centre": ["*🎙️: UNE FUSÉE AU CENTRE ! Le ballon frappe en plein milieu à mi-hauteur !*"],
            "ras du sol droite": ["*🎙️: ENTRE LES JAMBES ! Le ballon glisse à ras du sol côté droit !*"],
            "ras du sol gauche": ["*🎙️: UNE RACLÉE TECHNIQUE ! Le tir rase le sol à gauche et finit au fond !*"],
            "ras du sol milieu": ["*🎙️: UNE FINALE DE CLASSE ! Le ballon fuse au sol, en plein centre !*"]
        };

        if (!commentaires[zone]) {
            await repondre(`Zone inconnue : *${zone}*\nZones valides :\n- ${Object.keys(commentaires).join("\n- ")}`);
            return;
        }

        const commentaire = commentaires[zone][Math.floor(Math.random() * commentaires[zone].length)];

        // 1️⃣ Premier GIF : GOAL classique avec commentaire
        const videoGoal = [
            "https://files.catbox.moe/chcn2d.mp4",
            "https://files.catbox.moe/t04dmz.mp4",
            "https://files.catbox.moe/8t1eya.mp4"
        ][Math.floor(Math.random() * 3)];

        await ovl.sendMessage(ms_org, {
            video: { url: videoGoal },
            caption: `*🥅:✅GOOAAAAAL!!!⚽⚽⚽ ▱▱▱▱*\n${commentaire}`,
            gifPlayback: true
        });

        // 2️⃣ Deuxième GIF : célébration spécifique du joueur
        const gifCelebration = joueurData.goal;
        if (gifCelebration) {
            await ovl.sendMessage(ms_org, {
                video: { url: gifCelebration },
                caption: "",
                gifPlayback: true
            });
        }

    } else {
        await ovl.sendMessage(ms_org, {
            video: { url: 'https://files.catbox.moe/88lylr.mp4' },
            caption: "*🥅:❌MISSED GOAL!!! ▱▱▱▱*",
            gifPlayback: true
        });
    }
});

const activeCountdowns = {};
const pausedCountdowns = {};

ovlcmd({
  nom: "latence go/next",
  isfunc: true
}, async (ms_org, ovl, { texte, getJid }) => {
  if (!texte) return;
  const mots = texte.trim().toLowerCase().split(/\s+/);
  const neoTexte = mots.join(" ");

  let user = null, userW = null;
  if (mots[0]?.startsWith("@")) {
    const userLid = mots[0].slice(1);
    user = await getJid(userLid + "@lid", ms_org, ovl);
    userW = user.split("@")[0]
  }

  const stopCountdown = async () => {
    if (activeCountdowns[ms_org]) clearInterval(activeCountdowns[ms_org].interval);
    delete activeCountdowns[ms_org];
    delete pausedCountdowns[ms_org];
    await ovl.sendMessage(ms_org, { text: "🛑 Décompte arrêté." });
  };

  if (neoTexte === "stop") return stopCountdown();

  if (neoTexte === "pause" && activeCountdowns[ms_org]) {
    clearInterval(activeCountdowns[ms_org].interval);
    pausedCountdowns[ms_org] = activeCountdowns[ms_org];
    delete activeCountdowns[ms_org];
    return ovl.sendMessage(ms_org, { text: "⏸️ Décompte en pause." });
  }

  if (["resume", "continue", "go"].includes(neoTexte) && pausedCountdowns[ms_org]) {
    const { remaining, userW, user } = pausedCountdowns[ms_org];
    let time = remaining;
    const interval = setInterval(async () => {
      time--;
      activeCountdowns[ms_org].remaining = time;
      if (time === 120 && user) {
        await ovl.sendMessage(ms_org, { text: `⚠️ @${userW} il ne reste plus que 2 minutes.`, mentions: [user] });
      }
      if (time <= 0) {
        clearInterval(interval);
        delete activeCountdowns[ms_org];
        await ovl.sendMessage(ms_org, { text: "⚠️ Latence Out" });
      }
    }, 1000);
    activeCountdowns[ms_org] = { interval, remaining: time, userW, user };
    delete pausedCountdowns[ms_org];
    return ovl.sendMessage(ms_org, { text: "▶️ Décompte repris." });
  }

  let countdownTime = null;
  let isGo = false;
  if (mots[0]?.startsWith("@") && /(next|nx|nxt)$/.test(mots[1] || "")) {
    countdownTime = 6 * 60;
  } else if (mots[0]?.startsWith("@") && /go$/.test(mots[1] || "")) {
    countdownTime = 6 * 60;
    isGo = true;
  } else return;

  if (activeCountdowns[ms_org] || pausedCountdowns[ms_org]) {
    return ovl.sendMessage(ms_org, { text: "⚠️ Un décompte est déjà en cours ou en pause." });
  }

  await ovl.sendMessage(ms_org, {
    video: { url: isGo ? "https://files.catbox.moe/74zbq3.mp4" : "https://files.catbox.moe/7jmwi8.mp4" },
    gifPlayback: true
  });

  const interval = setInterval(async () => {
    countdownTime--;
    if (countdownTime === 120 && user) {
      await ovl.sendMessage(ms_org, { text: `⚠️ @${userW} il ne reste plus que 2 minutes.`, mentions: [user] });
    }
    if (countdownTime <= 0) {
      clearInterval(interval);
      delete activeCountdowns[ms_org];
      await ovl.sendMessage(ms_org, { text: "⚠️ Latence Out" });
    }
  }, 1000);

  activeCountdowns[ms_org] = { interval, remaining: countdownTime, userW, user };
});

ovlcmd({
  nom: "fin_combat",
  isfunc: true
}, async (ms_org, ovl, { texte }) => {
  const lowerText = texte.toLowerCase().trim();
  const prefix = "╭──⟪ *🎮verdict moderateur* ⟫──╮";
  if (!lowerText.startsWith(prefix)) return;

  const words = texte.split(/\s+/);
  const winner = words.find(w => w.startsWith("@"));
  if (!winner) return;

  const victoryVid = "https://files.catbox.moe/g54udj.mp4";
  const message = `*🎙️NEO TV🎬:* Félicitations à ${winner} pour sa victoire🎊🎊🎊🎉🎉🎉🎉`;

  await ovl.sendMessage(ms_org, {
    video: { url: victoryVid },
    caption: message,
    gifPlayback: true,
    mentions: [winner.replace("@", "") + "@lid"]
  });
});
