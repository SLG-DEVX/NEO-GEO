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

//---------------- PARSER PERFORMANCES ----------------
function parsePerformances(text, mentionedJids = []) {
    const lignes = text.split('\n').map(l => l.trim()).filter(Boolean);
    const actions = [];

    for (const ligne of lignes) {
        if (!ligne.includes('→')) continue;

        const m = ligne.match(
            /@([^\s]+)\s*→.*?strikes\s*:\s*(\d+).*?attaques\s*:\s*(\d+)/i
        );
        if (!m) continue;

        const tag = m[1];
        const strikes = parseInt(m[2]);
        const attaques = parseInt(m[3]);

        const jid = mentionedJids.find(j =>
            j.toLowerCase().includes(tag.toLowerCase())
        );
        if (!jid) continue;

        actions.push({ jid, strikes, attaques });
    }
    return actions;
}

//---------------- PARSER RESULTAT ----------------
function parseResultats(text, mentionedJids = []) {
    const bloc = text.match(/🏆`RESULTAT`:\s*([\s\S]+)/i);
    if (!bloc) return [];

    const lignes = bloc[1].split('\n').map(l => l.trim()).filter(Boolean);
    const actions = [];

    for (const ligne of lignes) {
        const m = ligne.match(/@([^\s:]+)\s*:\s*(victoire|defaite|défaite)(?:\s*\+\s*([✅❌]))?/i);
        if (!m) continue;

        const tag = m[1];
        let type = m[2].toLowerCase();
        if (type === "défaite") type = "defaite";

        const jid = mentionedJids.find(j =>
            j.toLowerCase().includes(tag.toLowerCase())
        );
        if (!jid) continue;

        actions.push({
            jid,
            type,
            symbol: m[3] || null
        });
    }
    return actions;
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

//---------------- RAZORX AUTO ----------------
ovlcmd({
    nom: "razorx_auto",
    isfunc: true
}, async (ms_org, ovl, { texte, ms }) => {
    if (!texte?.includes("⚡RAZORX™")) return;

    const mentionedJids =
        ms.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    //---------------- PERFORMANCES ----------------
    if (texte.includes("📊PERFORMANCES")) {
        const actions = parsePerformances(texte, mentionedJids);
        if (!actions.length) return;

        let updated = false;

        for (const act of actions) {
            const duelKey = Object.keys(duelsEnCours).find(k =>
                k.toLowerCase().includes(act.jid.split("@")[0].toLowerCase())
            );
            if (!duelKey) continue;

            const duel = duelsEnCours[duelKey];
            const joueurExiste = duel.equipe1.some(j => j.nom.toLowerCase() === act.jid.split("@")[0].toLowerCase())
                || duel.equipe2.some(j => j.nom.toLowerCase() === act.jid.split("@")[0].toLowerCase());
            if (!joueurExiste) continue;

            const data = await getData({ jid: act.jid });
            if (!data) continue;

            await setfiche("strikes", (Number(data.strikes) || 0) + act.strikes, act.jid);
            await setfiche("attaques", (Number(data.attaques) || 0) + act.attaques, act.jid);
            updated = true;
        }

        if (updated) {
            await ovl.sendMessage(ms_org, {
                text: "✅ Performances mises à jour sur les fiches joueurs."
            }, { quoted: ms });
        }
    }

    //---------------- RESULTAT ----------------
    if (texte.includes("🏆`RESULTAT`")) {
        const actions = parseResultats(texte, mentionedJids);
        if (!actions.length) return;

        let updated = false;

        for (const act of actions) {
            const duelKey = Object.keys(duelsEnCours).find(k =>
                k.toLowerCase().includes(act.jid.split("@")[0].toLowerCase())
            );
            if (!duelKey) continue;

            const duel = duelsEnCours[duelKey];
            const joueurExiste = duel.equipe1.some(j => j.nom.toLowerCase() === act.jid.split("@")[0].toLowerCase())
                || duel.equipe2.some(j => j.nom.toLowerCase() === act.jid.split("@")[0].toLowerCase());
            if (!joueurExiste) continue;

            const data = await getData({ jid: act.jid });
            if (!data) continue;

            let { exp = 0, fans = 0, talent = 0, victoires = 0, defaites = 0 } = data;

            if (act.type === "victoire") {
                victoires++;
                exp += act.symbol === "✅" ? 10 : 5;
                fans += act.symbol === "✅" ? 1000 : 500;
                if (act.symbol === "✅") talent++;
            } else {
                defaites++;
                if (act.symbol === "❌") {
                    exp = Math.max(0, exp - 5);
                    fans = Math.max(0, fans - 500);
                } else {
                    exp += 2;
                }
            }

            await setfiche("exp", exp, act.jid);
            await setfiche("fans", fans, act.jid);
            await setfiche("talent", talent, act.jid);
            await setfiche("victoires", victoires, act.jid);
            await setfiche("defaites", defaites, act.jid);

            updated = true;
        }

        if (updated) {
            await ovl.sendMessage(ms_org, {
                text: "✅ Résultat appliqué et fiches All Stars mises à jour."
            }, { quoted: ms });
        }
    }
});

//---------------- COMMANDE +PAVEMODO ----------------
ovlcmd({
    nom_cmd: "pavemodo",
    classe: "Duel",
    react: "📄",
    desc: "Envoie le pavé complet RazorX™."
}, async (ms_org, ovl) => {

    const paveComplet = `
.                    ⚡RAZORX™ LIVE▶️
▔▔▔▔▔▔▔▔▔▔▔▔▔▔

\`📊PERFORMANCES\`
@Joueur 1 → Strikes:    | Attaques:     
@Joueur 2 → Strikes:    | Attaques:     

🏆\`RESULTAT\`: 
@Joueur 1:    
@Joueur 2:  
⏱️Durée: 

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™
`;

    await ovl.sendMessage(ms_org, { text: paveComplet });
});

//---------------- COMMANDE +STATS ----------------
ovlcmd({
    nom_cmd: "stats",
    classe: "Duel",
    react: "📉",
    desc: "Modifie rapidement les stats d'une équipe dans un duel en cours."
}, async (ms_org, ovl, { arg, ms }) => {
    if (!arg[0]) return;

    const equipeName = arg.join(' ').toLowerCase();

    const duelKey = Object.keys(duelsEnCours).find(k =>
        duelsEnCours[k].equipe1.some(e => e.nom.toLowerCase() === equipeName) ||
        duelsEnCours[k].equipe2.some(e => e.nom.toLowerCase() === equipeName)
    );
    if (!duelKey) return;

    const duel = duelsEnCours[duelKey];

    const equipe = duel.equipe1.find(e => e.nom.toLowerCase() === equipeName)
        || duel.equipe2.find(e => e.nom.toLowerCase() === equipeName);
    if (!equipe) return;

    equipe.stats.pv = Math.max(0, equipe.stats.pv - 30);
    equipe.stats.energie = Math.max(0, equipe.stats.energie - 30);
    equipe.stats.sta = Math.max(0, equipe.stats.sta - 50);

    const fiche = generateFicheDuel(duel);
    await ovl.sendMessage(ms_org, { image: { url: duel.arene.image }, caption: fiche }, { quoted: ms });
});
