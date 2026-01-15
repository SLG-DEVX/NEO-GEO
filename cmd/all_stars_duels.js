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
//---------------- PARSER STATS RAZORX ----------------
function parseStatsRazorX(text) {
    const bloc = text.match(/▶️`Match Live`:\s*([\s\S]+)/i);
    if (!bloc) return [];

    const lignes = bloc[1].split('\n').map(l => l.trim()).filter(Boolean);
    const actions = [];

    for (const ligne of lignes) {
        const clean = ligne.replace(/[\u2066-\u2069\u200e\u200f\u202a-\u202e]/g, '');
        const [p, s] = clean.split(':').map(v => v.trim());
        if (!p || !s) continue;

        const tag = p.startsWith("@") ? p.slice(1) : p;
        if (!tag) continue;

        const stats = s.split(',').map(v => v.trim());
        for (const st of stats) {
            const m = st.match(/(talent|strikes|attaques|pv|sta|energie)\s*([+-])\s*(\d+)/i);
            if (!m) continue;

            actions.push({
                tag,
                isMention: p.startsWith("@"),
                stat: m[1].toLowerCase(),
                valeur: parseInt(m[3]) * (m[2] === "-" ? -1 : 1)
            });
        }
    }
    return actions;
}

//---------------- RAZORX AUTO ----------------
ovlcmd({
    nom: "razorx_auto",
    isfunc: true
}, async (ms_org, ovl, { texte, ms, getJid }) => {
    if (!texte?.includes("⚡RAZORX™")) return;

    //---------------- STATS ----------------
    if (texte.includes("▶️`Match Live`")) {
        const actions = parseStatsRazorX(texte);
        if (!actions.length) return;

        const duelKey = Object.keys(duelsEnCours).find(k =>
            actions.some(a => k.toLowerCase().includes(a.tag.toLowerCase()))
        );
        const duel = duelKey ? duelsEnCours[duelKey] : null;

        let duelTouched = false;
        let allStarsTouched = false;

        for (const act of actions) {
            if (['pv', 'sta', 'energie'].includes(act.stat) && duel) {
                const joueur =
                    duel.equipe1.find(j => j.nom.toLowerCase() === act.tag.toLowerCase()) ||
                    duel.equipe2.find(j => j.nom.toLowerCase() === act.tag.toLowerCase());
                if (!joueur) continue;

                limiterStats(joueur.stats, act.stat, act.valeur);
                duelTouched = true;
            }

            if (act.isMention && ['talent', 'strikes', 'attaques'].includes(act.stat) && act.tag) {
                let jid;
                try { jid = await getJid(act.tag + "@lid", ms_org, ovl); } catch { continue; }

                const data = await getData({ jid });
                if (!data) continue;

                const oldVal = Number(data[act.stat]) || 0;
                await setfiche(act.stat, oldVal + act.valeur, jid);
                allStarsTouched = true;
            }
        }

        if (duelTouched && duel) {
            const fiche = generateFicheDuel(duel);
            await ovl.sendMessage(ms_org, {
                image: { url: duel.arene.image },
                caption: fiche
            }, { quoted: ms });
        }

        if (allStarsTouched) {
            await ovl.sendMessage(ms_org, { text: "✅ Stats All Stars mises à jour." });
        }
    }

    //---------------- RESULTAT ----------------
    if (texte.includes("🏆`RESULTAT`")) {
        const bloc = texte.match(/🏆`RESULTAT`:\s*([\s\S]+)/i);
        if (!bloc) return;

        const lignes = bloc[1].split('\n').map(l => l.trim()).filter(Boolean);

        for (const ligne of lignes) {
            const m = ligne.match(/@?([^\s:]+)\s*:\s*(victoire|defaite|défaite)(?:\s*\+\s*([✅❌]))?/i);
            if (!m) continue;

            const tag = m[1];
            let type = m[2].toLowerCase();
            const symbol = m[3] || null;
            if (type === "défaite") type = "defaite";

            let jid;
            try { jid = await getJid(tag + "@lid", ms_org, ovl); } catch { continue; }

            const data = await getData({ jid });
            if (!data) continue;

            let exp = Number(data.exp) || 0;
            let fans = Number(data.fans) || 0;
            let talent = Number(data.talent) || 0;
            let victoires = Number(data.victoires) || 0;
            let defaites = Number(data.defaites) || 0;

            if (type === "victoire") {
                victoires += 1;
                if (symbol === "✅") {
                    exp += 10;
                    fans += 1000;
                    talent += 1;
                } else {
                    exp += 5;
                    fans += 500;
                }
            } else {
                defaites += 1;
                if (symbol === "❌") {
                    exp -= 5;
                    fans -= 500;
                    exp = Math.max(0, exp);
                    fans = Math.max(0, fans);
                } else {
                    exp += 2;
                }
            }

            await setfiche("exp", exp, jid);
            await setfiche("fans", fans, jid);
            await setfiche("talent", talent, jid);
            await setfiche("victoires", victoires, jid);
            await setfiche("defaites", defaites, jid);
        }

        await ovl.sendMessage(ms_org, {
            text: "✅ Résultat appliqué et fiches All Stars mises à jour."
        });
    }
});

//---------------- COMMANDE +PAVEMODO ----------------
ovlcmd({
    nom_cmd: "pavemodo",
    classe: "Duel",
    react: "📄",
    desc: "Envoie le pavé modèle RazorX™."
}, async (ms_org, ovl, { repondre }) => {
    const paveStats = `
.                    ⚡RAZORX™
▔▔▔▔▔▔▔▔▔░▒░▔▔▔
                             
▶️\`Match Live\`:
-

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™
`;
    await ovl.sendMessage(ms_org, { text: paveStats });
});

ovlcmd({
    nom_cmd: "endmatch",
    classe: "Duel",
    react: "📄",
    desc: "Envoie le pavé résultats RazorX™."
}, async (ms_org, ovl, { repondre }) => {
    const paveResult = `
.                    ⚡RAZORX™ LIVE▶️
▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🏆\`RESULTAT\`: 
@tag :    
@tag :  
⏱️Durée: 

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™
`;
    await ovl.sendMessage(ms_org, { text: paveResult });
});
