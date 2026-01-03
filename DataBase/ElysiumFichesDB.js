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

const Player = sequelize.define(
  "Player",
  {
    id: { type: DataTypes.STRING, primaryKey: true },

    pseudo: { type: DataTypes.STRING, defaultValue: "Anonymous" },
    user: { type: DataTypes.STRING, defaultValue: "aucun" },

    // 🎥 Image / GIF OC
    oc_url: { type: DataTypes.STRING, defaultValue: "" },

    // 🔋 VITALS (HUD)
    besoins: { type: DataTypes.INTEGER, defaultValue: 100 },
    pv: { type: DataTypes.INTEGER, defaultValue: 100 },
    energie: { type: DataTypes.INTEGER, defaultValue: 100 },
    forme: { type: DataTypes.INTEGER, defaultValue: 100 },
    stamina: { type: DataTypes.INTEGER, defaultValue: 100 },
    plaisir: { type: DataTypes.INTEGER, defaultValue: 100 },

    // 🧠 STATS PRINCIPALES
    intelligence: { type: DataTypes.INTEGER, defaultValue: 1 },
    force: { type: DataTypes.INTEGER, defaultValue: 1 },
    vitesse: { type: DataTypes.INTEGER, defaultValue: 1 },
    reflexes: { type: DataTypes.INTEGER, defaultValue: 1 },
    resistance: { type: DataTypes.INTEGER, defaultValue: 1 },

    // 🛠️ STATS MÉTIERS (INDÉPENDANTES)
    gathering: { type: DataTypes.INTEGER, defaultValue: 0 },
    driving: { type: DataTypes.INTEGER, defaultValue: 0 },
    hacking: { type: DataTypes.INTEGER, defaultValue: 0 },

    // 📈 PROGRESSION
    exp: { type: DataTypes.INTEGER, defaultValue: 0 },
    niveau: { type: DataTypes.INTEGER, defaultValue: 1 },
    rang: { type: DataTypes.STRING, defaultValue: "Novice🥉" },

    // 💰 SOCIAL
    ecash: { type: DataTypes.INTEGER, defaultValue: 50000 },
    lifestyle: { type: DataTypes.INTEGER, defaultValue: 0 },
    charisme: { type: DataTypes.INTEGER, defaultValue: 0 },
    reputation: { type: DataTypes.INTEGER, defaultValue: 0 },

    // 🦾 CYBERWARES
    cyberwares: { type: DataTypes.TEXT, defaultValue: "" },

    // 🎮 STATS DE JEU
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

// 🔄 Sync DB
(async () => {
  await sequelize.sync({ alter: true });
  console.log("✅ Table Player synchronisée (HUD & Fiche OK)");
})();

const PlayerFunctions = {
  async getPlayer(id) {
    return await Player.findByPk(id);
  },

  async getAllPlayers() {
    return await Player.findAll();
  },

  async savePlayer(id, data = {}) {
    const exists = await Player.findByPk(id);
    if (exists) return "⚠️ Ce joueur existe déjà.";
    await Player.create({ id, ...data });
    return "✅ Joueur enregistré.";
  },

  async updatePlayer(id, updates) {
    const record = await Player.findByPk(id);
    if (!record) return "⚠️ Joueur introuvable.";
    await record.update(updates);
    return `✅ Mises à jour effectuées pour ${record.pseudo}`;
  },

  async deletePlayer(id) {
    const deleted = await Player.destroy({ where: { id } });
    return deleted ? "✅ Joueur supprimé." : "⚠️ Joueur introuvable.";
  },
};

module.exports = { PlayerFunctions };
