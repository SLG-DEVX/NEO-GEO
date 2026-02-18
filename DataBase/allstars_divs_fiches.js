const { Sequelize, DataTypes, Op } = require('sequelize');
const config = require('../set');

const db = config.DATABASE;

let sequelize;

if (!db) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.db',
    logging: false,
  });
} else {
  sequelize = new Sequelize(db, {
    dialect: 'postgres',
    ssl: true,
    protocol: 'postgres',
    dialectOptions: {
      native: true,
      ssl: { require: true, rejectUnauthorized: false },
    },
    logging: false,
  });
}

// =====================
// MODEL
// =====================

const AllStarsDivsFiche = sequelize.define('AllStarsDivsFiche', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  pseudo: { type: DataTypes.STRING, defaultValue: 'aucun' },
  user: { type: DataTypes.STRING, defaultValue: 'aucun' },
  classement: { type: DataTypes.STRING, defaultValue: 'aucun' },

  exp: { type: DataTypes.INTEGER, defaultValue: 0 },
  niveau: { type: DataTypes.INTEGER, defaultValue: 1 },

  division: { type: DataTypes.STRING, defaultValue: 'aucun' },
  rang: { type: DataTypes.STRING, defaultValue: 'aucun' },
  classe: { type: DataTypes.STRING, defaultValue: 'aucun' },

  saison_pro: { type: DataTypes.INTEGER, defaultValue: 0 },

  golds: { type: DataTypes.INTEGER, defaultValue: 0 },
  fans: { type: DataTypes.INTEGER, defaultValue: 0 },

  archetype: { type: DataTypes.STRING, defaultValue: 'aucun' },

  commentaire: { type: DataTypes.TEXT, defaultValue: '' },
  armes: { type: DataTypes.TEXT, defaultValue: '' },
  surnom: { type: DataTypes.TEXT, defaultValue: '' },

  victoires: { type: DataTypes.INTEGER, defaultValue: 0 },
  defaites: { type: DataTypes.INTEGER, defaultValue: 0 },

  championnants: { type: DataTypes.INTEGER, defaultValue: 0 },
  neo_cup: { type: DataTypes.INTEGER, defaultValue: 0 },
  evo: { type: DataTypes.INTEGER, defaultValue: 0 },
  grandslam: { type: DataTypes.INTEGER, defaultValue: 0 },
  tos: { type: DataTypes.INTEGER, defaultValue: 0 },
  the_best: { type: DataTypes.INTEGER, defaultValue: 0 },
  laureat: { type: DataTypes.INTEGER, defaultValue: 0 },
  sigma: { type: DataTypes.INTEGER, defaultValue: 0 },
  neo_globes: { type: DataTypes.INTEGER, defaultValue: 0 },
  golden_boy: { type: DataTypes.INTEGER, defaultValue: 0 },

  cleans: { type: DataTypes.INTEGER, defaultValue: 0 },
  erreurs: { type: DataTypes.INTEGER, defaultValue: 0 },

  note: { type: DataTypes.INTEGER, defaultValue: 0 },
  talent: { type: DataTypes.INTEGER, defaultValue: 0 },
  intelligence: { type: DataTypes.INTEGER, defaultValue: 0 },
  speed: { type: DataTypes.INTEGER, defaultValue: 0 },
  strikes: { type: DataTypes.INTEGER, defaultValue: 0 },
  attaques: { type: DataTypes.INTEGER, defaultValue: 0 },

  total_cards: { type: DataTypes.INTEGER, defaultValue: 0 },

  // ✅ safe default
  cards: { type: DataTypes.TEXT, defaultValue: '' },

  source: { type: DataTypes.STRING, defaultValue: 'inconnu' },

  jid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  oc_url: {
    type: DataTypes.STRING,
    defaultValue: 'https://files.catbox.moe/4quw3r.jpg'
  },

  code_fiche: { type: DataTypes.STRING, defaultValue: 'aucun' }

}, {
  tableName: 'allstars_divs_fiches',
  timestamps: false,
});

// =====================
// INIT TABLE
// =====================

sequelize.sync();

// =====================
// HELPERS SAFE
// =====================

// ✅ NE CREE PLUS DE FICHE FANTÔME
async function getData(where = {}) {
  if (!where || Object.keys(where).length === 0) return null;
  return await AllStarsDivsFiche.findOne({ where });
}

async function getAllFiches() {
  return await AllStarsDivsFiche.findAll();
}

// ✅ update blindé
async function setfiche(colonne, valeur, jid) {
  if (!jid) throw new Error("jid manquant");

  const [updated] = await AllStarsDivsFiche.update(
    { [colonne]: valeur },
    { where: { jid } }
  );

  if (!updated) {
    throw new Error(`❌ Aucun joueur trouvé pour jid : ${jid}`);
  }

  console.log(`✔ ${colonne} → ${valeur}`);
}

// ✅ create only if not exists
async function add_id(jid, data = {}) {
  if (!jid) throw new Error("JID requis");

  const exists = await AllStarsDivsFiche.findOne({ where: { jid } });
  if (exists) {
    console.log("⚠️ fiche déjà existante:", jid);
    return exists;
  }

  return await AllStarsDivsFiche.create({
    jid,
    ...data
  });
}

// ✅ delete by code_fiche
async function del_fiche(code_fiche) {
  if (!code_fiche) return 0;

  return await AllStarsDivsFiche.destroy({
    where: { code_fiche }
  });
}

// =====================
// EXPORTS
// =====================

module.exports = {
  sequelize,
  AllStarsDivsFiche,
  Op,
  getAllFiches,
  getData,
  setfiche,
  add_id,
  del_fiche
};
