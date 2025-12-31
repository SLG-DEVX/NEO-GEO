// ---------------- UTILITAIRE NOM ----------------
function formatNameFromKey(key) {
  return key
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ================================
// FALLEN ANGELES – PNJ 🌴
// ================================
const fallenAngeles = {

  "dexter mikey": {
    sexe: "Homme",
    orientation: "bisexual",
    classe: "Resident",
    social: "Neolitain",
    lieux: "Fallen Angeles",
    lifestyle: 200,
    niveau: 5,
    cash: 1200,
    statut: "Stagiaire",
    caractere: "amical",
    charisme: 20,
    likes: ["Musique", "Discussions"],
    dislikes: ["Autorité"],
    friends: ["@Damian", "mazikeen"],
    lovers: [],
    image: "",
    image_home: "",
    image_extra: "",
    habits: {
      sexual_acceptance: 35,
      flirt_acceptance: 50,
      conditions: ["Relation de confiance", "Discussion préalable"],
      refuse: ["Violence", "Manipulation"],
      comportement: "Répond calmement et cherche le dialogue"
    },
    memory: {}
  },

  "azrael": {
    sexe: "Femme",
    orientation: "femme",
    classe: "Ange de la Mort",
    social: "Solitaire",
    lieux: "Cathédrale abandonnée",
    lifestyle: 50,
    niveau: 40,
    cash: 0,
    statut: "Éternelle",
    caractere: "froid",
    charisme: 85,
    likes: ["Silence", "Équilibre"],
    dislikes: ["Chaos"],
    friends: [],
    lovers: [],
    image: "",
    image_home: "",
    image_extra: "",
    habits: {
      sexual_acceptance: 0,
      flirt_acceptance: 5,
      conditions: ["Lien spirituel fort"],
      refuse: ["Contacts physiques", "Séduction directe"],
      comportement: "Réponses courtes, neutres, détachées"
    },
    memory: {}
  },

  "lilith": {
    sexe: "Femme",
    orientation: "bisexual",
    classe: "Démone Originelle",
    social: "Élite",
    lieux: "Palais nocturne",
    lifestyle: 900,
    niveau: 90,
    cash: 999999,
    statut: "Dominante",
    caractere: "grossier",
    charisme: 96,
    likes: ["Pouvoir", "Séduction"],
    dislikes: ["Soumission"],
    friends: ["lucifer morningstar", "@Damian"],
    lovers: ["lucifer morningstar"],
    image: "",
    image_home: "",
    image_extra: "",
    habits: {
      sexual_acceptance: 85,
      flirt_acceptance: 50,
      conditions: ["Soumission claire", "Jeu de pouvoir"],
      refuse: ["Manque de respect"],
      comportement: "Provocante, dominante, langage cru"
    },
    memory: {}
  },

  "belial": {
    sexe: "Homme",
    orientation: "homme",
    classe: "Prince Démon",
    social: "Noble",
    lieux: "Citadelle rouge",
    lifestyle: 800,
    niveau: 70,
    cash: 300000,
    statut: "Stratège",
    caractere: "froid",
    charisme: 92,
    likes: ["Stratégie"],
    dislikes: ["Improvisation"],
    friends: [],
    lovers: [],
    image: "",
    image_home: "",
    image_extra: "",
    habits: {
      sexual_acceptance: 40,
      flirt_acceptance: 50,
      conditions: ["Intérêt politique"],
      refuse: ["Émotions inutiles"],
      comportement: "Calculateur et distant"
    },
    memory: {}
  },

  "hela": {
    sexe: "Femme",
    orientation: "bisexual",
    classe: "Reine des Morts",
    social: "Élite",
    lieux: "Helheim",
    lifestyle: 1000,
    niveau: 95,
    cash: 666666,
    statut: "Souveraine",
    caractere: "froid",
    charisme: 97,
    likes: ["Âmes"],
    dislikes: ["Vie"],
    friends: [],
    lovers: ["@Damian"],
    image: "",
    image_home: "",
    image_extra: "",
    habits: {
      sexual_acceptance: 50,
      flirt_acceptance: 50,
      conditions: ["Lien émotionnel fort"],
      refuse: ["Jeux frivoles"],
      comportement: "Parle lentement, autoritaire"
    },
    memory: {}
  }

  // 👉 Ajouter d’autres PNJ sur le même modèle
};

// ================================
// CATÉGORIE SELON CHARISME
// ================================
function determineCategory(charisme) {
  if (charisme >= 95) return "mythique";
  if (charisme >= 85) return "légendaire";
  if (charisme >= 70) return "rare";
  return "commun";
}

// ================================
// PLACEMENT SOCIAL
// ================================
function determinePlacement(social) {
  if (social === "Élite") return "dominant";
  if (social === "Noble") return "influent";
  if (social === "Solitaire") return "neutre";
  return "marginal";
}

// ================================
// CRÉATION FICHE PNJ
// ================================
function createFallenAngelFromBase(key, data) {
  return {
    id: key,
    name: formatNameFromKey(key),
    ...data,
    category: determineCategory(data.charisme),
    placement: determinePlacement(data.social)
  };
}

// ================================
// GROUPER PAR PLACEMENT
// ================================
function groupFallenAngelesByPlacement(array) {
  const grouped = {};
  for (const angel of array) {
    if (!grouped[angel.placement]) grouped[angel.placement] = [];
    grouped[angel.placement].push(angel);
  }
  return grouped;
}

// ================================
// GÉNÉRATION GLOBALE
// ================================
function generateFallenAngelesFromBase(object) {
  const all = [];
  for (const [key, value] of Object.entries(object)) {
    all.push(createFallenAngelFromBase(key, value));
  }
  return groupFallenAngelesByPlacement(all);
}

// ================================
// RÉCUPÉRER PNJ PAR NOM (insensible à la casse)
// ================================
function getPNJByName(name) {
  const key = name.toLowerCase();
  return fallenAngeles[key] || null;
}

// ================================
// EXPORT
// ================================
const groupedFallenAngeles = generateFallenAngelesFromBase(fallenAngeles);

module.exports = {
  fallenAngeles,
  groupedFallenAngeles,
  generateFallenAngelesFromBase,
  getPNJByName
};
