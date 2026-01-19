const { DataTypes } = require("sequelize");
const sequelize = require("./sequelize"); // 

// ============================
// MODEL HUD 
// ============================
const HUD = sequelize.define("ElysiumHUD", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false
  },

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
  timestamps: false
});

// ============================
// FUNCTIONS 
// ============================
const HUDFunctions = {

  async addHUD(jid, data = {}) {
    return HUD.create({
      jid,
      ...data
    });
  },

  async getHUD(where) {
    return HUD.findOne({ where });
  },

  async setHUD(colonne, value, jid) {
    return HUD.update(
      { [colonne]: value },
      { where: { jid } }
    );
  },

  async delHUD(where) {
    return HUD.destroy({ where });
  },

  async getAllHUDs() {
    return HUD.findAll();
  }

};

// ============================
// SYNC DB 
// ============================
(async () => {
  await HUD.sync();
})();

module.exports = {
  HUD,
  HUDFunctions
};
