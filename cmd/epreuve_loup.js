const { ovlcmd } = require('../lib/ovlcmd');
const { getAllTeams } = require('../DataBase/myneo_lineup_team');
const epreuvesLoup = new Map();

// ──────────────────────────────
// UTILITAIRES
// ──────────────────────────────
function normalize(str){
  return str
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '')
    .toLowerCase()
    .trim();
}

function cleanText(str) {
  return str
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '')
    .replace(/\n/g, ' ')
    .toLowerCase();
}

function cleanTag(str) {
  return cleanText(str).replace(/\s+/g, '');
}

function normalizeJid(jid) {
  return jid ? jid.split(':')[0].trim() : '';
}

// ──────────────────────────────
// RENDER FICHE PARTICIPANTS
// ──────────────────────────────
function renderFicheParticipants(epreuve) {
  let txt =
`🔷⚽ÉPREUVE DU LOUP🥅
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
*👤Participants:*`;

  let i = 1;
  for (const p of epreuve.participants) {
    const isLoup = epreuve.loupJid === p.jid ? " (Loup)" : "";
    txt += `\n${i}- ${p.tag}: ${p.niveau}${isLoup}`;
    i++;
  }

  txt += `
     
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
                      ⚽BLUE🔷LOCK`;
  return txt;
}

// ──────────────────────────────
// RECHERCHE JID DANS TOUTES LES TEAMS
// ──────────────────────────────
async function findJidByTag(tag) {
  const allTeams = await getAllTeams(); // Récupère toutes les équipes
  tag = cleanTag(tag);
  for (const team of allTeams) {
    for (const player of team.players) {
      if (cleanTag(player.tag) === tag) return player.jid;
    }
  }
  return null; // fallback si non trouvé
}

// ──────────────────────────────
// EXTRACTION DU TEXTE D’ACTION
// ──────────────────────────────
function extraireTexteAction(texte) {
  const match = texte.match(/⚽:\s*([\s\S]*?)(?=\n╰|BLUE🔷LOCK|$)/i);
  if (!match) return null;
  const contenu = match[1].trim();
  return contenu ? normalize(contenu) : null;
}

// ──────────────────────────────
// EXTRACTION DE CIBLE
// ──────────────────────────────
function extraireCibleDepuisTexte(texteAction, participants) {
  for (const p of participants) {
    const tagClean = cleanTag(p.tag);
    if (texteAction.includes(tagClean)) return p;
  }
  return null;
}

// ──────────────────────────────
// LANCEMENT DE L'ÉPREUVE
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'exercice4',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve du loup"
}, async (ms_org, ovl, { repondre, auteur_Message }) => {
  try {
    const chatId = ms_org.key?.remoteJid || ms_org;

    await ovl.sendMessage(chatId, { video: { url: 'https://files.catbox.moe/z64kuq.mp4' }, gifPlayback: true });

    const texteDebut = `🔷 *ÉPREUVE DU LOUP*🐺❌⚽
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░

*⚽RÈGLES:*
Objectif : toucher un autre joueur avec le ballon ⚽ avant la fin du temps imparti : 15 minutes❗
Le modérateur doit ensuite envoyer la liste des participants avec leurs niveaux et ajouter (Loup) au joueur qui commence.

⚽ Voulez-vous lancer l’épreuve ?
✅ \`Oui\`  
❌ \`Non\`

╰───────────────────
▝▝▝                    *🔷BLUELOCK⚽*`;

    await ovl.sendMessage(chatId, { image: { url: 'https://files.catbox.moe/zui2we.jpg' }, caption: texteDebut });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = rep?.message?.conversation?.toLowerCase() || rep?.message?.extendedTextMessage?.text?.toLowerCase();
    if (!response) return repondre("⏳ Pas de réponse, épreuve annulée.");
    if (response === "non") return repondre("❌ Lancement annulé.");

    if (response === "oui") {
      epreuvesLoup.set(chatId, {
        participants: [],
        loupJid: null,
        tirEnCours: null,
        debut: true,
        timerPaves: null
      });

      await repondre("✅📋 Envoie maintenant la **liste des participants** avec les niveaux.\nAjoute `(Loup)` au joueur qui commence.");
    }
  } catch (err) {
    console.error(err);
    await repondre("❌ Une erreur est survenue lors du lancement de l'épreuve.");
  }
});

// ──────────────────────────────
// LECTURE LISTE DES PARTICIPANTS
// ──────────────────────────────
ovlcmd({ nom_cmd: 'liste_loup', isfunc: true }, async (ms_org, ovl, { texte, repondre }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.debut) return;
  if (epreuve.tirEnCours) return;

  const lignes = texte.replace(/[\u2066-\u2069]/g, '').split('\n');
  let loupJid = null;

  for (const ligne of lignes) {
    const parts = ligne.split(':');
    if (parts.length < 2) continue;

    // Récupère le tag proprement, enlève @ et espaces invisibles
    let tag = normalize(parts[0].replace('@','').trim());

    // Récupère le niveau uniquement numérique
    const niveau = parseInt(parts[1].replace(/[^\d]/g,''), 10);
    if (isNaN(niveau)) continue;

    // Détecte si c'est le Loup
    const isLoup = /\(loup\)/i.test(ligne);

    // Cherche le JID dans toutes les équipes
    let jid = await findJidByTag(tag);
    if (!jid) jid = tag + "@temp"; // fallback si non trouvé

    epreuve.participants.push({ jid, tag, niveau });
    if (isLoup) loupJid = jid;
  }

  if (epreuve.participants.length < 2) return repondre("❌ Il faut au moins 2 participants.");
  if (!loupJid) return repondre("❌ Aucun joueur avec (Loup) détecté.");

  epreuve.loupJid = normalizeJid(loupJid);
  epreuve.debut = false;

  const mentionId = loupJid.split('@')[0];

  await ovl.sendMessage(chatId, {
    video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
    gifPlayback: true,
    caption: `⚽ Début de l'exercice !\nLe joueur ${mentionId} est le Loup 🐺⚠️\nVeuillez toucher un joueur avant la fin du temps ⌛ (3:00 min)`,
    mentions: [loupJid]
  });
}); 

      // ──────────────────────────────
      // DÉTECTION DU TIR DU LOUP
      // ──────────────────────────────
      if (!epreuve.tirEnCours && senderNorm === loupNorm) {
        const tir = detectTirLoup(action, { trace: true });
        if (!tir) return;

        const cible = extraireCibleDepuisTexte(action, epreuve.participants);
        if (!cible || cible.jid === loupNorm) return;

        epreuve.tirEnCours = {
          auteur: epreuve.loupJid,
          cible: cible.jid,
          zone: tir.zone,
          type: tir.type,
          messages: []
        };

        await ovl.sendMessage(chatId, {
          text: `⚽ **TIR VALIDÉ !**\n⏱️ 3 minutes pour envoyer le pavé d’esquive 🛡️ ${cible.tag}`,
          mentions: [cible.jid]
        });

        epreuve.timerPaves = setTimeout(async () => await verdictFinal(chatId, ovl), 3*60*1000);
        return;
      }

      // ──────────────────────────────
      // GESTION PAVÉ D'ESQUIVE
      // ──────────────────────────────
      if (epreuve.tirEnCours) {
        const cibleJid = normalizeJid(epreuve.tirEnCours.cible);
        const texteClean = normalize(action);
        const zone = epreuve.tirEnCours.zone;

        let esquiveValide = false;
        switch(zone){
          case "tête": esquiveValide = texteClean.includes("baisse")||texteClean.includes("accroup"); break;
          case "torse": case "abdomen": esquiveValide = texteClean.includes("decale")||texteClean.includes("bond"); break;
          case "jambe gauche": case "jambe droite": esquiveValide = texteClean.includes("bond")||texteClean.includes("saute")||texteClean.includes("plie"); break;
          case "bras gauche": case "bras droit": esquiveValide = texteClean.includes("evite")||texteClean.includes("decale"); break;
        }

        if(esquiveValide){
          epreuve.tirEnCours.messages.push({ jid: senderJid, texte: texteClean });
          if(senderJid === cibleJid){
            clearTimeout(epreuve.timerPaves);
            await verdictFinal(chatId, ovl);
          }
        }
      }

    } catch(err){
      console.error("❌ ERREUR LISTENER LOUP :", err);
    }
  });
}

// ──────────────────────────────
// VERDICT FINAL
// ──────────────────────────────
async function verdictFinal(chatId, ovl){
  const epreuve = epreuvesLoup.get(chatId);
  if(!epreuve?.tirEnCours) return;

  const { auteur, cible } = epreuve.tirEnCours;
  const loup = epreuve.participants.find(p => p.jid === auteur);
  const cibleP = epreuve.participants.find(p => p.jid === cible);

  const chanceToucher = 50 + Math.max(Math.min(loup.niveau - cibleP.niveau, 20), -20);
  const touche = Math.random()*100 < chanceToucher;

  if(touche){
    epreuve.loupJid = normalizeJid(cible);
    await ovl.sendMessage(chatId,{
      video:{url:"https://files.catbox.moe/eckrvo.mp4"},
      gifPlayback:true,
      caption:`✅ **TOUCHÉ !**\n${cibleP.tag} devient le nouveau Loup 🐺.`,
      mentions:[cible]
    });
  }else{
    const gifsRate = ["https://files.catbox.moe/obqo0d.mp4","https://files.catbox.moe/m00580.mp4"];
    await ovl.sendMessage(chatId,{
      video:{url:gifsRate[Math.floor(Math.random()*gifsRate.length)]},
      gifPlayback:true,
      caption:`❌ **RATÉ !**\nLe tir n'a pas touché sa cible. Le Loup reste ${loup.tag}.`,
      mentions:[auteur]
    });
  }

  epreuve.tirEnCours = null;
  epreuve.timerPaves = null;
}

// ──────────────────────────────
// EXPORT
// ──────────────────────────────
module.exports = {
  epreuvesLoup,
  initLoupListener
};
