const { Sequelize, DataTypes } = require("sequelize");
const config = require("../set");

const db = config.DATABASE;

let sequelize;
if (!db) {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./database.db",
    logging: false,
  });
} else {
  sequelize = new Sequelize(db, {
    dialect: "postgres",
    ssl: true,
    protocol: "postgres",
    dialectOptions: {
      native: true,
      ssl: { require: true, rejectUnauthorized: false },
    },
    logging: false,
  });
}

// ============================
// 🎮 Définition de la table Player
// ============================
const Player = sequelize.define(
  "Player",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    pseudo: { type: DataTypes.STRING, defaultValue: "Anonymous" },
    user: { type: DataTypes.STRING, defaultValue: "aucun" },
    oc_url: { type: DataTypes.STRING, defaultValue: "" },

    // Vitals
    besoins: { type: DataTypes.INTEGER, defaultValue: 100 },
    pv: { type: DataTypes.INTEGER, defaultValue: 100 },
    energie: { type: DataTypes.INTEGER, defaultValue: 100 },
    forme: { type: DataTypes.INTEGER, defaultValue: 100 },
    stamina: { type: DataTypes.INTEGER, defaultValue: 100 },
    plaisir: { type: DataTypes.INTEGER, defaultValue: 100 },

    // Stats principales
    intelligence: { type: DataTypes.INTEGER, defaultValue: 1 },
    force: { type: DataTypes.INTEGER, defaultValue: 1 },
    vitesse: { type: DataTypes.INTEGER, defaultValue: 1 },
    reflexes: { type: DataTypes.INTEGER, defaultValue: 1 },
    resistance: { type: DataTypes.INTEGER, defaultValue: 1 },

    // Métiers
    gathering: { type: DataTypes.INTEGER, defaultValue: 0 },
    driving: { type: DataTypes.INTEGER, defaultValue: 0 },
    hacking: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Progression
    exp: { type: DataTypes.INTEGER, defaultValue: 0 },
    niveau: { type: DataTypes.INTEGER, defaultValue: 1 },
    rang: { type: DataTypes.STRING, defaultValue: "Novice🥉" },

    // Social
    ecash: { type: DataTypes.INTEGER, defaultValue: 50000 },
    lifestyle: { type: DataTypes.INTEGER, defaultValue: 0 },
    charisme: { type: DataTypes.INTEGER, defaultValue: 0 },
    reputation: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Cyberwares
    cyberwares: { type: DataTypes.TEXT, defaultValue: "" },

    // Stats de jeu
    missions: { type: DataTypes.INTEGER, defaultValue: 0 },
    gameover: { type: DataTypes.INTEGER, defaultValue: 0 },
    pvp: { type: DataTypes.INTEGER, defaultValue: 0 },

    points_combat: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_chasse: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_recoltes: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_hacking: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_conduite: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_exploration: { type: DataTypes.INTEGER, defaultValue: 0 },

    trophies: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "player",
    timestamps: false,
  }
);

// ============================
// 🔄 Synchronisation DB
// ============================
(async () => {
  await sequelize.sync({ alter: true });
  console.log("✅ Table Player synchronisée avec Supabase/SQLite");
})();

// ============================
// 📦 Fonctions Player (style AllStarsDivsFiche)
// ============================
async function getAllPlayers() {
  return await Player.findAll();
}

async function getPlayer(where = {}) {
  const [player, created] = await Player.findOrCreate({
    where,
    defaults: {},
  });
  return player;
}

async function setPlayer(colonne, valeur, id) {
  const updateData = {};
  updateData[colonne] = valeur;

  const [updated] = await Player.update(updateData, { where: { id } });

  if (!updated) throw new Error(`❌ Aucun joueur trouvé pour id : ${id}`);
  console.log(`✔ ${colonne} mis à jour → ${valeur}`);
}

async function addPlayer(id, data = {}) {
  if (!id) throw new Error("❌ ID requis");

  const exists = await Player.findOne({ where: { id } });
  if (exists) return null;

  return await Player.create({ id, ...data });
}

async function deletePlayer(id) {
  return await Player.destroy({ where: { id } });
}

module.exports = {
  getAllPlayers,
  getPlayer,
  setPlayer,
  addPlayer,
  deletePlayer,
};
