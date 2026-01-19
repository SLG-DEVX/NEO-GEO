// ============================
// ElysiumHudBD.js
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
// MODELE HUD
// ============================
const HUD = sequelize.define('HUD', {
  id: { type: DataTypes.STRING, primaryKey: true }, // le JID
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
  code_hud: { type: DataTypes.STRING, defaultValue: 'aucun' }, // optionnel comme code_fiche
}, {
  tableName: 'elysium_hud',
  freezeTableName: true,
  timestamps: false,
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
// FONCTIONS HUD
// ============================

// Récupérer un HUD par JID
async function getHUD(where = {}) {
  if (typeof where === 'string') where = { id: where }; // correction Sequelize v6
  return await HUD.findOne({ where });
}

// Créer un HUD
async function addHUD(id, data = {}) {
  if (!id) throw new Error("ID requis");
  const exists = await HUD.findOne({ where: { id } });
  if (exists) return null;
  return await HUD.create({ id, ...data });
}

// Mettre à jour un HUD
async function setHUD(colonne, valeur, id) {
  const updateData = {};
  updateData[colonne] = valeur;
  const [updated] = await HUD.update(updateData, { where: { id } });
  if (!updated) return null;
  return true;
}

// Supprimer un HUD
async function deleteHUD(id) {
  return await HUD.destroy({ where: { id } });
}

// Récupérer tous les HUDs
async function getAllHUDs() {
  return await HUD.findAll();
}

// ============================
// EXPORTS
// ============================
const HUDFunctions = {
  getUserData: getHUD,
  saveUser: addHUD,
  updateUser: setHUD,
  deleteUser: deleteHUD,
  getAllHUDs
};

module.exports = { HUDFunctions };
