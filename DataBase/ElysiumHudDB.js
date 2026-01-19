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
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });
}

// ============================
// MODELE
// ============================
const ElysiumHUD = sequelize.define('ElysiumHUD', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  jid: { type: DataTypes.STRING, unique: true },
  user: { type: DataTypes.STRING, defaultValue: 'aucun' },

  besoins: { type: DataTypes.INTEGER, defaultValue: 100 },
  pv: { type: DataTypes.INTEGER, defaultValue: 100 },
  energie: { type: DataTypes.INTEGER, defaultValue: 100 },
  forme: { type: DataTypes.INTEGER, defaultValue: 100 },
  stamina: { type: DataTypes.INTEGER, defaultValue: 100 },
  plaisir: { type: DataTypes.INTEGER, defaultValue: 50 },

  intelligence: { type: DataTypes.INTEGER, defaultValue: 0 },
  force: { type: DataTypes.INTEGER, defaultValue: 0 },
  vitesse: { type: DataTypes.INTEGER, defaultValue: 0 },
  reflexes: { type: DataTypes.INTEGER, defaultValue: 0 },
  resistance: { type: DataTypes.INTEGER, defaultValue: 0 },

  gathering: { type: DataTypes.INTEGER, defaultValue: 0 },
  driving: { type: DataTypes.INTEGER, defaultValue: 0 },
  hacking: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'elysium_hud',
  freezeTableName: true,
  timestamps: false,
});

// ============================
// SYNC
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
// FONCTIONS
// ============================
async function getUser(where = {}) {
  return await ElysiumHUD.findOne({ where });
}

async function setUser(colonne, valeur, jid) {
  const updateData = {};
  updateData[colonne] = valeur;
  const [updated] = await ElysiumHUD.update(updateData, { where: { jid } });
  if (!updated) return null;
  return true;
}

async function addUser(jid, data = {}) {
  if (!jid) throw new Error("JID requis");
  const exists = await ElysiumHUD.findOne({ where: { jid } });
  if (exists) return null;
  return await ElysiumHUD.create({ jid, ...data });
}

async function deleteUser(jid) {
  return await ElysiumHUD.destroy({ where: { jid } });
}

async function getAllHUDs() {
  return await ElysiumHUD.findAll();
}

const HUDFunctions = {
  getUserData: getUser,
  updateUser: setUser,
  saveUser: addUser,
  deleteUser,
  getAllHUDs,
};

module.exports = { HUDFunctions };
