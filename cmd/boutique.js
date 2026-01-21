const { ovlcmd } = require('../lib/ovlcmd');
const { cards } = require('../DataBase/cards');
const { MyNeoFunctions } = require("../DataBase/myneo_lineup_team");
const { getData, setfiche, getAllFiches } = require("../DataBase/allstars_divs_fiches");
const config = require("../set");

//-------- UTILITAIRES
const formatNumber = n => {
    try {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } catch {
        return n;
    }
};

const normalize = str =>
    String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

//-------- VERIFICATION NIVEAU POUR ACHAT
const checkLevelRequirement = (playerLevel, cardCategory, cardGrade) => {
    let levelRequired = 0;

    if (["or", "gold"].includes(cardCategory)) {
        if (["s+", "sp", "sm"].includes(cardGrade)) levelRequired = 10;
        else if (cardGrade === "s") levelRequired = 5;
    } else if (["argent", "silver"].includes(cardCategory)) {
        if (["s+", "sp", "sm"].includes(cardGrade)) levelRequired = 5;
        else if (cardGrade === "s") levelRequired = 5;
    } else if (["bronze"].includes(cardCategory)) {
        if (["s+", "sp", "sm"].includes(cardGrade)) levelRequired = 3;
        else if (cardGrade === "s") levelRequired = 3;
    } else if (["ss", "ss+", "ssp", "ss-", "ssm"].includes(cardGrade)) {
        levelRequired = 15;
    }

    if (playerLevel < levelRequired) {
        return {
            ok: false,
            message:
                `❌ Tu n'as pas le niveau requis pour posséder cette carte.\n` +
                `Niveau requis: ${levelRequired} ▲, ton niveau: ${playerLevel} ▲  
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░  
                              🌀🔆`
        };
    }

    return { ok: true };
};

//-------- JOUEURS QUI POSSÈDENT UNE CARTE
const getCardOwners = async (cardName) => {
    const allFiches = await getAllFiches();
    const owners = [];
    const normalizedCard = normalize(cardName);

    for (const fiche of allFiches) {
        const playerCards = (fiche.cards || "")
            .split("\n")
            .map(c => normalize(c.trim()));

        if (playerCards.includes(normalizedCard) && fiche.jid) {
            owners.push(fiche.jid);
        }
    }
    return owners;
};

//============================
// FONCTION AUTO-RECOMPENSE NS
//============================
const autoRewardNS = async (jid, ovl, ms_org, nsGained = 0) => {
    try {
        const userData = await MyNeoFunctions.getUserData(jid);
        if (!userData) return;

        const playerName = userData.name || userData.pseudo || "Joueur";

        const currentNS = parseInt(userData.ns || 0) + nsGained; 
        const lastRewardNS = parseInt(userData.lastRewardNS || 0);

        const currentTier = Math.floor(currentNS / 100);
        const lastTier = Math.floor(lastRewardNS / 100);

        if (currentTier > lastTier) {
            const tiersGained = currentTier - lastTier;
            const rewardPerTier = 5; 
            const totalReward = tiersGained * rewardPerTier;

            await MyNeoFunctions.updateUser(jid, {
                ns: currentNS + totalReward,
                lastRewardNS: currentNS
            });

            await ovl.sendMessage(ms_org, {
                text: `🎉👑 LEVEL UP ROYALITY XP
▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                             
👑 Félicitations *${playerName}* 👑
Tu viens de franchir les ${currentNS} Royalities !

🎁 Récompenses :
💰 +500000 golds
🔷 +50 NC
🎫 +25 coupons
💯 Royalities 👑🎉`,
                mentions: [jid]
            });

        } else {
            await MyNeoFunctions.updateUser(jid, { ns: currentNS });
        }

    } catch (err) {
        console.log("Erreur autoRewardNS:", err);
    }
};

//-------- COMMANDE BOUTIQUE
ovlcmd({
    nom_cmd: "boutique",
    react: "🛒",
    classe: "NEO_GAMES"
}, async (ms_org, ovl, { ms, auteur_Message, repondre }) => {

    try {
        let userData = await MyNeoFunctions.getUserData(auteur_Message);
        let fiche = await getData({ jid: auteur_Message });
        if (!userData || !fiche) return repondre("❌ Impossible de récupérer ta fiche.");

        //-------- TEXTE D'ACCUEIL 
        await ovl.sendMessage(ms_org, {
            image: { url: 'https://files.catbox.moe/i87tdr.png' },
            caption: `╭────〔 *🛍️BOUTIQUE🛒* 〕  

😃Bienvenue dans la boutique NEO🛍️Store🛒, pour faire un achat il vous suffit de taper comme ceci :
🛍️achat: sasuke(Hebi) / 🛍️vente: sasuke(Hebi)

Après cela attendez la validation de votre achat ou de votre vente.
#Happy202️⃣6️⃣🎊🎄
╰───────────────────
                          *🔷NEO🛍️STORE*`
        }, { quoted: ms });

        const waitFor = async (timeout = 120000) => {
            const r = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: timeout });
            const txt =
                r?.message?.extendedTextMessage?.text ||
                r?.message?.conversation ||
                "";
            return txt ? txt.trim() : "";
        };

        const waitForConfirm = async (timeout = 60000) => {
            while (true) {
                const r = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: timeout });
                const txt =
                    r?.message?.extendedTextMessage?.text ||
                    r?.message?.conversation ||
                    "";
                const cleanTxt = txt ? txt.trim().toLowerCase() : "";
                if (!cleanTxt) continue;
                if (["oui", "non", "+coupon"].some(k => cleanTxt.includes(k))) return cleanTxt;
            }
        };

        const allCards = [];
        for (const [placementKey, placementCards] of Object.entries(cards)) {
            for (const c of placementCards) {
                allCards.push({ ...c, placement: placementKey });
            }
        }

        let userInput = await waitFor();
        if (!userInput) return repondre("❌ Temps écoulé. Session fermée.");

        while (true) {
            try {
                if (userInput.toLowerCase() === "close") {
                    await repondre("✅ Boutique fermée.");
                    break;
                }

                const cleanedInput = userInput.replace(/[^a-zA-Z]/g, "").toLowerCase();
                let mode = null;
                if (cleanedInput.startsWith("achat")) mode = "achat";
                else if (cleanedInput.startsWith("vente")) mode = "vente";
                else {
                    userInput = await waitFor();
                    continue;
                }

                const parts = userInput.split(":");
                if (parts.length < 2) {
                    userInput = await waitFor();
                    continue;
                }

                let query = parts.slice(1).join(":").trim();
                const isCasinoSale = query.includes("🎰");
                query = query.replace("🎰", "").trim();
                if (!query) {
                    await repondre("❌ Tu dois écrire un nom après ':'");
                    userInput = await waitFor();
                    continue;
                }

                const q = query.toLowerCase().replace(/[\s\-_]/g, "");
                const card =
                    allCards.find(c => c.name.toLowerCase().replace(/[\s\-_]/g, "") === q) ||
                    allCards.find(c => c.name.toLowerCase().includes(q));

                if (!card) {
                    await repondre(`❌ Aucune carte trouvée pour : ${query}`);
                    userInput = await waitFor();
                    continue;
                }

                let basePrix = Number(card.price) || 0;
                let golds = parseInt(String(fiche.golds || "0").replace(/[^\d]/g, "")) || 0;
                let nc = parseInt(String(userData.nc || "0").replace(/[^\d]/g, "")) || 0;
                const cardCurrency = card.unit === "nc" ? "nc" : "golds";
                const cardIcon = cardCurrency === "nc" ? "🔷" : "🧭"; 

                let confirmPrice = basePrix;
                const owners = await getCardOwners(card.name);
                if (owners.length >= 2) {
                    confirmPrice = Math.floor(confirmPrice * 1.5);
                    const taggedOwners = owners
                        .slice(0, 2)
                        .map(jid => `@${jid.split("@")[0]}`)
                        .join(" et ");
                    await ovl.sendMessage(ms_org, {
                        text:
                            `⚠️ Les joueurs ${taggedOwners} possèdent déjà cette carte.\n` +
                            `💹 Le prix devient ${formatNumber(confirmPrice)} ${cardIcon}
                            ▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░
                              🔆🌀`,
                        mentions: owners.slice(0, 2)
                    }, { quoted: ms });
                }

                let confirmOptions = "oui / non";
                if (mode === "achat") confirmOptions += " / +coupon";

                await ovl.sendMessage(ms_org, {
                    image: { url: card.image },
                    caption: `🎴 Carte: ${card.name}
🔅 Grade: ${card.grade}
🔅 Catégorie: ${card.category}
🔅 Placement: ${card.placement}
🛍️ Prix: ${formatNumber(confirmPrice)} ${cardIcon}

✔️ Confirmer ${mode} ? (${confirmOptions})
╰───────────────────`
                }, { quoted: ms });

                const conf = await waitForConfirm();
                if (!conf || conf.includes("non")) {
                    await repondre("❌ Transaction annulée.");
                    userInput = await waitFor();
                    continue;
                }

                //================ ACHAT ================
                if (mode === "achat") {
                    const playerLevel = parseInt(fiche?.data?.niveau ?? fiche?.niveau ?? 0);
                    const levelCheck = checkLevelRequirement(playerLevel, card.category, card.grade.toLowerCase());
                    if (!levelCheck.ok) {
                        await repondre(levelCheck.message);
                        userInput = await waitFor();
                        continue;
                    }

                    let finalPrice = confirmPrice;
                    let couponUsed = false;
                    if (conf.includes("+coupon")) {
                        const userCoupons = parseInt(userData.coupons || 0);
                        if (userCoupons < 100) {
                            await repondre("❌ Pas assez de coupons.");
                            userInput = await waitFor();
                            continue;
                        }
                        finalPrice = Math.floor(finalPrice / 2);
                        couponUsed = true;
                        await MyNeoFunctions.updateUser(auteur_Message, { coupons: userCoupons - 100 });
                    }

                    if (cardCurrency === "golds" && golds < finalPrice) {
                        await repondre("❌ Pas assez de golds.");
                        userInput = await waitFor();
                        continue;
                    }
                    if (cardCurrency === "nc" && nc < finalPrice) {
                        await repondre("❌ Pas assez de NC.");
                        userInput = await waitFor();
                        continue;
                    }

                    await MyNeoFunctions.updateUser(auteur_Message, { np: (userData.np || 0) - 1 });

                    if (cardCurrency === "golds")
                        await setfiche("golds", golds - finalPrice, auteur_Message);
                    else
                        await MyNeoFunctions.updateUser(auteur_Message, { nc: nc - finalPrice });

                    const cardsList = (fiche.cards || "")
                        .split("\n")
                        .map(x => x.trim())
                        .filter(Boolean);

                    if (!cardsList.some(c => normalize(c) === normalize(card.name)))
                        cardsList.push(card.name);

                    await setfiche("cards", cardsList.join("\n"), auteur_Message);

                    // ---------- AJOUT +5 NS avec auto-reward -------------------------
                    await autoRewardNS(auteur_Message, ovl, ms_org, 5);

                    await ovl.sendMessage(ms_org, {
                        image: { url: card.image },
                        caption: `╭───〔 🛍️ REÇU D’ACHAT 〕───────  

👤 Client: ${fiche.code_fiche}
🎴 Carte ajoutée: ${card.name}
💳 Paiement: 1 NP + ${formatNumber(finalPrice)} ${cardIcon}
${couponUsed ? "✅ Coupon utilisé (100🎟️)" : ""}

Merci pour ton achat !
╰───────────────────`
                    });          
                }

                //================ VENTE ================
                else {
                    let cardsList = (fiche.cards || "")
                        .split(/\n|•/g)
                        .map(c => c.trim())
                        .filter(Boolean); 

                    const index = cardsList.findIndex(c => normalize(c) === normalize(card.name));
                    if (index === -1) {
                        await repondre("❌ Tu ne possèdes pas cette carte.");
                        userInput = await waitFor();
                        continue;
                    }

                    cardsList.splice(index, 1);
                    await setfiche("cards", cardsList.join("\n"), auteur_Message);

                    let finalSalePrice = isCasinoSale
                        ? Math.floor(basePrix * 0.15)
                        : Math.floor(basePrix / 2);

                    if (cardCurrency === "golds")
                        await setfiche("golds", golds + finalSalePrice, auteur_Message);
                    else
                        await MyNeoFunctions.updateUser(auteur_Message, { nc: nc + finalSalePrice });

                    await ovl.sendMessage(ms_org, {
                        image: { url: card.image },
                        caption: `╭───〔 🛍️ REÇU DE VENTE 〕───────  

👤 Client: ${fiche.code_fiche}
🎴 Carte retirée: ${card.name}
💳 Tu as reçu: ${formatNumber(finalSalePrice)} ${cardIcon}
╰───────────────────`
                    }, { quoted: ms });
                }

                userData = await MyNeoFunctions.getUserData(auteur_Message);
                fiche = await getData({ jid: auteur_Message });
                userInput = await waitFor();

            } catch (innerErr) {
                console.log("Erreur session boutique:", innerErr);
                await repondre("🛍️ Boutique en attente… tape `close` pour fermer.");
                userInput = await waitFor();
            }
        }

    } catch (e) {
        console.log("Erreur boutique critique:", e);
        return repondre("🛍️ Boutique en attente… tape \"close\" pour fermer.");
    }
});
