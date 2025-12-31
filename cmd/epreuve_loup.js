const { ovlcmd } = require('../lib/ovlcmd');
const epreuvesLoup = new Map();

// --- LANCEMENT DE L'ÉPREUVE ---
ovlcmd({
  nom_cmd: 'exercice4',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve du loup"
}, async (ms_org, ovl, { repondre, auteur_Message, getJid }) => {
  try {
    const chatId = ms_org.key?.remoteJid || ms_org;

    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/z64kuq.mp4' },
      gifPlayback: true
    });

    const texteDebut = `🔷 *ÉPREUVE DU LOUP*🐺❌⚽
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░

*⚽RÈGLES:*
Dans cette épreuve l'objectif est de toucher un autre joueur avec le ballon⚽ avant la fin du temps imparti 20 mins❗⌛. Après 20 mins, le joueur qui sera le loup est éliminé❌.
⚠️Le jeu se déroule dans une pièce carrée de 10m. Le modérateur désigne directement le loup en @numéro (valeur entre 1 et 100).

⚽ Voulez-vous lancer l’épreuve ?
✅ \`Oui\` @${auteur_Message.split('@')[0]}  
❌ \`Non\`

*⚽BLUE🔷LOCK*`;

    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/k87s8y.png' },
      caption: texteDebut
    });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = rep?.message?.conversation?.toLowerCase() || rep?.message?.extendedTextMessage?.text?.toLowerCase();
    if (!response) return repondre("⏳ Pas de réponse, épreuve annulée.");
    if (response === "non") return repondre("❌ Lancement annulé.");

    if (response === "oui") {
      epreuvesLoup.set(chatId, {
        loup: null,
        tempsRestant: 20 * 60 * 1000,
        timer: null,
        rappelTimer: null,
        debut: true
      });

      await repondre("✅ Épreuve démarrée ! Le modérateur doit désigner le loup avec `@numéro = loup`.");
    }
  } catch (err) {
    console.error(err);
    await repondre("❌ Une erreur est survenue lors du lancement de l'épreuve.");
  }
});

// --- DÉSIGNATION DU LOUP INITIALE ---
ovlcmd({
  nom_cmd: 'setloup',
  isfunc: true
}, async (ms_org, ovl, { texte, getJid }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return;

  if (!texte?.trim().startsWith("@")) return;

  const cleanTexte = texte.replace(/[\u2066-\u2069]/g, '').trim();
  const match = cleanTexte.match(/^@(\S+)\s*=\s*loup/i);
  if (!match) return;

  const userTag = match[1];
  let loupJid;
  try { loupJid = await getJid(userTag + "@lid", ms_org, ovl); } 
  catch { return; }

  epreuve.loup = loupJid;

  epreuve.timer = setTimeout(async () => {
    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/9xehjs.png' },
      caption: `🏁 *FIN DE L'ÉPREUVE*\n❌ @${loupJid.split('@')[0]} est le dernier loup, il est éliminé !`,
      mentions: [loupJid]
    });
    epreuvesLoup.delete(chatId);
  }, epreuve.tempsRestant);

  await ovl.sendMessage(chatId, {
    text: `🐺 @${userTag} est désigné comme le Loup !`,
    mentions: [loupJid]
  });
});

// --- ANALYSE DES TIRS (pavé obligatoire) ---
ovlcmd({
  nom_cmd: 'epreuve_loup',
  isfunc: true
}, async (ms_org, ovl, { texte, getJid }) => {
  const chatId = ms_org.key?.remoteJid || ms_org;
  if (!texte.includes("🔷⚽ÉPREUVE DU LOUP")) return;

  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || !epreuve.loup) return;

  const cleanTexte = texte.replace(/[\u2066-\u2069]/g, '').trim();
  const lignes = cleanTexte.split("\n").map(l => l.trim());

  let loupTag, cibleTag, valLoup = 0, valCible = 0, distance = 5;

  for (const ligne of lignes) {
    if (ligne.toLowerCase().startsWith("*⚽loup*")) {
      const m = ligne.match(/@(\S+)\s*\(?(\d{1,3})?\)?/);
      if (m) { loupTag = m[1]; valLoup = parseInt(m[2]) || 0; }
    }
    if (ligne.toLowerCase().startsWith("*⚽cible*")) {
      const m = ligne.match(/@(\S+)\s*\(?(\d{1,3})?\)?/);
      if (m) { cibleTag = m[1]; valCible = parseInt(m[2]) || 0; }
    }
    if (ligne.toLowerCase().startsWith("*⚽distance*")) {
      const m = ligne.match(/(\d+)/);
      if (m) distance = parseInt(m[1]);
    }
  }

  if (!loupTag || !cibleTag) return;

  let loupJid, cibleJid;
  try {
    loupJid = await getJid(loupTag + "@lid", ms_org, ovl);
    cibleJid = await getJid(cibleTag + "@lid", ms_org, ovl);
  } catch { return; }

  const ecart = Math.abs(valLoup - valCible);
  let chance = 50;
  if (valLoup < valCible) chance = ecart <= 5 ? 80 : 60;
  else if (valLoup > valCible) chance = ecart <= 5 ? 50 : 30;
  chance += distance <= 5 ? 5 : -5;
  if (chance > 100) chance = 100;
  if (chance < 0) chance = 0;

  const hit = Math.random() * 100 <= chance;

  if (hit) {
    epreuve.loup = cibleJid;
    await ovl.sendMessage(chatId, {
      video: { url: 'https://files.catbox.moe/eckrvo.mp4' },
      gifPlayback: true,
      caption: `✅ **TOUCHÉ !**\n@${cibleJid.split('@')[0]} devient le nouveau Loup 🐺.`,
      mentions: [cibleJid]
    });
  } else {
    const gifsRate = ['https://files.catbox.moe/obqo0d.mp4','https://files.catbox.moe/m00580.mp4'];
    await ovl.sendMessage(chatId, {
      video: { url: gifsRate[Math.floor(Math.random()*gifsRate.length)] },
      gifPlayback: true,
      caption: `❌ **RATÉ !**\nLe tir n'a pas touché sa cible. Le Loup reste @${loupJid.split('@')[0]}.`,
      mentions: [loupJid]
    });
  }
});


// --- ARRÊT MANUEL ---
ovlcmd({
  nom_cmd: 'stoploup',
  desc: "Arrête manuellement l'épreuve du loup",
  react: '🛑'
}, async (ms_org, ovl, { repondre, commande }) => {
  if (commande !== 'stoploup') return; // ✅ filtre de sécurité

  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return; // ✅ ne rien envoyer si aucune épreuve

  clearTimeout(epreuve.timer);
  clearInterval(epreuve.rappelTimer);
  epreuvesLoup.delete(chatId);

  await ovl.sendMessage(chatId, {
    image: { url: 'https://files.catbox.moe/9xehjs.png' },
    caption: `🛑 *ÉPREUVE DU LOUP ARRÊTÉE MANUELLEMENT*\n🐺 Loup actuel : @${epreuve.loup.split('@')[0]}\n\n⚽ Session terminée par le modérateur.`,
    mentions: [epreuve.loup]
  });
});

// --- PAUSE ÉPREUVE ---
ovlcmd({
  nom_cmd: 'pauseloup',
  desc: "Met en pause l'épreuve du loup",
  react: '⏸️'
}, async (ms_org, ovl, { repondre, commande }) => {
  if (commande !== 'pauseloup') return; // ✅ Ignore tout message autre que la commande exacte

  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve) return; // ✅ Ne rien renvoyer si pas d’épreuve

  clearTimeout(epreuve.timer);
  clearInterval(epreuve.rappelTimer);

  await ovl.sendMessage(chatId, {
    text: "⏸️ *ÉPREUVE PAUSÉE*\nLe temps restant sera sauvegardé."
  });
});

// --- REPRISE ÉPREUVE ---
ovlcmd({
  nom_cmd: 'resumeloup',
  desc: "Reprend l'épreuve du loup",
  react: '▶️'
}, async (ms_org, ovl, { repondre, commande }) => {
  if (commande !== 'resumeloup') return; // ✅ même protection

  const chatId = ms_org.key?.remoteJid || ms_org;
  const epreuve = epreuvesLoup.get(chatId);
  if (!epreuve || epreuve.debut === false) return;

  const timerTotal = epreuve.tempsRestant;
  const timer = setTimeout(async () => {
    await ovl.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/9xehjs.png' },
      caption: `🏁 *FIN DE L'ÉPREUVE*\n❌ @${epreuve.loup.split('@')[0]} est le dernier loup, il est éliminé !`,
      mentions: [epreuve.loup]
    });
    epreuvesLoup.delete(chatId);
  }, timerTotal);

  const rappelTimer = setInterval(() => {
    epreuve.tempsRestant -= 5 * 60 * 1000;
    if (epreuve.tempsRestant <= 0) clearInterval(rappelTimer);
  }, 5 * 60 * 1000);

  epreuve.timer = timer;
  epreuve.rappelTimer = rappelTimer;

  await ovl.sendMessage(chatId, {
    text: "▶️ *ÉPREUVE REPRISE*"
  });
}); 

ovlcmd({
  nom_cmd: 'ping',
  desc: "Teste la réactivité du bot",
  react: '🏓'
}, async (ms_org, ovl, { repondre, texte }) => {
  // Texte reçu par l'utilisateur
  if (!texte?.toLowerCase().startsWith('+ping')) return; // 🔹 détecte +ping
  const t1 = Date.now();
  await repondre("🏓 Pong !");
  const t2 = Date.now();
  await repondre(`⏱️ Latence : ${t2 - t1}ms`);
});
