const { Sequelize, DataTypes } = require("sequelize");
const config = require("../set");

const db = config.DATABASE;

// ============================
// CONNEXION DB (CLONE FICHES)
// ============================
let sequelize;

if (!db) {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./database.db",
    logging: false
  });
} else {
  sequelize = new Sequelize(db, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
}

// ============================
// MODEL HUD (MIROIR FICHES)
// ============================
const ElysiumHUD = sequelize.define("ElysiumHUD", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  jid: { type: DataTypes.STRING, unique: true },
  user: { type: DataTypes.STRING },

  besoins: { type: DataTypes.INTEGER, defaultValue: 100 },
  pv: { type: DataTypes.INTEGER, defaultValue: 100 },
  energie: { type: DataTypes.INTEGER, defaultValue: 100 },
  forme: { type: DataTypes.INTEGER, defaultValue: 100 },
  stamina: { type: DataTypes.INTEGER, defaultValue: 100 },
  plaisir: { type: DataTypes.INTEGER, defaultValue: 100 },

  intelligence: { type: DataTypes.INTEGER, defaultValue: 0 },
  force: { type: DataTypes.INTEGER, defaultValue: 0 },
  vitesse: { type: DataTypes.INTEGER, defaultValue: 0 },
  reflexes: { type: DataTypes.INTEGER, defaultValue: 0 },
  resistance: { type: DataTypes.INTEGER, defaultValue: 0 },

  gathering: { type: DataTypes.INTEGER, defaultValue: 0 },
  driving: { type: DataTypes.INTEGER, defaultValue: 0 },
  hacking: { type: DataTypes.INTEGER, defaultValue: 0 }

}, {
  tableName: "elysium_hud",
  freezeTableName: true,
  timestamps: false
});

// ============================
// SYNC (COMME FICHES)
// ============================
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("✔ [HUD] Base synchronisée");
  } catch (e) {
    console.error("❌ [HUD DB ERROR]", e);
  }
})();

// ============================
// FUNCTIONS (COPIE FICHES)
// ============================
const HUDFunctions = {

  async saveUser(jid, data = {}) {
    const exist = await ElysiumHUD.findOne({ where: { jid } });
    if (exist) return null;
    return ElysiumHUD.create({ jid, ...data });
  },

  async getUserData(jid) {
    return ElysiumHUD.findOne({ where: { jid } });
  },

  async updateUser(colonne, valeur, jid) {
    return ElysiumHUD.update(
      { [colonne]: valeur },
      { where: { jid } }
    );
  },

  async deleteUser(jid) {
    return ElysiumHUD.destroy({ where: { jid } });
  },

  async getAllHUDs() {
    return ElysiumHUD.findAll();
  }

};

module.exports = { HUDFunctions };
