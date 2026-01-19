const { Sequelize, DataTypes } = require("sequelize");
const config = require("../set");
const db = config.DATABASE;

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
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false
  });
}

const ElysiumHUD = sequelize.define("ElysiumHUD", {
  jid: { type: DataTypes.STRING, unique: true },
  user: { type: DataTypes.STRING, defaultValue: "aucun" },

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
  hacking: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: "elysium_hud",
  timestamps: false
});

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("✔ [HUD] Base de données synchronisée");
  } catch (e) {
    console.error("❌ [HUD DB ERROR]", e);
  }
})();

const HUDFunctions = {
  getUserData: async (jid) => await ElysiumHUD.findOne({ where: { jid } }),
  updateUser: async (colonne, valeur, jid) => {
    const [updated] = await ElysiumHUD.update({ [colonne]: valeur }, { where: { jid } });
    return updated ? true : null;
  },
  saveUser: async (jid, data) => {
    const exists = await ElysiumHUD.findOne({ where: { jid } });
    if (exists) return null;
    return await ElysiumHUD.create({ jid, ...data });
  },
  deleteUser: async (jid) => await ElysiumHUD.destroy({ where: { jid } }),
  getAllHUDs: async () => await ElysiumHUD.findAll()
};

module.exports = { HUDFunctions };
