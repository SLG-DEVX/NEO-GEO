const { ovlcmd } = require('../lib/ovlcmd');
const epreuvesLoup = new Map();

// ──────────────────────────────
// UTILITAIRES
// ──────────────────────────────
function cleanText(str) {
  return str
    ?.normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u206F\u2066-\u2069]/g, '')
    .replace(/\n/g, ' ')
    .toLowerCase() || '';
}

function cleanTag(str) {
  return cleanText(str).replace(/\s+/g, '');
}

function normalizeJid(jid) {
  return jid ? jid.split(':')[0].trim() : '';
}

function normalize(str){
  return cleanText(str);
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
    const isLoup = normalizeJid(epreuve.loupJid) === normalizeJid(p.jid) ? " (Loup)" : "";
    txt += `\n${i}- @${p.tag}: ${p.niveau}${isLoup}`;
    i++;
  }

  txt += `
     
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
                      ⚽BLUE🔷LOCK`;

  return txt;
}

// ──────────────────────────────
// EXTRACTION CIBLE
// ──────────────────────────────
function extraireCibleDepuisTexte(texteAction, participants) {
  for (const p of participants) {
    if (texteAction.includes(cleanTag(p.tag))) {
      return p;
    }
  }
  return null;
}

// ──────────────────────────────
// LANCEMENT
// ──────────────────────────────
ovlcmd({
  nom_cmd: 'exercice4',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve du loup"
}, async (ms_org, ovl, { repondre, auteur_Message }) => {

  const chatId = ms_org;

  await ovl.sendMessage(chatId, {
    video: { url: 'https://files.catbox.moe/z64kuq.mp4' },
    gifPlayback: true
  });

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

  await ovl.sendMessage(chatId, {
    image: { url: 'https://files.catbox.moe/zui2we.jpg' },
    caption: texteDebut
  });

  const rep = await ovl.recup_msg({
    auteur: auteur_Message,
    ms_org,
    temps: 60000
  });

  const response =
    rep?.message?.conversation?.toLowerCase() ||
    rep?.message?.extendedTextMessage?.text?.toLowerCase();

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

    await repondre("✅📋 Envoie la liste des participants avec (Loup).");
  }
});

// ──────────────────────────────
// LISTE PARTICIPANTS
// ──────────────────────────────
ovlcmd({ nom_cmd: 'liste_loup', isfunc: true }, async (ms_org, ovl, { texte, getJid, repondre }) => {

  const epreuve = epreuvesLoup.get(ms_org);
  if (!epreuve || !epreuve.debut) return;

  const lignes = texte.split('\n');
  let loupJid = null;

  for (const ligne of lignes) {

const m = ligne.match(/@(\d+).*?:\s*(\d+)/i);
    if (!m) continue;

    const tag = m[1];
    const niveau = parseInt(m[2], 10);
    const isLoup = /\(loup\)/i.test(ligne);

    let jid;
    try {
      jid = await getJid(tag + "@s.whatsapp.net", ms_org, ovl);
    } catch {
      continue;
    }

    epreuve.participants.push({ jid, tag, niveau });

    if (isLoup) loupJid = jid;
  }

  if (epreuve.participants.length < 2)
    return repondre("❌ Il faut au moins 2 participants.");

  if (!loupJid)
    return repondre("❌ Aucun joueur avec (Loup) détecté.");

  epreuve.loupJid = normalizeJid(loupJid);
  epreuve.debut = false;

  await ovl.sendMessage(ms_org, {
  text: `⚽ *Début de l'exercice !*
Le joueur @${epreuve.participants.find(p=>normalizeJid(p.jid)===epreuve.loupJid).tag} est le Loup 🐺⚠️
Veuillez toucher un joueur avant la fin du temps ⌛ (3:00 min)`,
  mentions: [epreuve.loupJid]
});
});

// ──────────────────────────────
// HANDLER CENTRAL (À APPELER DANS message_upsert.js)
// ──────────────────────────────
async function handleLoupMessage(ms, ovl){

  if (!ms.message || ms.key.fromMe) return;

  const chatId = ms.key.remoteJid;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.loupJid) return;

  const sender = normalizeJid(ms.key.participant || ms.key.remoteJid);
  const raw =
    ms.message.conversation ||
    ms.message.extendedTextMessage?.text;

  if (!raw) return;

  const texte = normalize(raw);

  // ───────── TIR DU LOUP ─────────
  if (!epreuve.tirEnCours && sender === normalizeJid(epreuve.loupJid)) {

    const zones = ["tête","torse","abdomen","jambe gauche","jambe droite","bras gauche","bras droit"];
    const zone = zones.find(z => texte.includes(normalize(z)));
    if (!zone) return;

    let cible = null;

    
   const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;

if (!mentioned || mentioned.length === 0) return;

const cibleJid = normalizeJid(mentioned[0]);

const cible = epreuve.participants.find(
  p => normalizeJid(p.jid) === cibleJid
);

if (!cible) return; epreuve.tirEnCours = {
      auteur: epreuve.loupJid,
      cible: cible.jid,
      zone
    };

    await ovl.sendMessage(chatId,{
      text:`⚽ **TIR VALIDÉ !**
Zone visée : ${zone}
⏱️ 3 minutes pour esquiver 🛡️ @${cible.tag}`,
      mentions:[cible.jid]
    });

    epreuve.timerPaves = setTimeout(async ()=>{
      await verdictFinal(chatId, ovl);
    }, 180000);

    return;
  }

  // ───────── ESQUIVE ─────────
  if (epreuve.tirEnCours && sender === normalizeJid(epreuve.tirEnCours.cible)) {

    if (
      texte.includes("baisse") ||
      texte.includes("saute") ||
      texte.includes("decale") ||
      texte.includes("evite")
    ){
      clearTimeout(epreuve.timerPaves);
      await verdictFinal(chatId, ovl, true);
    }
  }
}

// ──────────────────────────────
// VERDICT FINAL AVEC GIFS
// ──────────────────────────────
async function verdictFinal(chatId, ovl, esquive=false){

  const epreuve = epreuvesLoup.get(chatId);
  if(!epreuve?.tirEnCours) return;

  const { auteur, cible } = epreuve.tirEnCours;
  const loup = epreuve.participants.find(p => p.jid === auteur);
  const cibleP = epreuve.participants.find(p => p.jid === cible);

  let touche = false;

  if(!esquive){
    const chanceToucher = 50 + Math.max(Math.min(loup.niveau - cibleP.niveau, 20), -20);
    touche = Math.random()*100 < chanceToucher;
  }

  if(touche){
    epreuve.loupJid = normalizeJid(cible);
    await ovl.sendMessage(chatId,{
      video:{url:"https://files.catbox.moe/eckrvo.mp4"},
      gifPlayback:true,
      caption:`✅ **TOUCHÉ !**
@${cibleP.tag} devient le nouveau Loup 🐺.`,
      mentions:[cible]
    });
  }else{
    const gifsRate = [
      "https://files.catbox.moe/obqo0d.mp4",
      "https://files.catbox.moe/m00580.mp4"
    ];
    await ovl.sendMessage(chatId,{
      video:{url:gifsRate[Math.floor(Math.random()*gifsRate.length)]},
      gifPlayback:true,
      caption:`❌ **RATÉ !**
Le Loup reste @${loup.tag}.`,
      mentions:[auteur]
    });
  }

  epreuve.tirEnCours = null;
  epreuve.timerPaves = null;
}

module.exports = {
  epreuvesLoup,
  handleLoupMessage
};
