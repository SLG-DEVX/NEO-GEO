// ============================
// ElysiumHUDDB.js
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
      ssl: { require: true, rejectUnauthorized: false },
    },
    logging: false,
  });
}

// ============================
// MODELE HUD
// ============================
const HUD = sequelize.define('HUD', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  jid: { type: DataTypes.STRING, unique: true },
  pseudo: { type: DataTypes.STRING, defaultValue: 'aucun' },
  user: { type: DataTypes.STRING, defaultValue: 'aucun' },
  
  besoins: { type: DataTypes.INTEGER, defaultValue: 100 },
  pv: { type: DataTypes.INTEGER, defaultValue: 100 },
  energie: { type: DataTypes.INTEGER, defaultValue: 100 },
  forme: { type: DataTypes.INTEGER, defaultValue: 100 },
  stamina: { type: DataTypes.INTEGER, defaultValue: 100 },
  plaisir: { type: DataTypes.INTEGER, defaultValue: 100 },

  intelligence: { type: DataTypes.INTEGER, defaultValue: 1 },
  force: { type: DataTypes.INTEGER, defaultValue: 1 },
  vitesse: { type: DataTypes.INTEGER, defaultValue: 1 },
  reflexes: { type: DataTypes.INTEGER, defaultValue: 1 },
  resistance: { type: DataTypes.INTEGER, defaultValue: 1 },

  gathering: { type: DataTypes.INTEGER, defaultValue: 0 },
  driving: { type: DataTypes.INTEGER, defaultValue: 0 },
  hacking: { type: DataTypes.INTEGER, defaultValue: 0 },

  oc_url: { type: DataTypes.STRING, defaultValue: 'https://files.catbox.moe/4quw3r.jpg' },
  code_hud: { type: DataTypes.STRING, defaultValue: 'aucun' },
}, {
  tableName: 'elysium_hud',
  freezeTableName: true,
  timestamps: false
});

// ============================
// SYNC DB
// ============================
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("✔ [HUD] Base de données synchronisée");
  } catch (e) {
    console.error("❌ [HUD DB ERROR]", e);
  }
})();

// ============================
// FONCTIONS HUD (style fiches)
// ============================
async function getHUD(where = {}) {
  return await HUD.findOne({ where });
}

async function setHUD(colonne, valeur, jid) {
  const updateData = {};
  updateData[colonne] = valeur;

  const [updated] = await HUD.update(updateData, { where: { jid } });
  if (!updated) return null;
  return true;
}

async function addHUD(jid, data = {}) {
  if (!jid) throw new Error("JID requis");

  const exists = await HUD.findOne({ where: { jid } });
  if (exists) return null;

  return await HUD.create({ jid, ...data });
}

async function deleteHUD(jid) {
  return await HUD.destroy({ where: { jid } });
}

async function getAllHUDs() {
  return await HUD.findAll();
}

// ============================
// EXPORT POUR ELYSIUMHUD.JS
// ============================
const HUDFunctions = {
  saveUser: addHUD,
  deleteUser: deleteHUD,
  getUserData: getHUD,
  updateUser: setHUD,
  getAllHUDs: getAllHUDs
};

module.exports = { HUDFunctions };
