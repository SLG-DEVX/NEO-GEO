const { ovlcmd } = require("../lib/ovlcmd");
const { getData, setfiche, createFiche } = require("../DataBase/allstars_divs_fiches");

//---------------- ARENES ----------------
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

const duelsEnCours = {};
let lastArenaIndex = -1;

//---------------- FONCTIONS UTILES ----------------
function tirerAr() {
    let index;
    do {
        index = Math.floor(Math.random() * arenes.length);
    } while (index === lastArenaIndex);
    lastArenaIndex = index;
    return arenes[index];
}

function limiterStats(stats, stat, valeur) {
    stats[stat] = Math.max(0, Math.min(100, stats[stat] + valeur));
}

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
*⭕ 𝐏𝐨𝐫𝐭𝐞́𝐞*: 10m
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔

*⚠️ Vous avez 🔟 tours max pour finir votre Adversaire !*
*Sinon la victoire sera donnée par décision selon l'offensive !*

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™ `;
}

//---------------- COMMANDE +DUEL ----------------
ovlcmd({
    nom_cmd: "duel",
    classe: "Duel",
    react: "⚔️",
    desc: "Lance un duel entre deux joueurs."
}, async (ms_org, ovl, { arg, repondre, ms }) => {
    if (!arg[0]) return repondre('Format: +duel joueur1 vs joueur2 / stats');

    try {
        const input = arg.join(' ');
        const [joueursInput, statsCustom] = input.split('/').map(p => p.trim());
        const [equipe1Str, equipe2Str] = joueursInput.split('vs').map(p => p.trim());

        if (!equipe1Str || !equipe2Str) return repondre('❌ Erreur de format !');

        const equipe1 = equipe1Str.split(',').map(n => ({ nom: n.trim(), stats: { sta: 100, energie: 100, pv: 100 } }));
        const equipe2 = equipe2Str.split(',').map(n => ({ nom: n.trim(), stats: { sta: 100, energie: 100, pv: 100 } }));
        const areneT = tirerAr();

        const duelKey = `${equipe1Str} vs ${equipe2Str}`;
        duelsEnCours[duelKey] = { equipe1, equipe2, statsCustom: statsCustom || 'Aucune stat personnalisée', arene: areneT };

        const fiche = generateFicheDuel(duelsEnCours[duelKey]);
        await ovl.sendMessage(ms_org, {
            video: { url: 'https://files.catbox.moe/dye6xo.mp4' },
            gifPlayback: true,
            caption: ` 🌀Préparation de match...`
        }, { quoted: ms });
        await ovl.sendMessage(ms_org, { image: { url: areneT.image }, caption: fiche }, { quoted: ms });
    } catch (e) {
        console.error(e);
        repondre('❌ Une erreur est survenue.');
    }
});

//---------------- COMMANDE +DUEL STATS ----------------
ovlcmd({
    nom: "duel stats",
    isfunc: true
}, async (ms_org, ovl, { texte, repondre, ms }) => {
    if(!texte) return;
    const mots = texte.trim().split(/\s+/);
    const statsAutorisees = ["sta", "energie", "pv"];

    if (mots.length !== 4) return;
    let [joueurId, stat, signe, valeurStr] = mots;

    if (!statsAutorisees.includes(stat.toLowerCase())) return;
    if (!["+", "-"].includes(signe)) return;

    const valeur = parseInt(valeurStr);
    if (isNaN(valeur)) return;

    if (joueurId.startsWith("@")) joueurId = joueurId.replace("@", "");

    const duelKey = Object.keys(duelsEnCours).find(k => k.includes(joueurId));
    if (!duelKey) return;

    const duel = duelsEnCours[duelKey];
    const joueur = duel.equipe1.find(j => j.nom === joueurId) || duel.equipe2.find(j => j.nom === joueurId);
    if (!joueur) return;

    limiterStats(joueur.stats, stat.toLowerCase(), (signe === "-" ? -valeur : valeur));

    const fiche = generateFicheDuel(duel);
    await ovl.sendMessage(ms_org, { image: { url: duel.arene.image }, caption: fiche }, { quoted: ms });
});

//---------------- COMMANDE +RESET_STATS ----------------
ovlcmd({
    nom_cmd: "reset_stats",
    classe: "Duel",
    react: "🔄",
    desc: "Réinitialise les stats d’un joueur ou de tous."
}, async (ms_org, ovl, { arg, repondre, ms }) => {
    if (arg.length < 1) return repondre('Format: @NomDuJoueur ou "all"');

    const joueurId = arg[0];
    const duelKey = Object.keys(duelsEnCours).find(k => k.includes(joueurId.replace("@", "")));
    if (!duelKey) return repondre('❌ Joueur non trouvé.');

    const duel = duelsEnCours[duelKey];

    if (joueurId.toLowerCase() === 'all') {
        duel.equipe1.forEach(j => j.stats = { sta: 100, energie: 100, pv: 100 });
        duel.equipe2.forEach(j => j.stats = { sta: 100, energie: 100, pv: 100 });
    } else {
        const joueur = duel.equipe1.find(j => j.nom === joueurId.replace("@", "")) || duel.equipe2.find(j => j.nom === joueurId.replace("@", ""));
        if (!joueur) return repondre('❌ Joueur non trouvé.');
        joueur.stats = { sta: 100, energie: 100, pv: 100 };
    }

    const fiche = generateFicheDuel(duel);
    ovl.sendMessage(ms_org, { image: { url: duel.arene.image }, caption: fiche }, { quoted: ms });
});

//---------------- COMMANDE +RESET_DUEL ----------------
ovlcmd({
    nom_cmd: "reset_duel",
    classe: "Duel",
    react: "🗑️",
    desc: "Supprime un duel en cours."
}, async (ms_org, ovl, { arg, repondre, auteur_Message, ms }) => {
    if (arg.length < 1) return repondre('Format: @NomDuJoueur ou "all"');

    const joueurId = arg[0];
    await ovl.sendMessage(ms_org, { text: '❓ Confirmez la suppression avec "oui" ou "non".' }, { quoted: ms });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const confirmation = rep?.message?.extendedTextMessage?.text || rep?.message?.conversation;

    if (!rep || confirmation.toLowerCase() !== 'oui') return repondre('❌ Suppression annulée.');

    if (joueurId.toLowerCase() === 'all') {
        const n = Object.keys(duelsEnCours).length;
        if (n === 0) return repondre('Aucun duel en cours.');
        Object.keys(duelsEnCours).forEach(k => delete duelsEnCours[k]);
        return repondre(`✅ Tous les duels (${n}) ont été supprimés.`);
    }

    const duelKey = Object.keys(duelsEnCours).find(k => k.includes(joueurId.replace("@", "")));
    if (!duelKey) return repondre('❌ Aucun duel trouvé.');
    delete duelsEnCours[duelKey];
    repondre(`✅ Duel "${duelKey}" supprimé.`);
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
