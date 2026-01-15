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

/* ================= UTILS ================= */

function normalizeTag(tag) {
    return tag
        .replace(/@/g, '')
        .replace(/[\u2066-\u2069\u200e\u200f\u202a-\u202e]/g, '')
        .trim()
        .toLowerCase();
}

/* ================= PARSER GLOBAL RAZORX ================= */

function parseRazorX(text) {
    const result = { actions: [], results: [] };

    // ---------- MATCH LIVE ----------
    const liveBloc = text.match(/▶️`Match Live`:\s*([\s\S]+?)(?:▔|🏆`RESULTAT`)/i);
    if (liveBloc) {
        const lignes = liveBloc[1].split('\n').map(l => l.trim()).filter(Boolean);

        for (const ligne of lignes) {
            const clean = ligne.replace(/[\u2066-\u2069\u200e\u200f\u202a-\u202e]/g, '');
            const [p, s] = clean.split(':').map(v => v.trim());
            if (!p || !s) continue;

            const tag = normalizeTag(p);
            const stats = s.split('|').map(v => v.trim());

            for (const st of stats) {
                const m = st.match(/(talent|strikes|attaques|pv|sta|energie)\s*:?\s*(\d+)/i);
                if (!m) continue;

                result.actions.push({
                    tag,
                    stat: m[1].toLowerCase(),
                    valeur: Number(m[2]),
                    mode: "set"
                });
            }
        }
    }

    // ---------- RESULTAT ----------
    const resBloc = text.match(/🏆`RESULTAT`:\s*([\s\S]+)/i);
    if (resBloc) {
        const lignes = resBloc[1].split('\n').map(l => l.trim()).filter(Boolean);

        for (const ligne of lignes) {
            const m = ligne.match(/(victoire|defaite|défaite)\s*:?\s*@?(.+?)(?:\s*(✅|❌))?$/i);
            if (!m) continue;

            result.results.push({
                type: m[1].toLowerCase() === "défaite" ? "defaite" : m[1].toLowerCase(),
                tag: normalizeTag(m[2]),
                symbol: m[3] || null
            });
        }
    }

    return result;
}

/* ================= RAZORX AUTO ================= */

ovlcmd({
    nom: "razorx_auto",
    isfunc: true
}, async (ms_org, ovl, { texte, ms, getJid }) => {
    if (!texte?.includes("⚡RAZORX™")) return;

    const { actions, results } = parseRazorX(texte);

    let allStarsTouched = false;

    // ---------- MATCH LIVE (SET DIRECT) ----------
    for (const act of actions) {
        if (!['talent', 'strikes', 'attaques', 'pv', 'sta', 'energie'].includes(act.stat)) continue;

        let jid;
        try {
            jid = await getJid(act.tag + "@lid", ms_org, ovl);
        } catch {
            continue;
        }

        const data = await getData({ jid });
        if (!data) continue;

        await setfiche(act.stat, act.valeur, jid);
        allStarsTouched = true;
    }

    // ---------- RESULTAT ----------
    for (const r of results) {
        let jid;
        try {
            jid = await getJid(r.tag + "@lid", ms_org, ovl);
        } catch {
            continue;
        }

        const data = await getData({ jid });
        if (!data) continue;

        let exp = Number(data.exp) || 0;
        let fans = Number(data.fans) || 0;
        let talent = Number(data.talent) || 0;
        let victoires = Number(data.victoires) || 0;
        let defaites = Number(data.defaites) || 0;

        // ----- VICTOIRE -----
        if (r.type === "victoire") {
            if (r.symbol === "✅") {
                victoires += 1;
                talent += 10;
                exp += 10;
                fans += 100;
            } else if (!r.symbol) {
                victoires += 1;
            }
            // victoire ❌ => rien
        }

        // ----- DEFAITE -----
        else {
            if (r.symbol === "❌") {
                exp = Math.max(0, exp - 5);
            } else {
                defaites += 1;
            }
        }

        await setfiche("exp", exp, jid);
        await setfiche("fans", fans, jid);
        await setfiche("talent", talent, jid);
        await setfiche("victoires", victoires, jid);
        await setfiche("defaites", defaites, jid);

        allStarsTouched = true;
    }

    // ---------- CONFIRMATION UNIQUEMENT SI JOUEURS VALIDES ----------
    if (allStarsTouched) {
        await ovl.sendMessage(ms_org, {
            text: "✅ Fiches All Stars mises à jour."
        }, { quoted: ms });
    }
});

/* ================= +PAVEMODO (PAVÉ VIDE ATTENDU) ================= */

ovlcmd({
    nom_cmd: "pavemodo",
    classe: "Duel",
    react: "📄",
    desc: "Envoie le pavé RazorX™ vide."
}, async (ms_org, ovl) => {

    const pave = `
. .                    ⚡RAZORX™
▔▔▔▔▔▔▔▔▔░▒░▔▔▔
                             
▶️`Match Live`:
@j1 : Strikes 0 | attaques: 0
@j2 : Strikes 0 | attaques: 0

▔▔▔▔▔▔▔▔▔▔▔▔░▔▔▔▔▔▔▔▔▔▔▔▔
🏆`RESULTAT`: 
victoire :  
défaite :   
⏱️Durée: 

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™ `;

    await ovl.sendMessage(ms_org, { text: pave });
});
