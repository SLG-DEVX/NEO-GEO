const { ovlcmd } = require("../lib/ovlcmd");
const { getData, setfiche } = require("../DataBase/allstars_divs_fiches");

//================= ARENES =================
const arenes = [
    { nom: 'Desert Montagneux⛰️', image: 'https://files.catbox.moe/aoximf.jpg' },
    { nom: 'Ville en Ruines🏚️', image: 'https://files.catbox.moe/2qmvpa.jpg' },
    { nom: 'Centre-ville🏙️', image: 'https://files.catbox.moe/pzlkf9.jpg' },
    { nom: 'Arise🌇', image: 'https://files.catbox.moe/3vlsmw.jpg' },
    { nom: 'Salle du temps ⌛', image: 'https://files.catbox.moe/j4e1pp.jpg' },
    { nom: 'Valley de la fin🗿', image: 'https://files.catbox.moe/m0k1jp.jpg' },
    { nom: 'École d\'exorcisme de Tokyo📿', image: 'https://files.catbox.moe/rgznzb.jpg' },
    { nom: 'Marinford🏰', image: 'https://files.catbox.moe/4bygut.jpg' },
    { nom: 'Cathédrale⛩️', image: 'https://files.catbox.moe/ie6jvx.jpg' }
];

//================= DUELS PAR GROUPE =================
const duelsEnCours = {};
let lastArenaIndex = -1;

//================= UTILS =================
function tirerAr() {
    let i;
    do { i = Math.floor(Math.random() * arenes.length); }
    while (i === lastArenaIndex);
    lastArenaIndex = i;
    return arenes[i];
}

function limiterStats(stats, stat, val) {
    stats[stat] = Math.max(0, Math.min(100, stats[stat] + val));
}

function clean(txt) {
    return txt.replace(/[\u2066-\u2069\u200e\u200f\u202a-\u202e]/g, '').trim();
}

//================= FICHE DUEL =================
function generateFicheDuel(duel) {
    return `*🆚VERSUS ARENA BATTLE🏆🎮*
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒░░▒░
🔅 *${duel.equipe1[0].nom}*: 🫀:${duel.equipe1[0].stats.sta}% 🌀:${duel.equipe1[0].stats.energie}% ❤️:${duel.equipe1[0].stats.pv}%
                                   ~  *🆚*  ~
🔅 *${duel.equipe2[0].nom}*: 🫀:${duel.equipe2[0].stats.sta}% 🌀:${duel.equipe2[0].stats.energie}% ❤️:${duel.equipe2[0].stats.pv}%
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
*🌍 𝐀𝐫𝐞̀𝐧𝐞*: ${duel.arene.nom}
*🚫 𝐇𝐚𝐧𝐝𝐢𝐜𝐚𝐩𝐞*: Boost 1 fois chaque 2 tours!
*⚖️ 𝐒𝐭𝐚𝐭𝐬*: ${duel.statsCustom || "Aucune"}
*🏞️ 𝐀𝐢𝐫 𝐝𝐞 𝐜𝐨𝐦𝐛𝐚𝐭*: illimitée
*🦶🏼 𝐃𝐢𝐬𝐭𝐚𝐧𝐜𝐞 𝐢𝐧𝐢𝐭𝐢𝐚𝐥𝐞 📌*: 5m
*⌚ 𝐋𝐚𝐭𝐞𝐧𝐜𝐞*: 6mins ⚠️
*⭕ 𝐏𝐨𝐫𝐭𝐞́*: 10m
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔

*⚠️ Vous avez 🔟 tours max pour finir votre Adversaire !*
*Sinon la victoire sera donnée par décision selon l'offensive !*

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™ `;
}

//================= +DUEL =================
ovlcmd({
    nom_cmd: "duel",
    classe: "Duel",
    react: "⚔️"
}, async (ms_org, ovl, { arg, ms }) => {
    if (!arg.length) return;

    const input = arg.join(' ');
    const [players, statsCustom] = input.split('/').map(v => v.trim());
    const [p1, p2] = players.split('vs').map(v => v.trim());
    if (!p1 || !p2) return;

    const equipe1 = [{ nom: p1, stats: { sta: 100, energie: 100, pv: 100 } }];
    const equipe2 = [{ nom: p2, stats: { sta: 100, energie: 100, pv: 100 } }];

    const arene = tirerAr();

    duelsEnCours[ms_org] = {
        equipe1,
        equipe2,
        arene,
        statsCustom: statsCustom || null
    };

    await ovl.sendMessage(ms_org, {
        video: { url: 'https://files.catbox.moe/yyxzt2.mp4' },
        gifPlayback: true,
        caption: `🌀Préparation de match...`
    }, { quoted: ms });

    await ovl.sendMessage(ms_org, {
        image: { url: arene.image },
        caption: generateFicheDuel(duelsEnCours[ms_org])
    }, { quoted: ms });
});

//================= +STATS =================
ovlcmd({
    nom_cmd: "stats",
    classe: "Duel",
    react: "📉"
}, async (ms_org, ovl, { arg, ms }) => {

    const duel = duelsEnCours[ms_org];

    if (!arg.length) {
        if (!duel) return;
        return ovl.sendMessage(ms_org, {
            image: { url: duel.arene.image },
            caption: generateFicheDuel(duel)
        }, { quoted: ms });
    }

    const input = arg.join(' ');
    const [left, rest] = input.split('=').map(v => v.trim());
    if (!left || !rest) return;

    // ===== FIX STATS ALL STARS =====
    const context =
        ms.message?.extendedTextMessage?.contextInfo ||
        ms.message?.imageMessage?.contextInfo ||
        ms.message?.videoMessage?.contextInfo;

    const mentions = context?.mentionedJid || [];

    if (left.startsWith('@') && mentions.length > 0) {
        const jid = mentions[0];
        const data = await getData({ jid });
        if (!data) return;

        let confirm = [];

        for (const p of rest.split(',')) {
            const m = p.match(/(attaques|strikes)\s*\+\s*(\d+)/i);
            if (!m) continue;

            const field = m[1].toLowerCase();
            const value = Number(m[2]);

            await setfiche(field, (Number(data[field]) || 0) + value, jid);
            confirm.push(`➕ ${field.charAt(0).toUpperCase() + field.slice(1)}: +${value}`);
        }

        if (confirm.length) {
            return ovl.sendMessage(ms_org, {
                text: `✅ Stats mises à jour pour ${left}\n${confirm.join('\n')}`
            }, { quoted: ms });
        }
        return;
    }

    // ===== STATS DUEL =====
    if (!duel) return;

    const joueur =
        duel.equipe1.find(j => j.nom.toLowerCase() === left.toLowerCase()) ||
        duel.equipe2.find(j => j.nom.toLowerCase() === left.toLowerCase());

    if (!joueur) return;

    for (const p of rest.split(',')) {
        const m = p.match(/(sta|energie|pv)\s*([+-])\s*(\d+)/i);
        if (!m) continue;
        limiterStats(joueur.stats, m[1], m[2] === '-' ? -Number(m[3]) : Number(m[3]));
    }
});

//================= +ENDMATCH =================
ovlcmd({
    nom_cmd: "endmatch",
    classe: "Duel",
    react: "🏁"
}, async (ms_org, ovl, { ms }) => {
    if (!duelsEnCours[ms_org]) return;

    delete duelsEnCours[ms_org];

    await ovl.sendMessage(ms_org, {
        text: "🏁 *Le duel est terminé. L’arène est désormais libre.*"
    }, { quoted: ms });
});

//================= +PAVEMODO =================
ovlcmd({
    nom_cmd: "pavemodo",
    classe: "Duel",
    react: "📄"
}, async (ms_org, ovl) => {
    await ovl.sendMessage(ms_org, {
        text: `.                    ⚡RAZORX™ LIVE▶️
▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🏆\`RESULTAT\`: 
Win = @tag
Lose = @tag
⏱️Durée: 

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™`
    });
});

//================= RAZORX AUTO =================
ovlcmd({
    nom: "razorx_auto",
    isfunc: true
}, async (ms_org, ovl, { ms }) => {

    const texte =
        ms.message?.conversation ||
        ms.message?.extendedTextMessage?.text ||
        ms.message?.imageMessage?.caption;

    if (!texte || !texte.includes("⚡RAZORX™")) return;

    const context =
        ms.message?.extendedTextMessage?.contextInfo ||
        ms.message?.imageMessage?.contextInfo ||
        ms.message?.videoMessage?.contextInfo;

    const mentions = context?.mentionedJid || [];

    if (texte.includes("🏆`RESULTAT`")) {

        let duree = null;
        const dureeMatch = texte.match(/Durée:\s*(\d+)/i);
        if (dureeMatch) duree = Number(dureeMatch[1]);

        let loserJid = null;
        let indexMention = 0;

        const lines = texte.split('\n');

for (const line of lines) {
    const m = line.match(/(Win|Lose)\s*=\s*@/i);
    if (!m) continue;

    const type = m[1].toLowerCase();

    const mentionIndex = lines
        .slice(0, lines.indexOf(line) + 1)
        .join('\n')
        .match(/@/g)?.length - 1;

    const jid = mentions?.[mentionIndex];
    if (!jid) continue;

    const data = await getData({ jid });
    if (!data) continue;

    let {
        exp = 0,
        talent = 0,
        victoires = 0,
        defaites = 0
    } = data;

    if (type === "win") {
        victoires++;
        exp += 10;
        talent += 10;
    }

    if (type === "lose") {
        defaites++;
        exp = Math.max(0, exp - 5);
        talent = Math.max(0, talent - 5);
    }

    await setfiche("exp", exp, jid);
    await setfiche("talent", talent, jid);
    await setfiche("victoires", victoires, jid);
    await setfiche("defaites", defaites, jid);
}        
        if (duree !== null && duree < 3 && loserJid) {
            const data = await getData({ jid: loserJid });
            if (data) {
                await setfiche("talent", Math.max(0, (Number(data.talent) || 0) - 5), loserJid);
            }
        }

        await ovl.sendMessage(ms_org, {
            text: "✅ Résultats mise à jour pour le match !"
        }, { quoted: ms });
    }
});
