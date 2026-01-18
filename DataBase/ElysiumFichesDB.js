// ============================
// ElysiumFichesDB.js 
// ============================

const { Sequelize, DataTypes } = require('sequelize');
const config = require('../set');
const db = config.DATABASE;

let sequelize;

// ============================
// CONNEXION DB
// ============================
if (!db) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.db',
    logging: false,
  });
} else {
  sequelize = new Sequelize(db, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });
}

// ============================
// MODELE
// ============================
const ElysiumFiche = sequelize.define('ElysiumFiche', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  jid: { type: DataTypes.STRING, unique: true },
  pseudo: { type: DataTypes.STRING, defaultValue: 'aucun' },
  user: { type: DataTypes.STRING, defaultValue: 'aucun' },
  exp: { type: DataTypes.INTEGER, defaultValue: 0 },
  niveau: { type: DataTypes.INTEGER, defaultValue: 1 },
  rang: { type: DataTypes.STRING, defaultValue: 'Novice🥉' },
  ecash: { type: DataTypes.INTEGER, defaultValue: 0 },
  lifestyle: { type: DataTypes.INTEGER, defaultValue: 0 },
  charisme: { type: DataTypes.INTEGER, defaultValue: 0 },
  reputation: { type: DataTypes.INTEGER, defaultValue: 0 },
  cyberwares: { type: DataTypes.TEXT, defaultValue: '' },
  infos: { type: DataTypes.TEXT, defaultValue: '' },
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
  oc_url: { type: DataTypes.STRING, defaultValue: 'https://files.catbox.moe/4quw3r.jpg' },
  code_fiche: { type: DataTypes.STRING, defaultValue: 'aucun' },
}, {
  tableName: 'elysium_fiches',
  freezeTableName: true,
  timestamps: false
});

// ============================
// SYNC
// ============================
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("✔ [ELY] Base de données synchronisée");
  } catch (e) {
    console.error("❌ [ELY DB ERROR]", e);
  }
})();

// ============================
// FONCTIONS
// ============================

// ✅ NE THROW PLUS
async function getPlayer(where = {}) {
  return await ElysiumFiche.findOne({ where }); // null si pas trouvé
}

async function setPlayer(colonne, valeur, jid) {
  const updateData = {};
  updateData[colonne] = valeur;

  const [updated] = await ElysiumFiche.update(updateData, { where: { jid } });
  if (!updated) return null;
  return true;
}

async function addPlayer(jid, data = {}) {
  if (!jid) throw new Error("JID requis");

  const exists = await ElysiumFiche.findOne({ where: { jid } });
  if (exists) return null;

  return await ElysiumFiche.create({ jid, ...data });
}

async function deletePlayer(jid) {
  return await ElysiumFiche.destroy({ where: { jid } });
}

async function getAllPlayers() {
  return await ElysiumFiche.findAll();
}

module.exports = {
  getPlayer,
  setPlayer,
  addPlayer,
  deletePlayer,
  getAllPlayers
};
