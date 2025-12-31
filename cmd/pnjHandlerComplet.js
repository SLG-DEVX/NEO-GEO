const { ovlcmd } = require("../lib/ovlcmd");
const { PlayerFunctions } = require('../DataBase/ElysiumFichesDB');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

// ================================
// CONSTANTES
// ================================
const TOPICS = [
  "Art", "Sport", "Aventures", "Monde", "Actualité", "Musique",
  "Science", "Hi-tech", "Société", "Fashion", "Showbiz",
  "Criminalité", "Loisirs", "Animaux", "Delerium", "Études",
  "Fêtes", "Politique", "Gaming"
];

// ================================
// UTILITAIRES
// ================================
function normalize(str = "") {
  return str.toLowerCase().trim();
}

function getPNJByName(name) {
  return fallenAngeles[normalize(name)] || null;
}

// ================================
// RELATION
// ================================
function updateRelation(pnj, playerId, delta) {
  if (!pnj.memory) pnj.memory = {};
  if (!pnj.memory[playerId]) {
    pnj.memory[playerId] = {
      relation: 5,
      status: "Inconnu😶",
      refus: 0,
      events: []
    };
  }

  const mem = pnj.memory[playerId];
  mem.relation = Math.max(0, Math.min(100, mem.relation + delta));

  if (mem.relation <= 5) mem.status = "Inconnu😶";
  else if (mem.relation <= 10) mem.status = "Connaissance👋🏻";
  else if (mem.relation <= 50) mem.status = "Ami🙂";
  else mem.status = "Pote😄";
}

// ================================
// ORIENTATION SEXUELLE
// ================================
function orientationCompatible(pnj, player) {
  if (pnj.orientation === "bisexual") return true;
  if (pnj.orientation === "homme" && player.sexe === "H") return true;
  if (pnj.orientation === "femme" && player.sexe === "F") return true;
  return false;
}

// ================================
// PARSING MESSAGE JOUEUR
// ================================
function parsePlayerMessage(text) {
  const lower = text.toLowerCase();

  if (lower.startsWith("je flirt:")) {
    return { type: "flirt", content: text.slice(9).trim() };
  }

  if (lower.startsWith("je propose de coucher ensemble")) {
    return { type: "sex" };
  }

  const topicMatch = text.match(/je parle de\s*:\s*(.+)/i);
  if (topicMatch) {
    return { type: "talk", topic: topicMatch[1].trim() };
  }

  return null;
}

// ================================
// HANDLER PRINCIPAL
// ================================
async function handlePNJMessage(player, text, location = "") {
  const abordMatch = text.match(/j'aborde\s+([a-zA-Z\s]+)/i);
  if (!abordMatch) return null;

  const pnjName = abordMatch[1].trim();
  const pnj = getPNJByName(pnjName);
  if (!pnj) return null;

  const parsed = parsePlayerMessage(text);
  if (!parsed) return null;

  const playerId = player.tag;
  if (!pnj.memory) pnj.memory = {};
  if (!pnj.memory[playerId]) {
    pnj.memory[playerId] = {
      relation: 5,
      status: "Inconnu😶",
      refus: 0,
      events: []
    };
  }

  const mem = pnj.memory[playerId];
  let replyText = "";

  // ================= TALK =================
  if (parsed.type === "talk") {
    const topic = parsed.topic;

    if (!TOPICS.map(t => t.toLowerCase()).includes(topic.toLowerCase())) {
      replyText = "Je ne comprends pas vraiment de quoi tu parles.";
    } else if (!pnj.likes.map(l => l.toLowerCase()).includes(topic.toLowerCase())) {
      mem.refus++;
      updateRelation(pnj, playerId, -2);
      replyText = "Ça ne m’intéresse pas. Change de sujet.";
    } else {
      if (Math.random() < 0.6) {
        updateRelation(pnj, playerId, +2);
        replyText = `Hmm… ${topic}, voilà un sujet intéressant.`;
      } else {
        updateRelation(pnj, playerId, -1);
        replyText = `Bof… même si j’aime ${topic}, pas maintenant.`;
      }
    }
  }

  // ================= FLIRT =================
  if (parsed.type === "flirt") {
    if (!orientationCompatible(pnj, player)) {
      replyText = "Ce n’est clairement pas mon genre.";
      updateRelation(pnj, playerId, -2);
    } else {
      const chance = pnj.habits.flirt_acceptance || 50;
      if (Math.random() * 100 < chance) {
        updateRelation(pnj, playerId, +3);
        replyText = "Hmm… continue.";
      } else {
        updateRelation(pnj, playerId, -2);
        replyText = "N’insiste pas.";
      }
    }
  }

  // ================= SEX =================
  if (parsed.type === "sex") {
    if (!orientationCompatible(pnj, player)) {
      replyText = "Oublie ça.";
    } else if (mem.relation < 50) {
      replyText = "On n’en est pas là.";
    } else if (Math.random() * 100 < (pnj.habits.sexual_acceptance || 0)) {
      replyText = "Très bien… suis-moi.";
    } else {
      replyText = "Pas aujourd’hui.";
    }
  }

  mem.events.push({ text, date: new Date().toISOString() });

  // ================= GEMINI RP =================
  const prompt = `
Tu es ${pnjName}, un PNJ du monde Fallen Angeles.
Caractère: ${pnj.caractere}
Relation avec le joueur: ${mem.status}

Répond de manière RP courte, naturelle et immersive.
Message de base:
"${replyText}"
`;

  const result = await model.generateContent(prompt);
  const finalText = result.response.text();

  // ================= CAPTION =================
  const caption = `*${pnjName}:* | *Relation:* ${mem.status} - ${mem.relation}%
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
💬 ${finalText}

▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                              💠▯▯▯▯▯▯⎢⎢⎢⎢⎢`;

  return {
    caption,
    image: pnj.image
  };
}

// ================================
// EXPORT
// ================================
module.exports = {
  handlePNJMessage,
  fallenAngeles
};
