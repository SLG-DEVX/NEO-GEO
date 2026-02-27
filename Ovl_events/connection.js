const fs = require('fs');
const path = require('path');
const { delay, DisconnectReason } = require("@whiskeysockets/baileys");
let evt = require("../lib/ovlcmd");
const config = require("../set");

async function connection_update(con, ovl, main) {
  const { connection, lastDisconnect } = con;

  switch (connection) {
    case "connecting":
      console.log("🌍 Connexion en cours...");
      break;

    case "open":
      console.log(`
╭─────────────────╮
│                            
│    🎉  NEO BOT ONLINE 🎉   │
│                            
╰─────────────────╯
`);

      const commandes = fs.readdirSync(path.join(__dirname, "../cmd"))
        .filter(f => path.extname(f).toLowerCase() === ".js");

      console.log("📂 Chargement des commandes :");
      for (const fichier of commandes) {
        try {
          require(path.join(__dirname, "../cmd", fichier));
          console.log(`  ✓ ${fichier}`);
        } catch (e) {
          console.log(`  ✗ ${fichier} — erreur : ${e.message}`);
        }
      }

      const start_msg = `╭───〔 🤖 𝙉𝙀𝙊 𝘽𝙊𝙏 〕───⬣
│ ߷ *Etat*       ➜ Connecté ✅
│ ߷ *Préfixe*    ➜ ${config.PREFIXE}
│ ߷ *Mode*       ➜ ${config.MODE}
│ ߷ *Commandes*  ➜ ${evt.cmd.length}
│ ߷ *Développeur*➜ Ainz
╰──────────────⬣`;

      console.log(start_msg + "\n");
      await delay(5000);
        await ovl.sendMessage(ovl.user.id, { text: start_msg });
      break;

    case "close":
  const code = lastDisconnect?.error?.output?.statusCode;

  if (code === DisconnectReason.loggedOut) {
    console.log("⛔ Déconnecté : Session terminée.");
  } else {
    console.log("⚠️ Connexion perdue. Redémarrage du service...");
    await delay(3000);
    process.exit(1); // ✅ Render redémarre proprement
  }
  break;

    default:
  }
}

module.exports = connection_update;
