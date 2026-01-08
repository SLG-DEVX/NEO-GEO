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

const MyNeo = sequelize.define("MyNeo", {
  id: { type: DataTypes.STRING, primaryKey: true },
  users: { type: DataTypes.STRING, defaultValue: "aucun" },
  tel: { type: DataTypes.STRING, defaultValue: "aucun" },
  points_jeu: { type: DataTypes.INTEGER, defaultValue: 0 },
  ns: { type: DataTypes.INTEGER, defaultValue: 0 },
  nc: { type: DataTypes.INTEGER, defaultValue: 0 },
  np: { type: DataTypes.INTEGER, defaultValue: 0 },
  coupons: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastRewardNS: { type: DataTypes.INTEGER, defaultValue: 0 },
  gift_box: { type: DataTypes.INTEGER, defaultValue: 0 },
  all_stars: { type: DataTypes.STRING, defaultValue: "aucun" },
  blue_lock: { type: DataTypes.STRING, defaultValue: "+Team⚽" },
  elysium: { type: DataTypes.STRING, defaultValue: "+ElysiumMe💠" },
});

const BlueLockStats = sequelize.define(
  "BlueLockStats",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    nom: { type: DataTypes.STRING, allowNull: false },

    ...Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [
        `joueur${i + 1}`,
        { type: DataTypes.STRING, defaultValue: "aucun" },
      ])
    ),

    ...Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `stat${i + 1}`,
        { type: DataTypes.INTEGER, defaultValue: 100 },
      ])
    ),
  },
  {
    tableName: "blue_lock_stats",
    timestamps: false,
  }
);

const Team = sequelize.define(
  "Team",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    users: { type: DataTypes.STRING, defaultValue: "aucun" },
    team: { type: DataTypes.STRING, defaultValue: "aucune" },
    niveau: { type: DataTypes.INTEGER, defaultValue: 0 },
    argent: { type: DataTypes.INTEGER, defaultValue: 0 },
    classement: { type: DataTypes.STRING, defaultValue: "aucun" },
    wins: { type: DataTypes.INTEGER, defaultValue: 0 },
    loss: { type: DataTypes.INTEGER, defaultValue: 0 },
    goals: { type: DataTypes.INTEGER, defaultValue: 0 },
    trophies: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "team",
    timestamps: false,
  }
);

(async () => {
  await sequelize.sync();
  console.log("✅ Toutes les tables ont été synchronisées avec succès.");
})();

const MyNeoFunctions = {
  async getUserData(id) {
    try {
      return await MyNeo.findByPk(id);
    } catch {
      return null;
    }
  },

  async saveUser(id, data = {}) {
    try {
      const exists = await MyNeo.findByPk(id);
      if (exists) return "⚠️ Ce joueur est déjà enregistré.";
      await MyNeo.create({ id, ...data });
      return "✅ Joueur enregistré avec succès.";
    } catch {
      return "❌ Erreur lors de l'enregistrement.";
    }
  },

  async deleteUser(id) {
    try {
      const deleted = await MyNeo.destroy({ where: { id } });
      return deleted ? "✅ Joueur supprimé." : "⚠️ Joueur introuvable.";
    } catch {
      return "❌ Erreur lors de la suppression.";
    }
  },

  async updateUser(id, updates) {
    try {
      const [updated] = await MyNeo.update(updates, { where: { id } });
      return updated ? "✅ Données mises à jour." : "⚠️ Aucun champ mis à jour.";
    } catch {
      return "❌ Erreur lors de la mise à jour.";
    }
  },
};

const BlueLockFunctions = {
  async saveUser(jid, data = {}) {
    const exists = await BlueLockStats.findByPk(jid);
    if (exists) return "⚠️ Ce joueur existe déjà.";
    await BlueLockStats.create({ id: jid, ...data });
    return "✅ Joueur enregistré.";
  },

  async deleteUser(jid) {
    const deleted = await BlueLockStats.destroy({ where: { id: jid } });
    return deleted ? "✅ Joueur supprimé." : "⚠️ Joueur introuvable.";
  },

  async getUserData(jid) {
    return await BlueLockStats.findByPk(jid);
  },

  async updatePlayers(jid, updates) {
    const record = await BlueLockStats.findByPk(jid);
    if (!record) return "⚠️ Joueur introuvable.";
    await record.update(updates);
    return `✅ Mises à jour effectuées pour ${record.nom}`;
  },

  async updateStats(jid, statKey, signe, newValue) {
    const record = await BlueLockStats.findByPk(jid);
    if (!record) return "⚠️ Joueur introuvable.";

    const oldVal = record[statKey] || 0;
    const updated = signe === "+" ? oldVal + newValue : oldVal - newValue;

    await record.update({ [statKey]: updated });

    return `✅ Stat mise à jour : ${oldVal} ${signe} ${newValue} = ${updated}`;
  },

  async resetStats(jid) {
    const record = await BlueLockStats.findByPk(jid);
    if (!record) return "⚠️ Joueur introuvable.";

    const reset = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`stat${i + 1}`, 100])
    );

    await record.update(reset);

    return `✅ Stats remises à 100 pour ${record.nom}`;
  },
};

const TeamFunctions = {
  async saveUser(jid, data = {}) {
    const exists = await Team.findByPk(jid);
    if (exists) return "⚠️ Déjà enregistré.";
    await Team.create({ id: jid, ...data });
    return "✅ Joueur enregistré.";
  },

  async getUserData(jid) {
    const data = await Team.findByPk(jid);
    return data ? data.toJSON() : null;
  },

  async deleteUser(jid) {
    const deleted = await Team.destroy({ where: { id: jid } });
    return deleted ? "✅ Supprimé." : "⚠️ Introuvable.";
  },

  async updateUser(jid, updates) {
    try {
      const [updated] = await Team.update(updates, { where: { id: jid } });
      return updated ? "✅ Données mises à jour." : "⚠️ Aucun champ mis à jour.";
    } catch {
      return "❌ Erreur lors de la mise à jour.";
    }
  },
};

module.exports = {
  MyNeoFunctions,
  BlueLockFunctions,
  TeamFunctions,
};
