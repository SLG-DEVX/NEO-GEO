const config = require('../set');

const ms_badge = {
  key: {
    fromMe: false,
    participant: '0@s.whatsapp.net',
    remoteJid: '0@s.whatsapp.net',
  },
  message: {
    extendedTextMessage: {
      text: 'ɴᴇᴏ-ʙᴏᴛ-ᴍᴅ ʙʏ ᴀɪɴᴢ',
      contextInfo: {
        mentionedJid: [],
      },
    },
  },
};

async function group_participants_update(data, ovl) {
  try {
    for (const participant of data.participants) {
      if (
        data.action === 'add' &&
        data.id === '120363031940789145@g.us' &&
        config.WELCOME === 'oui'
      ) {
        const message = `*🎮WELCOME🔷NEOVERSE*
𝖡𝗂𝖾𝗇𝗏𝖾𝗇𝗎𝖾 𝗃𝗈𝗎𝗋 @${participant.split("@")[0]} 𝖽𝖺𝗇𝗌 𝗅𝖾 𝗇𝗈𝗎v𝖾𝖺𝗎 𝗆𝗈𝗇𝖽𝖾 𝖽𝗎 𝗋𝗈𝗅𝖾𝗉𝗅𝖺𝗒, 𝖭𝖾𝗈𝗏𝖾𝗋𝗌𝖾, 𝖯𝖫𝖠𝖸🎮 𝖺 𝗍𝖾𝗌 𝗃𝖾𝗎𝗑 𝖺𝗎 𝗆𝖾̂𝗆𝖾 𝖾𝗇𝖽𝗋𝗈𝗂𝗍. 𝖵𝖾𝗎𝗂𝗅𝗅𝖾𝗓 𝗋𝖾𝗆𝗉𝗅𝗂𝗋 𝗅𝖾𝗌 𝖼𝗈𝗇𝖽𝗂𝗍𝗂𝗈𝗇𝗌 𝗉𝗈𝗎𝗋 𝗋𝖾𝗃𝗈𝗂𝗇𝖽𝗋𝖾 𝗅'𝖺𝗏𝖾𝗇𝗍𝗎𝗋𝖾 😃`;

        await ovl.sendMessage(data.id, {
          image: { url: "https://files.catbox.moe/o2acuc.jpg" },
          caption: message,
          mentions: [participant]
        }, { quoted: ms_badge });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = group_participants_update;
