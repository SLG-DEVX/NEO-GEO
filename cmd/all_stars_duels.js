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
    stats[stat] = Math.max(0, Math.min(100, (stats[stat] || 0) + valeur));
}

function cleanText(txt) {
    return txt.replace(/[\u2066-\u2069\u200e\u200f\u202a-\u202e]/g, '').trim();
}

function generateFicheDuel(duel) {
    return `*🆚VERSUS ARENA BATTLE🏆🎮*
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒░░▒░
🔅 *${duel.equipe1[0].nom}*: 🫀:${duel.equipe1[0].stats.sta || 100}% 🌀:${duel.equipe1[0].stats.energie || 100}% ❤️:${duel.equipe1[0].stats.pv || 100}%
                                   ~  *🆚*  ~
🔅 *${duel.equipe2[0].nom}*: 🫀:${duel.equipe2[0].stats.sta || 100}% 🌀:${duel.equipe2[0].stats.energie || 100}% ❤️:${duel.equipe2[0].stats.pv || 100}%
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

//---------------- COMMANDE +PAVEMODO ----------------
ovlcmd({
    nom_cmd: "pavemodo",
    classe: "Duel",
    react: "📄",
    desc: "Envoie le pavé RazorX™ et applique les stats / résultats."
}, async (ms_org, ovl, { texte, ms, getJid }) => {
    if (!texte) {
        const paveStats = `
.                    ⚡RAZORX™ LIVE▶️
▔▔▔▔▔▔▔▔▔▔▔▔▔▔
📊PERFORMANCES
@Joueur1 → Strikes:   | Attaques:   
@Joueur2 → Strikes:   | Attaques:   

🏆RESULTAT
@Joueur1:  
@Joueur2:  
⏱️Durée: 

╰───────────────────
🏆NSL PRO ESPORT ARENA® | RAZORX⚡™
`;
        return await ovl.sendMessage(ms_org, { text: paveStats });
    }

    // ---- PERFORMANCES ----
    if (texte.includes("📊PERFORMANCES")) {
        const lignes = texte.split('\n').map(l => l.trim()).filter(Boolean);
        let updated = false;

        for (const ligne of lignes) {
            if (!ligne.includes('→')) continue;
            const m = ligne.match(/@?([^\s]+)\s*→.*?strikes\s*:\s*(\d+).*?attaques\s*:\s*(\d+)/i);
            if (!m) continue;

            const tag = cleanText(m[1]);
            const strikes = parseInt(m[2]);
            const attaques = parseInt(m[3]);

            const duel = Object.values(duelsEnCours).find(d =>
                d.equipe1.some(j => cleanText(j.nom).toLowerCase() === tag.toLowerCase()) ||
                d.equipe2.some(j => cleanText(j.nom).toLowerCase() === tag.toLowerCase())
            );
            if (!duel) continue;

            const joueur = duel.equipe1.find(j => cleanText(j.nom).toLowerCase() === tag.toLowerCase()) ||
                           duel.equipe2.find(j => cleanText(j.nom).toLowerCase() === tag.toLowerCase());
            if (!joueur) continue;

            // Mise à jour stats duel
            joueur.stats.strikes = (joueur.stats.strikes || 0) + strikes;
            joueur.stats.attaques = (joueur.stats.attaques || 0) + attaques;

            // Mise à jour All Stars
            try {
                const jid = await getJid(tag + "@lid", ms_org, ovl);
                const data = await getData({ jid });
                if (data) {
                    await setfiche("strikes", (Number(data.strikes) || 0) + strikes, jid);
                    await setfiche("attaques", (Number(data.attaques) || 0) + attaques, jid);
                }
            } catch {}
            updated = true;
        }

        if (updated) {
            const duelKey = Object.keys(duelsEnCours).find(k =>
                lignes.some(l => l.includes(k.split(" vs ")[0]))
            );
            if (duelKey) {
                const fiche = generateFicheDuel(duelsEnCours[duelKey]);
                await ovl.sendMessage(ms_org, { image: { url: duelsEnCours[duelKey].arene.image }, caption: fiche }, { quoted: ms });
            }
        }
    }

    // ---- RESULTATS ----
    if (texte.includes("🏆RESULTAT")) {
        const bloc = texte.match(/🏆RESULTAT\s*:([\s\S]+)/i);
        if (!bloc) return;

        const lignes = bloc[1].split('\n').map(l => l.trim()).filter(Boolean);
        let updated = false;

        for (const ligne of lignes) {
            const m = ligne.match(/@?([^\s:]+)\s*:\s*(victoire|defaite|défaite)(?:\s*\+\s*([✅❌]))?/i);
            if (!m) continue;

            const tag = cleanText(m[1]);
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
                    exp += 10; fans += 1000; talent += 1;
                } else { exp += 5; fans += 500; }
            } else {
                defaites += 1;
                if (symbol === "❌") { exp = Math.max(0, exp - 5); fans = Math.max(0, fans - 500); }
                else { exp += 2; }
            }

            await setfiche("exp", exp, jid);
            await setfiche("fans", fans, jid);
            await setfiche("talent", talent, jid);
            await setfiche("victoires", victoires, jid);
            await setfiche("defaites", defaites, jid);

            updated = true;
        }

        if (updated) await ovl.sendMessage(ms_org, { text: "✅ Résultat appliqué et fiches All Stars mises à jour." });
    }
});
