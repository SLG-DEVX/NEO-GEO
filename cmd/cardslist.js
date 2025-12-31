const { ovlcmd } = require("../lib/ovlcmd");
const { cards } = require("../DataBase/cards");

const formatNumber = n => {
  try { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  catch { return n; }
};

const normalize = str => (str || "").toLowerCase().replace(/[\s\-\_\(\)]/g, "");

// Fonction pour afficher le prix avec le bon symbole selon l'unité
const formatPrice = card => {
  let unit = "";

  if (card && typeof card.unit === "string") {
    unit = card.unit.toLowerCase();
  }

  // Si le prix est en NC → 🔷, sinon 🧭
  const icon = unit === "nc" ? "🔷" : "🧭";
  return `${formatNumber(card.price)}${icon}`;
};

ovlcmd({
  nom_cmd: "cards",
  react: "🎴",
  classe: "NEO_GAMES"
}, async (ms_org, ovl, { auteur_Message, repondre }) => {
  try {

    await repondre(
      "🌀🎴📂 Veuillez mentionner le nom de la Card, ex : *🎴sasuke où 🎴sasuke(Hebi) où 🎴sasuke bronze*\nTapez `close` pour fermer la session.\n╰───────────────────"
    );

    const allCards = [];
    for (const [placementKey, placementCards] of Object.entries(cards)) {
      for (const c of placementCards) {
        allCards.push({ ...c, placement: placementKey });
      }
    }

    const startTime = Date.now();
    const timeout = 60000;

    while (Date.now() - startTime < timeout) {

      const reply = await ovl.recup_msg({
        auteur: auteur_Message,
        ms_org,
        temps: timeout - (Date.now() - startTime)
      });

      if (!reply || !reply.message) break;

      const body =
        reply.message.extendedTextMessage?.text ||
        reply.message.conversation ||
        reply.body ||
        "";

      if (!body) continue;

      // Vérifier si l'utilisateur veut fermer
      if (body.trim().toLowerCase() === "close") {
        await repondre("✅ Session de recherche de cartes fermée.");
        break;
      }

      // Retirer emoji 🎴 au début et nettoyer
      let txt = body.replace(/^🎴\s*/i, "").trim();
      if (!txt) continue;

      const q = normalize(txt);

      // Recherche intelligente
      let card =
        allCards.find(c => normalize(c.name) === q) ||
        allCards.find(c => normalize(c.name).startsWith(q)) ||
        allCards.find(c => normalize(c.name).includes(q));

      if (card) {
        await ovl.sendMessage(ms_org, {
          image: { url: card.image },
          caption:
`🎴🌀 *Carte :* ${card.name}

Nom : ${card.name}
Grade : ${card.grade}
Catégorie : ${card.category}
Placement : ${card.placement}
Prix : ${formatPrice(card)}
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                                 🔆🌀`
        }, { quoted: reply });

        continue; // attendre le prochain message
      }

      // Suggestions sur le personnage principal
      const perso = txt.split(/[\s\(\)]/)[0];
      const suggestions = allCards.filter(c => normalize(c.name).includes(normalize(perso)));

      if (!suggestions.length) {
        await repondre("❌ *Aucune carte trouvée et aucune suggestion disponible sur ce personnage.*");
        continue;
      }

      let msg = "╭────〔 *🎴🌀LISTE DE CARDS📂* 〕\n\n";
      msg += "🎴📋 *Carte non trouvée (le nom ne correspond pas à celle dans la Database📂)*\n";
      msg += "*Voici une liste des possibilités sur ce perso:*\n";
      suggestions.forEach((c, i) => {
        msg += `${i + 1}. ${c.name} - ${c.grade}\n`;
      });
      msg += "╰───────────────────";

      await repondre(msg);

      const choiceReply = await ovl.recup_msg({
        auteur: auteur_Message,
        ms_org,
        temps: timeout - (Date.now() - startTime)
      });

      const choiceBody =
        choiceReply?.message?.extendedTextMessage?.text ||
        choiceReply?.message?.conversation ||
        "";

      if (!choiceBody) continue;

      // Vérifier si l'utilisateur veut fermer
      if (choiceBody.trim().toLowerCase() === "close") {
        await repondre("✅ Session de recherche de cartes fermée.");
        break;
      }

      const choix = parseInt(choiceBody.trim());
      if (isNaN(choix) || choix < 1 || choix > suggestions.length) continue;

      const chosenCard = suggestions[choix - 1];

      await ovl.sendMessage(ms_org, {
        image: { url: chosenCard.image },
        caption:
`🎴🌀 *Carte :* ${chosenCard.name}

Nom : ${chosenCard.name}
Grade : ${chosenCard.grade}
Catégorie : ${chosenCard.category}
Placement : ${chosenCard.placement}
Prix : ${formatPrice(chosenCard)}
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                                 🔆🌀`
      }, { quoted: choiceReply });

    }

  } catch (err) {
    console.log("CARD ERROR SILENT:", err);
    return;
  }
});
