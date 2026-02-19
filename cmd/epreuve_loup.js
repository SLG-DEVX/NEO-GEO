const { ovlcmd } = require('../lib/ovlcmd');

const epreuvesLoup = new Map();

// ──────────────────────────────
// UTILITAIRES
// ──────────────────────────────
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

function normalize(str) {
  return str.normalize("NFKC").replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '').toLowerCase();
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
    txt += `\n${i}- @${p.tag}: ${p.niveau}${isLoup}`;
    i++;
  }

  txt += `
     
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
                      ⚽BLUE🔷LOCK`;
  return txt;
}

// ──────────────────────────────
// EXTRACTION TEXTE ACTION
// ──────────────────────────────
function extraireTexteAction(texte) {
  const match = texte.match(/⚽([\s\S]*?)⚽\s*blue🔷lock🥅/i);
  if (!match) return null;
  return cleanText(match[1]);
}

// ──────────────────────────────
// EXTRACTION CIBLE
// ──────────────────────────────
function extraireCibleDepuisTexte(texteAction, participants) {
  for (const p of participants) {
    const tagClean = cleanTag(p.tag);
    if (texteAction.includes(tagClean)) return p;
  }
  return null;
}

// ──────────────────────────────
// HANDLER MESSAGE LOUP
// ──────────────────────────────
async function handleLoupMessage(ms, ovl) {
  if (!ms?.message || ms.key.fromMe) return;

  const chatId = ms.key.remoteJid;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.loupJid) return;

  const senderJid = normalizeJid(ms.key.participant || ms.key.remoteJid);
  const rawTexte = ms.message.conversation || ms.message.extendedTextMessage?.text;
  if (!rawTexte) return;
  const texte = rawTexte.trim();

  const loupNorm = normalizeJid(epreuve.loupJid);
  const senderNorm = normalizeJid(senderJid);

  // ──────────────────────────────
  // Détection tir du Loup
  // ──────────────────────────────
  if (!epreuve.tirEnCours && senderNorm === loupNorm) {
    const tir = detectTirLoupRP(texte);
    if (!tir) return;

    const mentioned = ms.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!Array.isArray(mentioned) || mentioned.length !== 1) return;

    const cibleJid = normalizeJid(mentioned[0]);
    if (cibleJid === loupNorm) return;

    const cibleParticipant = epreuve.participants.find(p => normalizeJid(p.jid) === cibleJid);
    if (!cibleParticipant) return;

    epreuve.tirEnCours = {
      auteur: epreuve.loupJid,
      cible: cibleJid,
      zone: tir.zone,
      type: tir.type,
      messages: []
    };

    await ovl.sendMessage(chatId, {
      text: `⚽ **TIR VALIDÉ !**\n⏱️ 3 minutes pour envoyer le pavé d’esquive 🛡️ @${cibleParticipant.tag}`,
      mentions: [cibleJid]
    });

    epreuve.timerPaves = setTimeout(async () => {
      await verdictFinal(chatId, ovl);
    }, 3 * 60 * 1000);

    return;
  }

  // ──────────────────────────────
  // Gestion pavés d’esquive
  // ──────────────────────────────
  if (epreuve.tirEnCours) {
    const cibleJid = normalizeJid(epreuve.tirEnCours.cible);
    const texteClean = normalize(texte);
    const zone = epreuve.tirEnCours.zone;

    let esquiveValide = false;

    switch (zone) {
      case "tête":
        esquiveValide = texteClean.includes("baisse") || texteClean.includes("accroup");
        break;
      case "torse":
      case "abdomen":
        esquiveValide = texteClean.includes("decale") || texteClean.includes("bond");
        break;
      case "jambe gauche":
      case "jambe droite":
        esquiveValide = texteClean.includes("bond") || texteClean.includes("saute") || texteClean.includes("plie");
        break;
      case "bras gauche":
      case "bras droit":
        esquiveValide = texteClean.includes("evite") || texteClean.includes("decale");
        break;
    }

    if (esquiveValide) {
      epreuve.tirEnCours.messages.push({ jid: senderJid, texte: texteClean });

      if (senderJid === cibleJid) {
        clearTimeout(epreuve.timerPaves);
        await verdictFinal(chatId, ovl);
      }
    }
  }
}

// ──────────────────────────────
// Détection tir Loup RP
// ──────────────────────────────
function detectTirLoupRP(text) {
  const t = normalize(text);
  const ZONES = ["tête","torse","abdomen","jambe gauche","jambe droite","bras gauche","bras droit"];
  const TYPES = ["tir","frappe","coup de pied","volée","puissante frappe","shoot","chasse","pied","passe rapide"];

  let type = TYPES.find(k => t.includes(normalize(k))) || "tir";
  let zone = ZONES.find(z => t.includes(normalize(z)));

  if(!zone){
    if(t.includes("head")) zone="tête";
    else if(t.includes("chest")) zone="torse";
    else if(t.includes("ventre")) zone="abdomen";
    else if(t.includes("left leg")) zone="jambe gauche";
    else if(t.includes("right leg")) zone="jambe droite";
    else if(t.includes("arm")) zone="bras gauche";
  }

  if(!zone) return null;
  return { type, zone };
}

// ──────────────────────────────
// Verdict final
// ──────────────────────────────
async function verdictFinal(chatId, ovl) {
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve?.tirEnCours) return;

  const { auteur, cible } = epreuve.tirEnCours;
  const loup = epreuve.participants.find(p => p.jid === auteur);
  const cibleP = epreuve.participants.find(p => p.jid === cible);

  const chanceToucher = 50 + Math.max(Math.min(loup.niveau - cibleP.niveau, 20), -20);
  const touche = Math.random() * 100 < chanceToucher;

  if (touche) {
    epreuve.loupJid = normalizeJid(cible);
    await ovl.sendMessage(chatId, {
      video: { url: "https://files.catbox.moe/eckrvo.mp4" },
      gifPlayback: true,
      caption: `✅ **TOUCHÉ !**\n@${cibleP.tag} devient le nouveau Loup 🐺.`,
      mentions: [cible]
    });
  } else {
    const gifsRate = ["https://files.catbox.moe/obqo0d.mp4","https://files.catbox.moe/m00580.mp4"];
    await ovl.sendMessage(chatId, {
      video: { url: gifsRate[Math.floor(Math.random() * gifsRate.length)] },
      gifPlayback: true,
      caption: `❌ **RATÉ !**\nLe tir n'a pas touché sa cible. Le Loup reste @${loup.tag}.`,
      mentions: [auteur]
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
  handleLoupMessage
};
