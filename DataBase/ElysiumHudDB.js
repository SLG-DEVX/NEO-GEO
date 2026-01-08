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
  "HUD",
  {
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

    oc_url: { type: DataTypes.STRING, defaultValue: "" },
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
  // 🔒 Récupère ou crée automatiquement un HUD
  async getOrCreateHUD(id) {
    if (!id) return null;

    const [hud, created] = await HUD.findOrCreate({
      where: { id },
      defaults: {
        besoins: 100,
        pv: 100,
        energie: 100,
        forme: 100,
        stamina: 100,
        plaisir: 100,
        intelligence: 1,
        force: 1,
        vitesse: 1,
        reflexes: 1,
        resistance: 1,
        gathering: 0,
        driving: 0,
        hacking: 0,
        oc_url: "",
      },
    });

    return hud;
  },

  // 🔧 Récupérer un HUD (sans créer)
  async getUserData(id) {
    try {
      return await HUD.findByPk(id);
    } catch {
      return null;
    }
  },

  // ➕ Créer un HUD explicitement
  async saveUser(id, data = {}) {
    try {
      const exists = await HUD.findByPk(id);
      if (exists) return "⚠️ Ce joueur possède déjà un HUD.";
      await HUD.create({ id, ...data });
      return "✅ HUD enregistré avec succès.";
    } catch {
      return "❌ Erreur lors de l'enregistrement du HUD.";
    }
  },

  // ❌ Supprimer un HUD
  async deleteUser(id) {
    try {
      const deleted = await HUD.destroy({ where: { id } });
      return deleted ? "✅ HUD supprimé." : "⚠️ HUD introuvable.";
    } catch {
      return "❌ Erreur lors de la suppression du HUD.";
    }
  },

  // 🔧 Mettre à jour un HUD
  async updateUser(id, updates) {
    try {
      const [updated] = await HUD.update(updates, { where: { id } });
      return updated ? "✅ HUD mis à jour." : "⚠️ Aucun champ mis à jour.";
    } catch {
      return "❌ Erreur lors de la mise à jour du HUD.";
    }
  },

  // 🔄 Mise à jour multiple (pratique pour +hud💠)
  async updateBulk(id, updates) {
    return this.updateUser(id, updates);
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
