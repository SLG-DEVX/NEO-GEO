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
  // Base locale SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.db',
    logging: false,
  });
} else {
  // Base Supabase/Postgres
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
// MODELE ELYSIUM
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
// SYNC AUTO
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
// FONCTIONS DB (MODE ALL STARS)
// ============================

// 🔒 Récupère ou crée automatiquement une fiche
async function getPlayer(where = {}) {
  const [player] = await ElysiumFiche.findOrCreate({
    where,
    defaults: {
      code_fiche: 'aucun',
      pseudo: 'Nouveau Joueur',
      user: where.jid || 'inconnu',
      exp: 0,
      niveau: 1,
      rang: 'Novice🥉',
      ecash: 50000,
      lifestyle: 0,
      charisme: 0,
      reputation: 0,
      cyberwares: '',
      missions: 0,
      gameover: 0,
      pvp: 0,
      points_combat: 0,
      points_chasse: 0,
      points_recoltes: 0,
      points_hacking: 0,
      points_conduite: 0,
      points_exploration: 0,
      trophies: 0
    }
  });
  return player;
}

// 🔧 Met à jour une colonne spécifique
async function setPlayer(colonne, valeur, jid) {
  const updateData = {};
  updateData[colonne] = valeur;

  const [updated] = await ElysiumFiche.update(updateData, { where: { jid } });
  if (!updated) throw new Error(`❌ Aucun joueur trouvé pour jid : ${jid}`);
  console.log(`✔ [ELY] ${colonne} mis à jour → ${valeur}`);
}

// ➕ Ajoute un joueur explicitement (si pas déjà présent)
async function addPlayer(jid, data = {}) {
  if (!jid) throw new Error("JID requis");

  const exists = await ElysiumFiche.findOne({ where: { jid } });
  if (exists) return null;

  const created = await ElysiumFiche.create({ jid, ...data });
  console.log("✔ [ELY CREATE]", created.toJSON());
  return created;
}

// ❌ Supprime un joueur par JID
async function deletePlayer(jid) {
  return await ElysiumFiche.destroy({ where: { jid } });
}

// 📜 Récupère toutes les fiches
async function getAllPlayers() {
  return await ElysiumFiche.findAll();
}

// ============================
// EXPORT
// ============================
module.exports = {
  getPlayer,
  setPlayer,
  addPlayer,
  deletePlayer,
  getAllPlayers
};
