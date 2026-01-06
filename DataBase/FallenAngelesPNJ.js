// ==================================================
// UTILITAIRES
// ==================================================
function normalizeId(name) {
  return name.toLowerCase().trim();
}

function determineCategory(charisme) {
  if (charisme >= 40) return "mythique";
  if (charisme >= 20) return "légendaire";
  if (charisme >= 10) return "rare";
  return "commun";
}

function determinePlacement(social) {
  if (social === "Metropolitain") return "dominant";
  if (social === "Neolitain") return "influent";
  if (social === "Urban") return "neutre";
  return "marginal";
}

function getRandomLocation(lieux) {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const lieu of lieux) {
    cumulative += lieu.chance;
    if (roll <= cumulative) return lieu.name;
  }
  return lieux[0].name;
}

// ==================================================
// PNJ – FALLEN ANGELES🌴
// ==================================================
const fallenAngeles = [

  // ==============================
  // XHANA REYES
  // ==============================
  {
    name: "Xhana Reyes",
    sexe: "Femme",
    orientation: "bisexual",
    classe: "serveuse",
    social: "service worker",
    lieux: [
      { name: "Fallen Angeles", chance: 50 },
      { name: "LUX", chance: 30 },
      { name: "Contoir", chance: 20 }
    ],
    horaires: "19:30-03:30",
    adresse: "Av.Westshores", 
    lifestyle: 1000,
    niveau: 20,
    cash: 1200000,
    statut: "employée",
    caractere: "neutre",
    charisme: 20,
    likes: ["Musique", "Art", "Fashion"],
    dislikes: ["Animaux", "Études", "Politique"],
    friends: [],
    lovers: [],
    image: "",
    image_home: "",
    image_extra: "",
    image_hot: "",
    conversation_styles: {
      texto: [
        "Hey salut, comment tu vas ?",
        "Tu fais quoi là ?"
      ],
      appel: [
        "Hey, tu me manques. Viens me rejoindre.",
        "J'avais envie d'entendre ta voix."
      ]
    },
    habits: {
      sexual_acceptance: 60,
      flirt_acceptance: 40,
      rules: {
        sex_requires: {
          charisme_min: 40,
          lifestyle_min: 10000,
          relation: "ouverte"
        }
      },
      autonomous_behaviors: {
        triggers: { relation_min: 70, charisme_player_min: 40 },
        actions: {
          send_text: { chance: 40, cooldown_hours: 6 },
          call_player: { chance: 25, cooldown_hours: 12 },
          send_gift: { chance: 10, cooldown_hours: 72 }
        }
      },
      comportement: {
        attitude: "Neutre",
        description: "S'attache progressivement et agit seul",
        independant: true
      }
    },
    jealousy: {
      level: 0,
      tolerance: 50,
      targets: ["Lilith"],
      reactions: { mild: ["message_froid"], medium: ["confrontation"], high: ["rupture"] }
    },
    memory: {} // mémoire dynamique par joueur jid
  },

  // ==============================
  // LILITH
  // ==============================
  {
    name: "Lilith",
    sexe: "Femme",
    orientation: "bisexual",
    classe: "Démone Originelle",
    social: "Élite",
    lieux: [
      { name: "Palais nocturne", chance: 70 },
      { name: "Club Interdit", chance: 20 },
      { name: "Inconnu", chance: 10 }
    ],
    horaires: "21:00-04:00",
    adresse: "Westshores", 
    lifestyle: 900,
    niveau: 90,
    cash: 999999,
    statut: "Dominante",
    caractere: "provocante",
    charisme: 96,
    likes: ["Pouvoir", "Séduction"],
    dislikes: ["Soumission"],
    friends: [],
    lovers: [],
    image: "",
    image_home: "",
    image_extra: "",
    image_hot: "",
    conversation_styles: {
      texto: [
        "Tu joues avec le feu.",
        "Je pensais à toi… mauvaise idée ?"
      ],
      appel: [
        "Viens maintenant.",
        "Je n'aime pas attendre."
      ]
    },
    habits: {
      sexual_acceptance: 85,
      flirt_acceptance: 70,
      rules: {
        sex_requires: {
          charisme_min: 60,
          lifestyle_min: 20000,
          relation: "soumission_acceptée"
        }
      },
      autonomous_behaviors: {
        triggers: { relation_min: 15000, charisme_player_min: 60 },
        actions: {
          send_text: { chance: 70, cooldown_hours: 4 },
          call_player: { chance: 40, cooldown_hours: 8 }
        }
      },
      comportement: {
        attitude: "Dominante",
        description: "Contrôle la relation et teste le joueur",
        independant: true
      }
    },
    jealousy: {
      level: 0,
      tolerance: 20,
      targets: ["Xhana Reyes"],
      reactions: { mild: ["message_froid"], medium: ["appel_confrontation"], high: ["punition","rupture"] }
    },
    memory: {} // mémoire dynamique par joueur jid
  }
];

// ==================================================
// NORMALISATION
// ==================================================
const normalizedPNJ = fallenAngeles.map(pnj => ({
  id: normalizeId(pnj.name),
  ...pnj,
  category: determineCategory(pnj.charisme),
  placement: determinePlacement(pnj.social)
}));

// ==================================================
// MÉMOIRE ET INTERACTIONS
// ==================================================

// Init memory pour un joueur si inexistant
function initMemory(pnj, playerId) {
  if (!pnj.memory[playerId]) {
    pnj.memory[playerId] = {
      relation: 0,
      last_interaction: null,
      gifts_received: [],
      flirt_count: 0,
      jealousy_triggered: false,
      events_triggered: []
    };
  }
  return pnj.memory[playerId];
}

// Augmente la relation avec le joueur
function increaseRelation(pnj, playerId, amount) {
  const mem = initMemory(pnj, playerId);
  mem.relation += amount;
}

// Déclenche jalousie
function increaseJealousy(pnj, amount) {
  pnj.jealousy.level = Math.min(100, pnj.jealousy.level + amount);
}

// Vérifie et retourne réaction selon jalousie
function processJealousy(pnj) {
  const { level, tolerance, reactions } = pnj.jealousy;
  if (level < tolerance) return null;
  if (level < tolerance + 20) return reactions.mild;
  if (level < tolerance + 50) return reactions.medium;
  return reactions.high;
}

// Actions autonomes selon relation et triggers
function tryAutonomousAction(pnj, playerId) {
  const mem = initMemory(pnj, playerId);
  for (const [action, cfg] of Object.entries(pnj.habits.autonomous_behaviors.actions)) {
    const roll = Math.random() * 100;
    if (roll <= cfg.chance && mem.relation >= pnj.habits.autonomous_behaviors.triggers.relation_min) {
      return action; // retour de l'action à exécuter par le moteur
    }
  }
  return null;
}

// Obtenir le dialogue en fonction de la mémoire et jalousie
function getDialogue(pnj, playerId) {
  const mem = initMemory(pnj, playerId);
  if (mem.jealousy_triggered) return "Je sais ce que tu fais avec les autres…";
  if (mem.relation >= 15000) return "Hey, tu me manques…";
  return pnj.conversation_styles.texto[0];
}

// ==================================================
// EXPORT
// ==================================================
module.exports = {
  fallenAngeles: normalizedPNJ,
  getRandomLocation,
  initMemory,
  increaseRelation,
  increaseJealousy,
  processJealousy,
  tryAutonomousAction,
  getDialogue
};
