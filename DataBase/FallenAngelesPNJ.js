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
      { name: "Fallen Angeles", chance: 100 },
      { name: "LUX", chance: 100 },
      { name: "Contoir", chance: 100 }
    ],

    horaires: "19:30-3:30",
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
        "Tu fais quoi là ?",
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
        triggers: {
          relation_min: 70,
          charisme_player_min: 40
        },
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
      reactions: {
        mild: ["message_froid"],
        medium: ["confrontation"],
        high: ["rupture"]
      }
    },

    memory: {}
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
        triggers: {
          relation_min: 15000,
          charisme_player_min: 60
        },
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
      targets: ["Dexter Mikey"],
      reactions: {
        mild: ["message_froid"],
        medium: ["appel_confrontation"],
        high: ["punition", "rupture"]
      }
    },

    memory: {}
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
// EXPORT
// ==================================================
module.exports = {
  fallenAngeles: normalizedPNJ,
  getRandomLocation
};
