const { Sequelize, DataTypes } = require("sequelize");
const config = require("../set");

const db = config.DATABASE;
const sequelize = db
  ? new Sequelize(db, {
      dialect: "postgres",
      ssl: true,
      protocol: "postgres",
      dialectOptions: {
        native: true,
        ssl: { require: true, rejectUnauthorized: false },
      },
      logging: false,
    })
  : new Sequelize({
      dialect: "sqlite",
      storage: "./database.db",
      logging: false,
    });

// ============================
// TABLE HUD
// ============================
const HUD = sequelize.define(
  'elysiumhud',
  {
    // ID = JID WhatsApp
    id: { type: DataTypes.STRING, primaryKey: true }, 

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

    oc_url: { type: DataTypes.TEXT, defaultValue: "" },
  },
  {
    tableName: "elysium_hud",
    freezeTableName: true,
    timestamps: false,
  }
);

// ============================
// FONCTIONS HUD
// ============================
const HUDFunctions = {
  // 🔧 Récupérer un HUD par JID
  async getUserData(jid) {
    try {
      return await HUD.findByPk(jid);
    } catch (err) {
      console.error("[HUD GET ERROR]", err);
      return null;
    }
  },

  // 🔧 Alias
  async getHUD(jid) {
    return this.getUserData(jid);
  },

  // ➕ Créer un HUD
  async saveUser(jid, data = {}) {
    try {
      const exists = await HUD.findByPk(jid);
      if (exists) return null; // HUD déjà existant

      const created = await HUD.create({ id: jid, ...data });
      return created;
    } catch (err) {
      console.error("[HUD SAVE ERROR]", err);
      return null;
    }
  },

  // ❌ Supprimer un HUD
  async deleteUser(jid) {
    try {
      const deleted = await HUD.destroy({ where: { id: jid } });
      return deleted;
    } catch (err) {
      console.error("[HUD DELETE ERROR]", err);
      return 0;
    }
  },

  // 🔧 Mettre à jour un HUD
  async updateUser(jid, updates) {
    try {
      const [updated] = await HUD.update(updates, { where: { id: jid } });
      return updated;
    } catch (err) {
      console.error("[HUD UPDATE ERROR]", err);
      return 0;
    }
  },

  // 🔄 Récupérer tous les HUDs
  async getAllHUDs() {
    try {
      return await HUD.findAll();
    } catch (err) {
      console.error("[HUD GETALL ERROR]", err);
      return [];
    }
  },
};

// ============================
// SYNC DB
// ============================
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("✅ Table HUD synchronisée avec succès (elysium_hud).");
  } catch (e) {
    console.error("❌ HUD DB ERROR", e);
  }
})();

module.exports = { HUDFunctions };
