
const neoCityFALocations = {

  // =========================
  // 🏢 METROPOLITANIA [N] — 50km ➜ 33km
  // =========================

  "50km": {
    name: "Northgate",
    location: "50km | North",
    district: "Metropolitana",
    outside: "Checkpoint blindé",
    inside: "Contrôle biométrique",
    activite: ["Entrée", "Filtrage"],
    mission: ["Passage illégal", "Sabotage du contrôle", "Infiltration frontière"],
    danger: 80,
    traffic: 85,
    securite: 95,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "49km": {
    name: "Museum",
    location: "49km | North",
    district: "Metropolitana",
    outside: "Statues, visiteurs",
    inside: "Galeries surveillées",
    activite: ["Culture"],
    mission: ["Vol discret", "Repérage culturel", "Contact sous couverture"],
    danger: 35,
    traffic: 45,
    securite: 70,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "48km": {
    name: "LUX",
    location: "48km | North",
    district: "Metropolitana",
    outside: "Valets, limousines",
    inside: "Salon VIP",
    activite: ["Nightlife"],
    mission: ["Protection VIP", "Deal discret", "Espionnage mondain"],
    danger: 70,
    traffic: 75,
    securite: 85,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "47km": {
    name: "NC Bank",
    location: "47km | North",
    district: "Metropolitana",
    outside: "Gardes armés",
    inside: "Coffre central",
    activite: ["Finance", "Braquage"],
    mission: ["Braquage haute sécurité", "Infiltration serveur", "Sabotage financier"],
    danger: 90,
    traffic: 70,
    securite: 100,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "46km": {
    name: "Collins Parking",
    location: "46km | North",
    district: "Metropolitana",
    outside: "Parking étagé",
    inside: "Sous-sols sombres",
    activite: ["Planque"],
    mission: ["Planque temporaire", "Échange discret", "Fuite rapide"],
    danger: 55,
    traffic: 60,
    securite: 60,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "45km": {
    name: "Tennessy Metro",
    location: "45km | North",
    district: "Metropolitana",
    outside: "Station contrôlée",
    inside: "Réseau métro",
    activite: ["Transport"],
    mission: ["Filature", "Fuite en métro", "Sabotage ligne"],
    danger: 60,
    traffic: 90,
    securite: 75,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "44km": {
    name: "Grand Hotel",
    location: "44km | North",
    district: "Metropolitana",
    outside: "Façade luxe",
    inside: "Suites sécurisées",
    activite: ["Repos", "Espionnage"],
    mission: ["Infiltration chambre", "Surveillance cible", "Vol de données"],
    danger: 65,
    traffic: 70,
    securite: 85,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "43km": {
    name: "Blue Fish",
    location: "43km | North",
    district: "Metropolitana",
    outside: "Restaurant chic",
    inside: "Salle privée",
    activite: ["Restauration", "Meeting"],
    mission: ["Négociation secrète", "Empoisonnement", "Rendez-vous mafieux"],
    danger: 45,
    traffic: 55,
    securite: 60,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "42km": {
    name: "Jaccob's",
    location: "42km | North",
    district: "Metropolitana",
    outside: "Bar discret",
    inside: "Salons fermés",
    activite: ["Infos", "Deals"],
    mission: ["Collecte d’informations", "Deal illégal", "Chantage"],
    danger: 60,
    traffic: 65,
    securite: 70,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "41km": {
    name: "BusinessCO",
    location: "41km | North",
    district: "Metropolitana",
    outside: "Tours vitrées",
    inside: "Bureaux",
    activite: ["Business"],
    mission: ["Espionnage industriel", "Sabotage corporate", "Vol de contrats"],
    danger: 55,
    traffic: 75,
    securite: 80,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "40km": {
    name: "Sportcenter North",
    location: "40km | North",
    district: "Metropolitana",
    outside: "Complexe sportif",
    inside: "Arenas",
    activite: ["Sport"],
    mission: ["Combat clandestin", "Recrutement", "Protection événement"],
    danger: 50,
    traffic: 65,
    securite: 65,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "39km": {
    name: "Hospital",
    location: "39km | North",
    district: "Metropolitana",
    outside: "Urgences",
    inside: "Bloc médical",
    activite: ["Soins"],
    mission: ["Extraction patient", "Soins illégaux", "Protection témoin"],
    danger: 45,
    traffic: 70,
    securite: 75,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "38km": {
    name: "Memorata",
    location: "38km | North",
    district: "Metropolitana",
    outside: "Centre commercial",
    inside: "Galeries",
    activite: ["Shopping"],
    mission: ["Pickpocket", "Surveillance foule", "Échange public"],
    danger: 40,
    traffic: 55,
    securite: 55,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "37km": {
    name: "Sparks Home",
    location: "37km | North",
    district: "Metropolitana",
    outside: "Quartier calme",
    inside: "Maisons",
    activite: ["Repos"],
    mission: ["Planque longue durée", "Observation discrète", "Préparation mission"],
    danger: 25,
    traffic: 30,
    securite: 40,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "36km": {
    name: "Eternity Store",
    location: "36km | North",
    district: "Metropolitana",
    outside: "Rue commerçante",
    inside: "Boutiques",
    activite: ["Commerce"],
    mission: ["Vol ciblé", "Deal sous couverture", "Repérage zone"],
    danger: 35,
    traffic: 50,
    securite: 50,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "35km": {
    name: "Star Parade",
    location: "35km | North",
    district: "Metropolitana",
    outside: "Boulevard animé",
    inside: "Clubs",
    activite: ["Défilé", "Événement"],
    mission: ["Protection célébrité", "Chaos contrôlé", "Vol médiatisé"],
    danger: 55,
    traffic: 75,
    securite: 65,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "34km": {
    name: "LCD Cars",
    location: "34km | North",
    district: "Metropolitana",
    outside: "Concession",
    inside: "Showroom",
    activite: ["Achat", "Custom"],
    mission: ["Vol de véhicule", "Custom illégal", "Livraison rapide"],
    danger: 45,
    traffic: 60,
    securite: 55,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "33km": {
    name: "Metroïd Station",
    location: "33km | North",
    district: "Metropolitana",
    outside: "Rails",
    inside: "Trains",
    activite: ["Voyage", "Fuite"],
    mission: ["Évasion", "Poursuite ferroviaire", "Filature"],
    danger: 65,
    traffic: 90,
    securite: 70,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  // =========================
  // 🍸 ANGELS VICE [E] — 32km ➜ 17km
  // =========================

  "32km": {
    name: "Montana Parking",
    location: "32km | East",
    district: "Angels Vice",
    outside: "Parking béton",
    inside: "Sous-sols",
    activite: ["Planque"],
    mission: ["Planque mafieuse", "Échange d’armes", "Fuite nocturne"],
    danger: 60,
    traffic: 65,
    securite: 55,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "31km": {
    name: "C-Center",
    location: "31km | East",
    district: "Angels Vice",
    outside: "Mall",
    inside: "Commerces",
    activite: ["Shopping"],
    mission: ["Vol à l’étalage", "Surveillance civile", "Contact public"],
    danger: 45,
    traffic: 70,
    securite: 50,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "30km": {
    name: "ATM Sharp",
    location: "30km | East",
    district: "Angels Vice",
    outside: "Zone bancaire",
    inside: "Distributeurs",
    activite: ["Cash", "Hold-up"],
    mission: ["Braquage rapide", "Piratage ATM", "Fuite express"],
    danger: 70,
    traffic: 60,
    securite: 80,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  // =========================
  // 🍸 ANGELS VICE [E] — 29km ➜ 21km
  // =========================

  "29km": {
    name: "Vice Street",
    location: "29km | East",
    district: "Angels Vice",
    outside: "Rue animée, néons",
    inside: "Clubs et backrooms",
    activite: ["Nightlife", "Deal"],
    mission: ["Transaction illégale", "Filature nocturne", "Protection de contact"],
    danger: 75,
    traffic: 80,
    securite: 60,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "28km": {
    name: "Red Motel",
    location: "28km | East",
    district: "Angels Vice",
    outside: "Parking isolé",
    inside: "Chambres miteuses",
    activite: ["Planque"],
    mission: ["Planque criminelle", "Interrogatoire discret", "Élimination silencieuse"],
    danger: 80,
    traffic: 45,
    securite: 40,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "27km": {
    name: "Strip Avenue",
    location: "27km | East",
    district: "Angels Vice",
    outside: "Strip clubs",
    inside: "Salons privés",
    activite: ["Nightlife", "Blanchiment"],
    mission: ["Deal VIP", "Espionnage privé", "Récupération d’argent"],
    danger: 85,
    traffic: 75,
    securite: 65,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "26km": {
    name: "Casino",
    location: "26km | East",
    district: "Angels Vice",
    outside: "Entrée luxueuse",
    inside: "Salle VIP, coffre",
    activite: ["Jeux", "Blanchiment", "Nightlife"],
    mission: ["Vol en zone VIP", "Échange mafieux", "Extraction sous pression"],
    danger: 90,
    traffic: 75,
    securite: 90,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "25km": {
    name: "Black Market",
    location: "25km | East",
    district: "Angels Vice",
    outside: "Allées sombres",
    inside: "Stands illégaux",
    activite: ["Trafic", "Commerce"],
    mission: ["Achat illégal", "Sabotage rival", "Protection vendeur"],
    danger: 85,
    traffic: 65,
    securite: 50,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "24km": {
    name: "Neon Club",
    location: "24km | East",
    district: "Angels Vice",
    outside: "Foule nocturne",
    inside: "Dancefloor, loges",
    activite: ["Nightlife"],
    mission: ["Protection DJ", "Deal en loge", "Fuite discrète"],
    danger: 70,
    traffic: 80,
    securite: 60,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "23km": {
    name: "Vice Garage",
    location: "23km | East",
    district: "Angels Vice",
    outside: "Hangar rouillé",
    inside: "Atelier clandestin",
    activite: ["Custom", "Planque"],
    mission: ["Modification illégale", "Vol de véhicule", "Livraison risquée"],
    danger: 75,
    traffic: 55,
    securite: 45,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "22km": {
    name: "Underground Ring",
    location: "22km | East",
    district: "Angels Vice",
    outside: "Entrepôt abandonné",
    inside: "Arène clandestine",
    activite: ["Combat", "Paris"],
    mission: ["Combat illégal", "Protection combattant", "Sabotage événement"],
    danger: 90,
    traffic: 60,
    securite: 55,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "21km": {
    name: "CLUB Venus",
    location: "21km | East",
    district: "Angels Vice",
    outside: "Entrée VIP",
    inside: "Suites privées",
    activite: ["Nightlife", "Escort"],
    mission: ["Protection VIP", "Espionnage privé", "Deal haut niveau"],
    danger: 80,
    traffic: 70,
    securite: 75,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  // =========================
  // 🎡 MARINA CORE [S] — 20km ➜ 11km
  // =========================

  "20km": {
    name: "Port Central",
    location: "20km | South",
    district: "Marina Core",
    outside: "Quais animés",
    inside: "Entrepôts portuaires",
    activite: ["Transport", "Cargo"],
    mission: ["Contrebande", "Inspection illégale", "Vol de cargaison"],
    danger: 70,
    traffic: 85,
    securite: 70,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "19km": {
    name: "MG Stage",
    location: "19km | South",
    district: "Marina Core",
    outside: "Scène extérieure",
    inside: "Backstage",
    activite: ["Concert", "Event"],
    mission: ["Protection artiste", "Sabotage concert", "Extraction célébrité"],
    danger: 65,
    traffic: 80,
    securite: 70,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "18km": {
    name: "Marina Mall",
    location: "18km | South",
    district: "Marina Core",
    outside: "Centre moderne",
    inside: "Boutiques",
    activite: ["Shopping"],
    mission: ["Vol discret", "Filature", "Échange public"],
    danger: 45,
    traffic: 75,
    securite: 60,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "17km": {
    name: "Ocean Hotel",
    location: "17km | South",
    district: "Marina Core",
    outside: "Vue mer",
    inside: "Suites",
    activite: ["Repos", "Business"],
    mission: ["Espionnage hôtelier", "Protection client", "Vol de données"],
    danger: 55,
    traffic: 65,
    securite: 75,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "16km": {
    name: "Pier Park",
    location: "16km | South",
    district: "Marina Core",
    outside: "Parc public",
    inside: "Attractions",
    activite: ["Loisir"],
    mission: ["Surveillance foule", "Pickpocket", "Protection événement"],
    danger: 40,
    traffic: 70,
    securite: 55,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "15km": {
    name: "Stadium",
    location: "15km | South",
    district: "Marina Core",
    outside: "Stade géant",
    inside: "Vestiaires, loges",
    activite: ["Sport", "Event"],
    mission: ["Sécurité match", "Sabotage événement", "Extraction VIP"],
    danger: 70,
    traffic: 90,
    securite: 80,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "14km": {
    name: "Dockyard",
    location: "14km | South",
    district: "Marina Core",
    outside: "Chantier naval",
    inside: "Hangars",
    activite: ["Maintenance", "Cargo"],
    mission: ["Sabotage navire", "Vol de pièces", "Planque maritime"],
    danger: 65,
    traffic: 60,
    securite: 65,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "13km": {
    name: "Sea Market",
    location: "13km | South",
    district: "Marina Core",
    outside: "Marché ouvert",
    inside: "Réserves",
    activite: ["Commerce"],
    mission: ["Transaction rapide", "Vol ciblé", "Surveillance locale"],
    danger: 45,
    traffic: 55,
    securite: 50,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "12km": {
    name: "Marina Hospital",
    location: "12km | South",
    district: "Marina Core",
    outside: "Urgences",
    inside: "Bloc médical",
    activite: ["Soins"],
    mission: ["Extraction patient", "Protection témoin", "Soins clandestins"],
    danger: 50,
    traffic: 65,
    securite: 75,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "11km": {
    name: "Joytown",
    location: "11km | South",
    district: "Marina Core",
    outside: "Quartier festif",
    inside: "Salles d’arcade",
    activite: ["Fun", "Jeux"],
    mission: ["Repérage", "Contact informel", "Mission légère"],
    danger: 35,
    traffic: 60,
    securite: 45,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  // =========================
  // 🏠 MARINA SOUTH — 10km ➜ 1km
  // =========================

  "10km": {
    name: "South Parking",
    location: "10km | South",
    district: "Marina South",
    outside: "Parking ouvert",
    inside: "Sous-sols",
    activite: ["Planque"],
    mission: ["Planque courte", "Échange discret", "Préparation fuite"],
    danger: 45,
    traffic: 40,
    securite: 35,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "9km": {
    name: "Container Yard",
    location: "9km | South",
    district: "Marina South",
    outside: "Containers",
    inside: "Zones fermées",
    activite: ["Stockage"],
    mission: ["Stockage illégal", "Récupération marchandise", "Surveillance zone"],
    danger: 55,
    traffic: 35,
    securite: 40,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "8km": {
    name: "Races",
    location: "8km | South",
    district: "Marina South",
    outside: "Circuit urbain",
    inside: "Garages",
    activite: ["Courses", "Paris"],
    mission: ["Course illégale", "Poursuite rapide", "Sabotage véhicule"],
    danger: 75,
    traffic: 80,
    securite: 65,
    rank: "S",
    imageDay: "",
    imageNight: ""
  },

  "7km": {
    name: "Old Factory",
    location: "7km | South",
    district: "Marina South",
    outside: "Usine abandonnée",
    inside: "Machines rouillées",
    activite: ["Planque"],
    mission: ["Planque longue", "Fabrication illégale", "Interrogatoire"],
    danger: 65,
    traffic: 30,
    securite: 25,
    rank: "A",
    imageDay: "",
    imageNight: ""
  },

  "6km": {
    name: "South Homes",
    location: "6km | South",
    district: "Marina South",
    outside: "Résidences",
    inside: "Maisons",
    activite: ["Repos"],
    mission: ["Surveillance discrète", "Protection civile", "Mission locale"],
    danger: 25,
    traffic: 30,
    securite: 35,
    rank: "C",
    imageDay: "",
    imageNight: ""
  },

  "5km": {
    name: "Seattle Home",
    location: "5km | South",
    district: "Marina South",
    outside: "Quartier calme",
    inside: "Maison sécurisée",
    activite: ["Repos", "Planque"],
    mission: ["Planquer un PNJ", "Préparer mission", "Repos stratégique"],
    danger: 25,
    traffic: 20,
    securite: 35,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "4km": {
    name: "South Shop",
    location: "4km | South",
    district: "Marina South",
    outside: "Petites boutiques",
    inside: "Réserves",
    activite: ["Commerce"],
    mission: ["Vol mineur", "Contact local", "Observation"],
    danger: 20,
    traffic: 25,
    securite: 30,
    rank: "C",
    imageDay: "",
    imageNight: ""
  },

  "3km": {
    name: "Beach Road",
    location: "3km | South",
    district: "Marina South",
    outside: "Route côtière",
    inside: "Stations",
    activite: ["Transit"],
    mission: ["Transport discret", "Filature légère", "Fuite côtière"],
    danger: 30,
    traffic: 35,
    securite: 40,
    rank: "C",
    imageDay: "",
    imageNight: ""
  },

  "2km": {
    name: "Lighthouse",
    location: "2km | South",
    district: "Marina South",
    outside: "Phare isolé",
    inside: "Tour",
    activite: ["Observation"],
    mission: ["Observation longue", "Contact secret", "Signalisation"],
    danger: 35,
    traffic: 10,
    securite: 25,
    rank: "B",
    imageDay: "",
    imageNight: ""
  },

  "1km": {
    name: "Marina Beach",
    location: "1km | South",
    district: "Marina South",
    outside: "Plage ouverte",
    inside: "Cabines",
    activite: ["Détente"],
    mission: ["Rendez-vous discret", "Repos final", "Évasion maritime"],
    danger: 20,
    traffic: 30,
    securite: 30,
    rank: "C",
    imageDay: "",
    imageNight: ""
  }

};
module.exports = { neoCityFALocations };
