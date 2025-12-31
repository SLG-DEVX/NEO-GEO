// Base de données du système de combat 
const fightingengine = {
  //------- HAND MOVES
  handMoves: {
    1: {
      name: "Coup direct / Direct",
      description: "Poing avant (ou arrière) propulsé en ligne droite vers le visage ou le torse, frappe rapide et directe.",
      defenses: [
        { type: "Esquive", description: "Bascule torse 60° arrière gauche vmax, recule 1m, poing droit ne touche pas le corps." },
        { type: "Blocage", description: "Avant-bras gauche vertical protège visage." },
        { type: "Déviation", description: "Paume droite pousse le poing adverse vers l’extérieur." },
        { type: "Contre", description: "Direct poing droit au visage ou plexus." }
      ]
    },
    2: {
      name: "Coup en crochet gauche / Left Hook",
      description: "Poing gauche lancé en arc horizontal vers la tête ou le flanc droit de l’adversaire, frappe circulaire.",
      defenses: [
        { type: "Blocage", description: "Avant-bras droit vertical protège la mâchoire." },
        { type: "Esquive", description: "Bascule torse 60° arrière droite vmax, recule 1m, tête derrière épaule." },
        { type: "Déviation", description: "Paume droite effleure bras adverse." },
        { type: "Contre", description: "Crochet droit direct." }
      ]
    },
    3: {
      name: "Coup en crochet droit / Right Hook",
      description: "Poing droit lancé en arc horizontal vers la tête ou le flanc gauche de l’adversaire, frappe circulaire.",
      defenses: [
        { type: "Blocage", description: "Avant-bras gauche vertical protège visage." },
        { type: "Esquive", description: "Bascule torse 60° diagonale gauche vmax, recule 1m." },
        { type: "Déviation", description: "Paume gauche guide bras adverse." },
        { type: "Contre", description: "Direct droit visage." }
      ]
    },
    4: {
      name: "Uppercut / Uppercut",
      description: "Poing propulsé de bas en haut sous le menton ou le torse, idéal pour percer la garde.",
      defenses: [
        { type: "Blocage", description: "Coude droit protège menton et plexus." },
        { type: "Esquive", description: "Bascule torse 60° arrière gauche vmax, menton derrière épaule." },
        { type: "Déviation", description: "Paume droite pousse poing adverse." },
        { type: "Contre", description: "Crochet droit ou direct corps." }
      ]
    },
    5: {
      name: "Uppercut sauté / Rising Uppercut",
      description: "Poing propulsé de bas en haut en sautant, frappe vers le menton ou la poitrine, ajoutant puissance et portée.",
      defenses: [
        { type: "Blocage", description: "Double garde haute." },
        { type: "Esquive", description: "Bascule torse 60° arrière droite vmax, recule 1m." },
        { type: "Déviation", description: "Avant-bras droit guide poing adverse." },
        { type: "Contre", description: "Crochet gauche tête." }
      ]
    },
    6: {
      name: "Coup en revers / Backfist",
      description: "Poing lancé de manière horizontale ou diagonale avec le dos du poing, frappe visage ou tempes.",
      defenses: [
        { type: "Blocage", description: "Avant-bras droit absorbe revers." },
        { type: "Esquive", description: "Bascule torse 60° diagonale gauche vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite glisse sur bras adverse." },
        { type: "Contre", description: "Crochet droit." }
      ]
    },
    7: {
      name: "Revers circulaire / Spinning Backfist",
      description: "Rotation du corps à 180° ou 360°, frappe circulaire avec le dos du poing, cible tête ou torse.",
      defenses: [
        { type: "Blocage", description: "Garde haute protège visage." },
        { type: "Esquive", description: "Pivot 90° droite vmax, recule légèrement, corps de côté." },
        { type: "Déviation", description: "Paume droite guide bras adverse." },
        { type: "Contre", description: "Uppercut." }
      ]
    },
    8: {
      name: "Coup marteau descendant / Hammer Fist Down",
      description: "Poing levé verticalement puis descendu en frappe martelée sur tête, épaule ou bras adverse.",
      defenses: [
        { type: "Blocage", description: "Avant-bras vertical protège tête." },
        { type: "Esquive", description: "Bascule torse 60° arrière vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite pousse poing." },
        { type: "Contre", description: "Uppercut." }
      ]
    },
    9: {
      name: "Coup marteau latéral / Hammer Fist Side",
      description: "Poing lancé horizontalement de côté, frappe latérale sur tête, torse ou flanc.",
      defenses: [
        { type: "Blocage", description: "Avant-bras absorbe choc." },
        { type: "Esquive", description: "Bascule 60° diagonale vmax, recule 1m." },
        { type: "Déviation", description: "Paume gauche guide bras adverse." },
        { type: "Contre", description: "Uppercut." }
      ]
    },
    10: {
      name: "Coup marteau en revers / Reverse Hammer",
      description: "Poing lancé en revers horizontal ou diagonal, frappe sur tête ou flanc en rotation légère.",
      defenses: [
        { type: "Blocage", description: "Garde haute protège visage." },
        { type: "Esquive", description: "Bascule 60° arrière gauche vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite dévie bras adverse au triceps." },
        { type: "Contre", description: "Backfist." }
      ]
    }
  },

  //------- KICK MOVES
  kickMoves: {
    1: {
      name: "Front Kick / Coup de pied frontal",
      description: "Pied avant (ou arrière) propulsé vers le torse ou le menton, frappe directe.",
      defenses: [
        { type: "Esquive", description: "Bascule torse 60° arrière gauche vmax, recule 1m." },
        { type: "Blocage", description: "Tibia arrière vertical stoppe pied." },
        { type: "Déviation", description: "Paume droite pousse tibia adverse." },
        { type: "Contre", description: "Direct poing droit." }
      ]
    },
    2: {
      name: "Roundhouse Kick / Coup circulaire",
      description: "Pied arrière (ou avant) frappe latéralement, cible tête, torse ou côtes.",
      defenses: [
        { type: "Blocage", description: "Tibia avant vertical stoppe jambe." },
        { type: "Esquive", description: "Bascule torse 60° arrière gauche vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite pousse tibia adverse." },
        { type: "Contre", description: "Crochet gauche aux côtes." }
      ]
    },
    3: {
      name: "Side Kick / Coup de pied latéral",
      description: "Pied propulsé sur le côté, jambe tendue, frappe le flanc ou la tête.",
      defenses: [
        { type: "Blocage", description: "Tibia arrière vertical stoppe jambe." },
        { type: "Esquive", description: "Bascule torse 60° diagonale gauche vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite guide jambe." },
        { type: "Contre", description: "Crochet gauche foie." }
      ]
    },
    4: {
      name: "Back Kick / Coup de pied arrière",
      description: "Rotation du corps, frappe arrière avec talon, cible le torse ou l’abdomen.",
      defenses: [
        { type: "Blocage", description: "Tibia arrière vertical stoppe talon." },
        { type: "Esquive", description: "Bascule torse 60° arrière droite vmax, recule 1m." },
        { type: "Déviation", description: "Paume gauche pousse talon adverse." },
        { type: "Contre", description: "Crochet gauche." }
      ]
    },
    5: {
      name: "Hook Kick / Coup de pied en crochet",
      description: "Pied en crochet frappant de côté ou derrière, frappe latérale vers tête ou flanc.",
      defenses: [
        { type: "Blocage", description: "Tibia avant stoppe pied." },
        { type: "Esquive", description: "Bascule torse 60° diagonale gauche vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite guide jambe." },
        { type: "Contre", description: "Crochet gauche." }
      ]
    },
    6: {
      name: "Axe Kick / Coup de pied descendant",
      description: "Pied levé verticalement puis descendu, talon frappe le sommet du crâne ou épaule.",
      defenses: [
        { type: "Blocage", description: "Avant-bras vertical protège tête." },
        { type: "Esquive", description: "Bascule torse 60° arrière droite vmax, recule 1m." },
        { type: "Déviation", description: "Paume gauche pousse talon." },
        { type: "Contre", description: "Crochet gauche." }
      ]
    },
    7: {
      name: "Spinning Back Kick / Coup de pied arrière circulaire",
      description: "Rotation complète 360°, pied frappe derrière avec puissance maximale.",
      defenses: [
        { type: "Blocage", description: "Tibia vertical absorbe talon." },
        { type: "Esquive", description: "Pivot 90° droite vmax, recule légèrement." },
        { type: "Déviation", description: "Paume droite guide talon." },
        { type: "Contre", description: "Crochet gauche." }
      ]
    },
    8: {
      name: "Low Kick / Coup bas",
      description: "Pied frappe jambe adverse (cuisse ou mollet), souvent avec jambe arrière.",
      defenses: [
        { type: "Blocage", description: "Tibia avant stoppe jambe." },
        { type: "Esquive", description: "Fléchir jambe gauche et reculer 1m, tibia passe à vide." },
        { type: "Déviation", description: "Paume droite pousse mollet adverse." },
        { type: "Contre", description: "Crochet gauche côtes." }
      ]
    },
    9: {
      name: "Knee Strike / Coup de genou",
      description: "Genou levé et propulsé vers corps ou tête à distance proche.",
      defenses: [
        { type: "Blocage", description: "Avant-bras gauche vertical stoppe genou." },
        { type: "Esquive", description: "Bascule torse 60° diagonale arrière droite vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite guide tibia du genou adverse." },
        { type: "Contre", description: "Crochet gauche." }
      ]
    },
    10: {
      name: "Flying Kick / Coup sauté",
      description: "Saut en avant ou latéral, pied frappe torse ou visage, très spectaculaire et puissant.",
      defenses: [
        { type: "Blocage", description: "Avant-bras vertical protège visage." },
        { type: "Esquive", description: "Bascule torse 60° arrière gauche vmax, recule 1m." },
        { type: "Déviation", description: "Paume droite pousse pied adverse." },
        { type: "Contre", description: "Crochet gauche." }
      ]
    }
  }
};

//------- BODY PARTS
  bodyParts: [
    "Visage",
    "Gorge",
    "Thorax",
    "Torse",
    "Poitrine gauche",
    "Poitrine droite",
    "Mâchoire gauche",
    "Mâchoire droite",
    "Tempe gauche",
    "Tempe droite",
    "Côtes gauche",
    "Côtes droite",
    "Abdomen",
    "Coeur",
    "Omoplate gauche",
    "Omoplate droite",
    "Menton",
    "Nez",
    "Nuque",
    "Crâne",
    "Colonne vertébrale",
    "Taille",
    "Cuisse gauche",
    "Cuisse droite",
    "Genou gauche",
    "Genou droit",
    "Tibia gauche",
    "Tibia droit",
    "Mollet gauche",
    "Mollet droit"
  ]
};

// Fonction pour récupérer les données d'un move ou des parties du corps
function getMoveData(type, number) {
  if (type === "hand") return fightingengineDatabase.handMoves[number] || null;
  if (type === "kick") return fightingengineDatabase.kickMoves[number] || null;
  return null;
}

function getBodyParts() {
  return fightingengineDatabase.bodyParts;
}

// Export Node.js / ES6
module.exports = { fightingengineDatabase, getMoveData, getBodyParts }; 
