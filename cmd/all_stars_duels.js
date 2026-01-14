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

    
    const input = arg.join(' '); // ne pas remplacer ou nettoyer
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
            image: { url: duel.arene.image },            caption: generateFicheDuel(duel)
        }, { quoted: ms });
    }

    const input = arg.join(' ');
    const [left, rest] = input.split(':').map(v => v.trim());
    if (!left || !rest) return;

    // ===== STATS DUEL (si aucun mention) =====
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
//================ PARSER RAZORX™ LIVE =================
async function parseRazorXLive(text) {
    const result = {
        performances: [], // { pseudo, strikes, attaques }
        winner: null,     // { pseudo, bonus }
        loser: null       // { pseudo }
    };

    // ---------- PERFORMANCES ----------
    const perfBloc = text.match(/📊\s*`PERFORMANCES`([\s\S]+?)(?:🏆`RESULTAT FINAL`|$)/i);
    if (perfBloc) {
        const lines = perfBloc[1].split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const m = line.match(/👤\s*([^:]+):.*?strikes\s*:\s*(\d+).*?attaques\s*:\s*(\d+)/i);
            if (!m) continue;
            result.performances.push({
                pseudo: m[1].trim(),
                strikes: Number(m[2]),
                attaques: Number(m[3])
            });
        }
    }

    // ---------- WINNER ----------
const winMatch = text.match(/Winner:\*?:?\s*(.+)/i);
if (winMatch) {
    const raw = clean(winMatch[1]);
    result.winner = {
        pseudo: raw.replace(/[✅❌]/g, '').trim(), // enlève les emojis
        bonus: raw.includes("✅")
    };
}

// ---------- LOSER ----------
const loseMatch = text.match(/Loser:\*?:?\s*(.+)/i);
if (loseMatch) {
    const raw = clean(loseMatch[1]);
    result.loser = {
        pseudo: raw.replace(/[✅❌]/g, '').trim()
    };
}
return result; 
} 
//================= RAZORX AUTO =================
ovlcmd({
    nom_cmd: "razorx_auto",
    isfunc: true
}, async (ms_org, ovl, { texte, ms }) => {

    if (!texte) return;

    const cleanText = clean(texte);
    if (!cleanText.includes("RAZORX™")) return;

    const parsed = parseRazorXNew(cleanText);

    if (
        !parsed.performances.length &&
        !parsed.winner &&
        !parsed.loser
    ) return;

    let allStarsTouched = false;

    // ---------- PERFORMANCES ----------
    for (const p of parsed.performances) {
        const data = await getData({ pseudo: p.pseudo });
        if (!data) continue;

        await setfiche("strikes", (Number(data.strikes) || 0) + p.strikes, p.pseudo);
        await setfiche("attaques", (Number(data.attaques) || 0) + p.attaques, p.pseudo);

        allStarsTouched = true;
    }

    // ---------- WINNER ----------
    if (parsed.winner) {
        const { pseudo, bonus } = parsed.winner;
        const pseudoClean = pseudo.replace(/^@/, '').replace(/\*/g, '').trim(); // supprime * et @ si présent
        const data = await getData({ pseudo: pseudoClean });

        if (data) {
            await setfiche("victoires", (Number(data.victoires) || 0) + 1, pseudoClean);
            await setfiche("exp", (Number(data.exp) || 0) + (bonus ? 10 : 5), pseudoClean);
            await setfiche("talent", (Number(data.talent) || 0) + (bonus ? 1 : 0), pseudoClean);
            allStarsTouched = true;
        }
    }

    // ---------- LOSER ----------
    if (parsed.loser) {
        const pseudo = parsed.loser.pseudo.replace(/^@/, '').replace(/\*/g, '').trim(); // supprime * et @ si présent
        const data = await getData({ pseudo });

        if (data) {
            await setfiche("defaites", (Number(data.defaites) || 0) + 1, pseudo);
            await setfiche("exp", Math.max(0, (Number(data.exp) || 0) - 5), pseudo);
            allStarsTouched = true;
        }
    }

    // ---------- CONFIRMATION ----------
    if (allStarsTouched) {
        await ovl.sendMessage(ms_org, {
            text: "Performances appliquées pour ce match!✅"
        }, { quoted: ms });
    }
});

//================= +PAVEMODO =================
ovlcmd({
    nom_cmd: "pavemodo",
    classe: "Duel",
    react: "📄",
    desc: "Envoie le pavé modèle RazorX™."
}, async (ms_org, ovl, { repondre }) => {
    const paveStats = `
.                    ⚡RAZORX™ LIVE▶️
▔▔▔▔▔▔▔▔▔▔▔▔▔▔
📊 \`PERFORMANCES\`
👤j1:  → strikes: 0 | attaques: 0
👤j2: → strikes: 0 | attaques: 0

🏆\`RESULTAT FINAL\`:
✅ *Winner:*
❌ *Loser:*
*⏱️Durée:*

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™
`.trim();

    await ovl.sendMessage(ms_org, { text: paveStats });
});

