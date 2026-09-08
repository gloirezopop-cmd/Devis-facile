import { PARAMETRES, calculerRecouvrement } from './parametres.js';
import { calculerBlocArmature, filDeLigature, poidsAuMetre } from './armature.js';
import { calculerCoffrage } from './coffrage.js';

/**
 * Moteur de metre — LOT 100.
 *
 * Fonction pure : elle recoit une saisie, elle rend des volumes et des
 * surfaces. Elle ne connait ni le navigateur, ni la base, ni l'heure qu'il est.
 *
 * Deux regles tenues partout :
 *   1. Une dimension manquante rend `null`, jamais `0`. Un zero se propage en
 *      silence dans un devis ; un `null` se voit.
 *   2. Toute valeur saisie est consommee ou signalee. Le classeur Excel
 *      acceptait une largeur orpheline sans rien dire — c'est ainsi que le
 *      beton de proprete se retrouvait cinq fois trop cher.
 */

const DECIMALES = 6;

/** Arrondit a 6 decimales pour absorber le bruit des flottants. */
function net(x) {
  return Math.round(x * 10 ** DECIMALES) / 10 ** DECIMALES;
}

/** Vrai si la valeur est un nombre exploitable et positif (non nul). */
function renseigne(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/** Retourne les clés des valeurs saisies qui sont négatives ou nulles. */
function champsInvalides(ligne) {
  const champsAChecker = [...CHAMPS_DIMENSION, 'espacement', 'diametrePrin', 'diametreCadre', 'nombreDeFiles', 'espacementCadre', 'quantite'];
  return champsAChecker.filter(
    (champ) => typeof ligne[champ] === 'number' && Number.isFinite(ligne[champ]) && ligne[champ] <= 0
  );
}

/** Nombre d'elements : absent vaut 1, comme dans le classeur. */
function nombre(v) {
  return renseigne(v) ? v : 1;
}

/** Les cinq cotes sans lesquelles une volee d'escalier n'est pas calculable. */
const CHAMPS_VOLEE = ['hauteurAMonter', 'nombreContremarches', 'giron', 'largeur', 'epaisseurPaillasse'];

/** Cotes manquantes d'une volee. Vide = volee complete. */
function coteseManquantesVolee(v) {
  return CHAMPS_VOLEE.filter((c) => !renseigne(Number(v?.[c])));
}

/**
 * Geometrie d'une volee d'escalier — source unique.
 *
 * Le volume, le coffrage et le ferraillage lisaient chacun leur propre copie de
 * ces quatre lignes : une correction sur l'une ne suivait pas sur les autres.
 *
 *   h  = H / N                  hauteur d'une marche
 *   Ng = N - 1                  girons (la derniere contremarche debouche sur le palier)
 *   Lp = Ng x g                 projection horizontale
 *   L  = racine(H^2 + Lp^2)     longueur inclinee de la paillasse
 *
 * L'epaisseur cotee verticalement se ramene a la perpendiculaire par cos(alpha) = Lp / L.
 */
function geometrieVolee(v) {
  const N = Number(v.nombreContremarches);
  const H = Number(v.hauteurAMonter);
  const g = Number(v.giron);
  const h = H / N;
  const Ng = v.convention === 'marche_terminale' ? N : N - 1;
  const Lp = Ng * g;
  const L = Math.sqrt(H ** 2 + Lp ** 2);
  const eSaisie = Number(v.epaisseurPaillasse);
  const ePerp = v.typeEpaisseur === 'verticale' ? eSaisie * (Lp / L) : eSaisie;
  return { N, H, g, h, Ng, Lp, L, ePerp };
}

/**
 * Definition declarative des blocs de metre.
 * `requis` liste les champs sans lesquels la ligne n'est pas calculable.
 * `calcul` rend la valeur ; `formule` est le texte affiche par « Voir le calcul ».
 */
/**
 * Amorce saisie DANS la semelle — format historique du « socle armé ».
 *
 * Les amorces ont depuis leur propre bloc, et le formulaire actuel ne remplit
 * plus ces champs. Mais un projet enregistre avant ce changement les porte
 * encore : les ignorer faisait disparaitre leur beton et leur coffrage sans le
 * moindre message, et le devis sous-estimait le chantier d'autant.
 *
 * Ces deux fonctions ne rendent quelque chose que si les champs anciens sont
 * presents ; un projet recent suit donc exactement le meme chemin qu'avant.
 */
function _volumeAmorceIntegree(l) {
  const a = (l.amorceSectionA || 0) / 100;
  const b = (l.amorceSectionB || 0) / 100;
  const h = l.amorceHauteur || 0;
  return a * b * h;
}

function _coffrageAmorceIntegree(l) {
  const a = (l.amorceSectionA || 0) / 100;
  const b = (l.amorceSectionB || 0) / 100;
  const h = l.amorceHauteur || 0;
  return (2 * a + 2 * b) * h;
}

const BLOCS = {
  fouilles: {
    libelle: 'Fouilles en rigoles et en puits',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'profondeur'],
    formule: 'N x L x l x h',
    calcul: (l) => nombre(l.nombre) * l.longueur * l.largeur * l.profondeur,
  },

  betonProprete: {
    libelle: 'Beton de proprete',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'N x L x l x Ep',
    calcul: (l) => nombre(l.nombre) * l.longueur * l.largeur * l.epaisseur,
  },

  fouilleFilante: {
    libelle: 'Fouilles en tranchée',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'profondeur'],
    formule: 'L x l x h',
    calcul: (l) => l.longueur * l.largeur * l.profondeur,
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.profondeur, 2)}m (h) = ${net(l.longueur * l.largeur * l.profondeur, 3)} m³`
  },

  nivellement: {
    libelle: 'Nivellement de l\'emprise',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'L x l x Ep',
    calcul: (l) => l.longueur * l.largeur * l.epaisseur,
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.epaisseur, 2)}m (Ep) = ${net(l.longueur * l.largeur * l.epaisseur, 3)} m³`
  },

  semelles: {
    libelle: 'Semelles isolées',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'hauteur'],
    formule: 'L x l x h x N',
    calcul: (l) => (l.longueur * l.largeur * l.hauteur + _volumeAmorceIntegree(l)) * nombre(l.nombre),
    trace: (l) => {
      const base = `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.hauteur, 2)}m (H) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * l.hauteur * nombre(l.nombre), 3)} m³`;
      const vAmorce = _volumeAmorceIntegree(l);
      if (!vAmorce) return base;
      return `${base}\nAmorce solidaire (saisie ancienne) = ${net((l.amorceSectionA || 0) / 100, 2)} × ${net((l.amorceSectionB || 0) / 100, 2)} × ${net(l.amorceHauteur || 0, 2)} × ${nombre(l.nombre)} = ${net(vAmorce * nombre(l.nombre), 3)} m³`
        + `\nTotal = ${net((l.longueur * l.largeur * l.hauteur + vAmorce) * nombre(l.nombre), 3)} m³`;
    },
    calculCoffrage: (l, regles) => regles?.coffrage?.terrePourFondations
      ? 0
      : ((2 * l.longueur + 2 * l.largeur) * l.hauteur + _coffrageAmorceIntegree(l)) * nombre(l.nombre),
    traceCoffrage: (l, regles) => regles?.coffrage?.terrePourFondations ? 'Coulé en pleine terre (pas de coffrage)' : `Perimetre = 2 × (${l.longueur} + ${l.largeur}) = ${net(2 * l.longueur + 2 * l.largeur)} m\nSurface_coffrage = ${net(2 * l.longueur + 2 * l.largeur)} × ${l.hauteur} × ${nombre(l.nombre)} = ${net((2 * l.longueur + 2 * l.largeur) * l.hauteur * nombre(l.nombre))} m²`
  },

  amorces: {
    libelle: 'Amorces de poteaux',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'hauteur'],
    formule: 'L x l x h x N',
    calcul: (l) => l.longueur * l.largeur * l.hauteur * nombre(l.nombre),
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.hauteur, 2)}m (H) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * l.hauteur * nombre(l.nombre), 3)} m³`,
    calculCoffrage: (l) => (2 * l.longueur + 2 * l.largeur) * l.hauteur * nombre(l.nombre),
    traceCoffrage: (l) => `Perimetre = 2 × (${l.longueur} + ${l.largeur}) = ${net(2 * l.longueur + 2 * l.largeur)} m\nSurface_coffrage = ${net(2 * l.longueur + 2 * l.largeur)} × ${l.hauteur} × ${nombre(l.nombre)} = ${net((2 * l.longueur + 2 * l.largeur) * l.hauteur * nombre(l.nombre))} m²`
  },

  longrines: {
    libelle: 'Longrines',
    unite: 'm3',
    requis: ['perimetre', 'largeur', 'hauteur'],
    formule: 'Perimetre x larg x haut - deductions amorces',
    calcul: (l, regles, saisie) => {
      const volBrut = l.perimetre * l.largeur * l.hauteur;
      // Deduire le croisement des amorces
      let volAmorces = 0;
      if (saisie && saisie.amorces) {
        saisie.amorces.forEach(am => {
          const a = am.longueur || 0;
          const b = am.largeur || 0;
          // Hauteur H de la longrine
          volAmorces += a * b * l.hauteur * nombre(am.nombre);
        });
      }
      return volBrut - volAmorces;
    },
    trace: (l, regles, saisie) => {
      const volBrut = l.perimetre * l.largeur * l.hauteur;
      let volAmorces = 0;
      let details = [];
      if (saisie && saisie.amorces) {
        saisie.amorces.forEach(am => {
          const a = am.longueur || 0;
          const b = am.largeur || 0;
          const volAmorce = a * b * l.hauteur * nombre(am.nombre);
          volAmorces += volAmorce;
          if (volAmorce > 0) {
             details.push(`Amorce (${a}x${b}) × H(${l.hauteur}) × N(${nombre(am.nombre)}) = ${net(volAmorce, 3)} m³`);
          }
        });
      }
      let output = `Vol_Brut = ${net(l.perimetre)}m (Périmètre) × ${net(l.largeur)}m (l) × ${net(l.hauteur)}m (H) = ${net(volBrut, 3)} m³`;
      if (volAmorces > 0) {
        output += `\nDéductions croisements amorces : \n - ${details.join('\n - ')}\nTotal_Déduit = ${net(volAmorces, 3)} m³`;
      }
      output += `\nVolume_Net = ${net(volBrut, 3)} - ${net(volAmorces, 3)} = ${net(volBrut - volAmorces, 3)} m³`;
      return output;
    },
    calculCoffrage: (l, regles) => regles?.coffrage?.terrePourFondations ? 0 : l.perimetre * l.hauteur * 2,
    traceCoffrage: (l, regles) => regles?.coffrage?.terrePourFondations ? 'Coulé en pleine terre (pas de coffrage)' : `Surface_coffrage = ${l.perimetre} (Périmètre) × ${l.hauteur} (Hauteur) × 2 (Côtés) = ${net(l.perimetre * l.hauteur * 2)} m²`,
    calculBrut: (l) => l.perimetre * l.largeur * l.hauteur
  },

  murSoubassement: {
    libelle: 'Murs de soubassement',
    unite: 'm2',
    requis: ['perimetre', 'hauteur'],
    formule: 'Perimetre x H',
    calcul: (l) => l.perimetre * l.hauteur,
    trace: (l) => `Surface = ${net(l.perimetre, 2)}m (Périmètre) × ${net(l.hauteur, 2)}m (H) = ${net(l.perimetre * l.hauteur, 3)} m²`
  },
  colonnes: {
    libelle: 'Colonnes',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'hauteur'],
    requisAlternatifs: [['diametre', 'hauteur']],
    requisParChamp: { champ: 'forme', valeurs: { rectangulaire: 0, circulaire: 1 } },
    formule: (l) => l.forme === 'circulaire' ? 'pi x (d/2)^2 x H x N' : 'a x b x H x N',
    calcul: (l) =>
      l.forme === 'circulaire'
        ? Math.PI * (l.diametre / 2) ** 2 * l.hauteur * nombre(l.nombre)
        : l.longueur * l.largeur * l.hauteur * nombre(l.nombre),
    trace: (l) => l.forme === 'circulaire'
        ? `Section = π × (${net(l.diametre)}/2)² = ${net(Math.PI * (l.diametre / 2) ** 2, 4)} m²\nVolume = ${net(Math.PI * (l.diametre / 2) ** 2, 4)}m² × ${net(l.hauteur, 2)}m (H) × ${nombre(l.nombre)} (N) = ${net(Math.PI * (l.diametre / 2) ** 2 * l.hauteur * nombre(l.nombre), 3)} m³`
        : `Volume = ${net(l.longueur, 2)}m (a) × ${net(l.largeur, 2)}m (b) × ${net(l.hauteur, 2)}m (H) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * l.hauteur * nombre(l.nombre), 3)} m³`,
    calculCoffrage: (l) =>
      l.forme === 'circulaire'
        ? Math.PI * l.diametre * l.hauteur * nombre(l.nombre)
        : (2 * l.longueur + 2 * l.largeur) * l.hauteur * nombre(l.nombre),
    traceCoffrage: (l) =>
      l.forme === 'circulaire'
        ? `Perimetre = π × ${l.diametre} = ${net(Math.PI * l.diametre)} m\nSurface_coffrage = ${net(Math.PI * l.diametre)} × ${l.hauteur} × ${nombre(l.nombre)} = ${net(Math.PI * l.diametre * l.hauteur * nombre(l.nombre))} m²`
        : `Perimetre = 2 × (${l.longueur} + ${l.largeur}) = ${net(2 * l.longueur + 2 * l.largeur)} m\nSurface_coffrage = ${net(2 * l.longueur + 2 * l.largeur)} × ${l.hauteur} × ${nombre(l.nombre)} = ${net((2 * l.longueur + 2 * l.largeur) * l.hauteur * nombre(l.nombre))} m²`
  },
  ceintures: {
    libelle: 'Ceintures et Chaînages',
    unite: 'm3',
    requis: ['perimetre', 'largeur', 'hauteur'],
    formule: 'Périmètre x l x h x N',
    calcul: (l) => l.perimetre * l.largeur * l.hauteur * nombre(l.nombre),
    trace: (l) => `Volume = ${net(l.perimetre, 2)}m (Périmètre) × ${net(l.largeur, 2)}m (l) × ${net(l.hauteur, 2)}m (h) × ${nombre(l.nombre)} (N) = ${net(l.perimetre * l.largeur * l.hauteur * nombre(l.nombre), 3)} m³`,
    calculCoffrage: (l) => l.perimetre * l.hauteur * 2 * nombre(l.nombre),
    traceCoffrage: (l) => `Surface_coffrage = ${l.perimetre} (Périmètre) × ${l.hauteur} (Hauteur) × 2 (Côtés) × ${nombre(l.nombre)} = ${net(l.perimetre * l.hauteur * 2 * nombre(l.nombre))} m²`
  },
  linteaux: {
    libelle: 'Linteaux et Appuis',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'hauteur'],
    formule: 'L x l x h x N',
    calcul: (l) => l.longueur * l.largeur * l.hauteur * nombre(l.nombre),
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.hauteur, 2)}m (h) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * l.hauteur * nombre(l.nombre), 3)} m³`,
    calculCoffrage: (l) => l.longueur * (2 * l.hauteur + l.largeur) * nombre(l.nombre),
    traceCoffrage: (l) => `S1 (Côtés) = ${l.longueur} × ${l.hauteur} × 2 = ${net(l.longueur * l.hauteur * 2)} m²\nS2 (Sous-face) = ${l.longueur} × ${l.largeur} = ${net(l.longueur * l.largeur)} m²\nSurface_coffrage = (${net(l.longueur * l.hauteur * 2)} + ${net(l.longueur * l.largeur)}) × ${nombre(l.nombre)} = ${net(l.longueur * (2 * l.hauteur + l.largeur) * nombre(l.nombre))} m²`
  },
  escalier: {
    libelle: 'Escalier',
    unite: 'm3',
    requis: [], // now conditionnel
    formule: 'Σ Volées + Σ Paliers + Σ Blocs',
    calcul: (l) => {
      if (!l.mode || l.mode === 'volume') {
        return (l.volume || 0) * nombre(l.nombre);
      }
      
      let volTotal = 0;

      if (l.volees) {
        l.volees.forEach(v => {
          if (coteseManquantesVolee(v).length > 0) return;
          const { h, Ng, L, ePerp } = geometrieVolee(v);

          const v_paillasse = v.largeur * ePerp * L;
          const v_marches = 0.5 * Number(v.giron) * h * v.largeur * Ng;

          volTotal += v_paillasse + v_marches;
        });
      }

      if (l.paliers) {
        l.paliers.forEach(p => {
          if (!p.longueur || !p.largeur || !p.epaisseur) return;
          volTotal += p.longueur * p.largeur * p.epaisseur * nombre(p.nombre);
        });
      }

      if (l.blocs) {
        l.blocs.forEach(b => {
          if (!b.longueur || !b.largeur || !b.epaisseur) return;
          volTotal += b.longueur * b.largeur * b.epaisseur * nombre(b.nombre);
        });
      }

      return volTotal * nombre(l.nombre);
    },
    trace: (l) => {
      if (!l.mode || l.mode === 'volume') {
        return `Volume = ${net(l.volume)} m³ × ${nombre(l.nombre)} = ${net((l.volume || 0) * nombre(l.nombre))} m³`;
      }
      let details = [];
      if (l.volees) {
        l.volees.forEach((v, i) => {
          if (coteseManquantesVolee(v).length > 0) return;
          const { h, Ng, L, ePerp } = geometrieVolee(v);
          const v_paillasse = v.largeur * ePerp * L;
          const v_marches = 0.5 * Number(v.giron) * h * v.largeur * Ng;
          details.push(`Volée ${i+1}: Paillasse=${net(v_paillasse, 3)}m³ + Marches=${net(v_marches, 3)}m³ = ${net(v_paillasse + v_marches, 3)}m³`);
        });
      }
      if (l.paliers) {
        l.paliers.forEach((p, i) => {
          if (!p.longueur || !p.largeur || !p.epaisseur) return;
          details.push(`Palier ${i+1}: ${p.longueur}×${p.largeur}×${p.epaisseur} = ${net(p.longueur * p.largeur * p.epaisseur, 3)}m³`);
        });
      }
      if (l.blocs) {
        l.blocs.forEach((b, i) => {
          if (!b.longueur || !b.largeur || !b.epaisseur) return;
          details.push(`Bloc ${i+1}: ${b.longueur}×${b.largeur}×${b.epaisseur} = ${net(b.longueur * b.largeur * b.epaisseur, 3)}m³`);
        });
      }
      return details.join('\n');
    },
    calculCoffrage: (l) => {
      if (!l.mode || l.mode === 'volume') {
        // Mode historique
        const ratioDefaut = 12; // 12 m2 / m3
        return (l.volume || 0) * (l.ratioCoffrage || ratioDefaut) * nombre(l.nombre);
      }
      
      let surfTotal = 0;
      
      if (l.volees) {
        l.volees.forEach(v => {
          if (coteseManquantesVolee(v).length > 0) return;
          const { h, Ng, L, ePerp } = geometrieVolee(v);

          // Fond + deux joues + les contremarches. On coffre Ng contremarches et
          // non N : la derniere debouche sur le palier et se coffre avec lui.
          // Compter N ici alors que le volume compte Ng marches faisait diverger
          // le coffrage du beton d'une planche de contremarche par volee.
          const fond = v.largeur * L;
          const joues = 2 * (L * ePerp);
          const contremarches = Ng * (v.largeur * h);
          surfTotal += fond + joues + contremarches;
        });
      }

      if (l.paliers) {
        l.paliers.forEach(p => {
          if (!p.longueur || !p.largeur || !p.epaisseur) return;
          // S_palier = Longueur × Largeur (fond) + 2 × (Longueur + Largeur) × e (joues)
          const fond = p.longueur * p.largeur;
          const joues = 2 * (p.longueur + p.largeur) * p.epaisseur;
          surfTotal += (fond + joues) * nombre(p.nombre);
        });
      }

      if (l.blocs) {
        l.blocs.forEach(b => {
          if (!b.longueur || !b.largeur || !b.epaisseur) return;
          // Meme formule simplifiee que le palier
          const fond = b.longueur * b.largeur;
          const joues = 2 * (b.longueur + b.largeur) * b.epaisseur;
          surfTotal += (fond + joues) * nombre(b.nombre);
        });
      }
      
      return surfTotal * nombre(l.nombre);
    },
    traceCoffrage: (l) => {
      if (!l.mode || l.mode === 'volume') {
        const ratioDefaut = 12;
        return `Surface_coffrage = ${net(l.volume)} m³ × ${l.ratioCoffrage || ratioDefaut} m²/m³ × ${nombre(l.nombre)} = ${net((l.volume || 0) * (l.ratioCoffrage || ratioDefaut) * nombre(l.nombre))} m²`;
      }
      let details = [];
      if (l.volees) {
        l.volees.forEach((v, i) => {
          if (coteseManquantesVolee(v).length > 0) return;
          const { h, Ng, L, ePerp } = geometrieVolee(v);
          const fond = v.largeur * L;
          const joues = 2 * (L * ePerp);
          const contremarches = Ng * (v.largeur * h);
          details.push(`Volée ${i+1}: Fond=${net(fond, 2)}m² + Joues=${net(joues, 2)}m² + Contremarches=${net(contremarches, 2)}m² = ${net(fond + joues + contremarches, 2)}m²`);
        });
      }
      if (l.paliers) {
        l.paliers.forEach((p, i) => {
          if (!p.longueur || !p.largeur || !p.epaisseur) return;
          const fond = p.longueur * p.largeur;
          const joues = 2 * (p.longueur + p.largeur) * p.epaisseur;
          details.push(`Palier ${i+1}: Fond=${net(fond, 2)}m² + Joues=${net(joues, 2)}m² = ${net(fond + joues, 2)}m²`);
        });
      }
      if (l.blocs) {
        l.blocs.forEach((b, i) => {
          if (!b.longueur || !b.largeur || !b.epaisseur) return;
          const fond = b.longueur * b.largeur;
          const joues = 2 * (b.longueur + b.largeur) * b.epaisseur;
          details.push(`Bloc ${i+1}: Fond=${net(fond, 2)}m² + Joues=${net(joues, 2)}m² = ${net(fond + joues, 2)}m²`);
        });
      }
      return details.join('\n');
    },

    /**
     * Un escalier mal proportionne se monte quand meme : on avertit, on ne bloque pas.
     * Un plan cote en pouces (marche 6" = 0,152 m, giron 10" = 0,254 m) donne
     * 2h + g = 0,558 m et declenchera Blondel a juste titre.
     */
    valider: (l, regles) => {
      if (!l.mode || l.mode === 'volume') return [];
      const alertes = [];
      const arrondi = (x) => Math.round(x * 1000) / 1000;

      (l.volees || []).forEach((v, i) => {
        const repere = v.id || `Volée ${i + 1}`;
        const manquantes = coteseManquantesVolee(v);

        // Une volee incomplete etait ecartee du total sans un mot : le devis
        // sortait plus leger que le plan, et rien ne le disait.
        if (manquantes.length > 0) {
          if (Object.values(v || {}).some((x) => renseigne(Number(x)))) {
            alertes.push({
              type: 'dimension-manquante',
              message: `${repere} n'est pas comptée : ${manquantes.join(', ')} manquant(e).`,
            });
          }
          return;
        }

        const { h, g, L, ePerp } = geometrieVolee(v);
        const blondel = 2 * h + g;

        if (blondel < 0.60 || blondel > 0.65) {
          alertes.push({
            type: 'escalier-inconfortable',
            message: `${repere} : 2h + g = ${arrondi(blondel)} m (où h = H/n), hors de la plage de Blondel 0,60–0,65 m.`,
          });
        }
        if (h < 0.16 || h > 0.19) {
          alertes.push({
            type: 'escalier-hors-usage',
            message: `${repere} : hauteur de marche de ${arrondi(h)} m, inhabituelle (0,16–0,19 m).`,
          });
        }
        if (g < 0.25 || g > 0.32) {
          alertes.push({
            type: 'escalier-hors-usage',
            message: `${repere} : giron de ${arrondi(g)} m, inhabituel (0,25–0,32 m).`,
          });
        }
        if (ePerp < L / 30) {
          alertes.push({
            type: 'escalier-elancement',
            message: `${repere} : paillasse de ${arrondi(ePerp)} m pour ${arrondi(L)} m de portée — probablement trop mince, à faire vérifier.`,
          });
        }
      });

      // Recoupement du ferraillage par le ratio historique de 100 kg/m3.
      // L'ancien forfait ne sert plus a calculer, il sert a controler : un ratio
      // trop bas revele en general des chapeaux d'appui oublies.
      const volume = BLOCS.escalier.calcul(l);
      if (volume > 0) {
        const poids = extractionsArmatures.escalier(l, regles)
          .reduce((somme, a) => somme + (a.poids || 0), 0);
        const ratio = poids / volume;
        if (ratio < 70 || ratio > 130) {
          alertes.push({
            type: 'escalier-ratio-acier',
            message:
              `ferraillage à ${Math.round(ratio)} kg/m³, hors de la plage usuelle 70–130 kg/m³ ` +
              `(${arrondi(poids)} kg pour ${arrondi(volume)} m³).`,
          });
        }
      }

      return alertes;
    }
  },
  poteaux: { // Legacy pour rétrocompatibilité
    libelle: 'Colonnes (legacy)',
    unite: 'm3',
    requis: ['sectionA', 'sectionB', 'hauteur'],
    formule: 'N x (a/100) x (b/100) x H',
    calcul: (l) => nombre(l.nombre) * (l.sectionA / 100) * (l.sectionB / 100) * l.hauteur
  },

  // moellon est géré par calculerMoellon() — retiré du loop générique BLOCS

  // chapeEgalisation remplacée par dallages géré manuellement (comme moellon)
  
  remblai: {
    libelle: 'Remblai',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'L x l x Ep',
    calcul: (l) => l.longueur * l.largeur * l.epaisseur,
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.epaisseur, 2)}m (Ep) = ${net(l.longueur * l.largeur * l.epaisseur, 3)} m³`
  },

  sousPavement: {
    libelle: 'Béton de sous-pavement',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'L x l x Ep',
    calcul: (l) => l.longueur * l.largeur * l.epaisseur,
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.epaisseur, 2)}m (Ep) = ${net(l.longueur * l.largeur * l.epaisseur, 3)} m³`
  },

  poutres: {
    libelle: 'Poutres, chainages et linteaux',
    unite: 'm3',
    requis: ['largeurCm', 'hauteurCm', 'longueur'],
    formule: 'N x (larg/100) x (haut/100) x L',
    calcul: (l) =>
      nombre(l.nombre) * (l.largeurCm / 100) * (l.hauteurCm / 100) * l.longueur,
    trace: (l) => `Volume = ${nombre(l.nombre)} (N) × ${net(l.largeurCm / 100, 2)}m (larg) × ${net(l.hauteurCm / 100, 2)}m (haut) × ${net(l.longueur, 2)}m (L) = ${net(nombre(l.nombre) * (l.largeurCm / 100) * (l.hauteurCm / 100) * l.longueur, 3)} m³`,
    calculCoffrage: (l) => {
      const h = l.hauteurCm / 100;
      const larg = l.largeurCm / 100;
      const L = l.longueur;
      const s1 = h * larg * 2;
      const s2 = h * L * 2;
      const s3 = larg * L;
      return (s1 + s2 + s3) * nombre(l.nombre);
    },
    traceCoffrage: (l) => {
      const h = l.hauteurCm / 100;
      const larg = l.largeurCm / 100;
      const L = l.longueur;
      const s1 = net(h * larg * 2);
      const s2 = net(h * L * 2);
      const s3 = net(larg * L);
      return `S1 (Bouts) = ${h} × ${larg} × 2 = ${s1} m²\nS2 (Côtés) = ${h} × ${L} × 2 = ${s2} m²\nS3 (Sous-face) = ${larg} × ${L} = ${s3} m²\nSurface_coffrage = (${s1} + ${s2} + ${s3}) × ${nombre(l.nombre)} = ${net((s1 + s2 + s3) * nombre(l.nombre))} m²`;
    }
  },

  dalles: {
    libelle: 'Dalles pleines',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseurCm'],
    formule: 'L x l x (Ep/100) x N',
    calcul: (l) => l.longueur * l.largeur * (l.epaisseurCm / 100) * nombre(l.nombre),
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.epaisseurCm / 100, 3)}m (Ep) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * (l.epaisseurCm / 100) * nombre(l.nombre), 3)} m³`,
    calculCoffrage: (l) => l.longueur * l.largeur * 1.12 * nombre(l.nombre),
    traceCoffrage: (l) => l.methodeCoffrage === 'panneaux' 
      ? 'Calcul manuel du coffrage par panneaux' 
      : `Surface coffrage = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × 1.12 (Majoration joues) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * 1.12 * nombre(l.nombre), 2)} m²`
  },

  plancherHourdis: {
    libelle: 'Plancher Hourdis',
    unite: 'm2',
    requis: ['longueur', 'largeur'],
    formule: 'L x l x N',
    calcul: (l) => l.longueur * l.largeur * nombre(l.nombre),
    trace: (l) => `Surface = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * nombre(l.nombre), 2)} m²`
  },

  charpenteBois: {
    libelle: 'Charpente Bois',
    unite: 'm3',
    requis: ['longueur', 'portee', 'debord', 'faitage', 'ecartement', 'section', 'lignesPannes'],
    formule: 'Volume fermes + Volume pannes',
    calcul: (l) => {
      const nbreFermes = Math.ceil(l.longueur / l.ecartement + 1);
      const entrait = l.portee + 2 * l.debord;
      const arbaletrier = Math.sqrt(Math.pow(entrait / 2, 2) + Math.pow(l.faitage, 2));
      const longueurDeveloppeeFerme = (entrait + 2 * arbaletrier) * 1.15;
      const volumeFermes = nbreFermes * longueurDeveloppeeFerme * l.section * l.section;
      const pannes = l.lignesPannes * 2 * (l.longueur + 2 * l.debord) * l.section * l.section;
      return (volumeFermes + pannes) * nombre(l.nombre);
    },
    trace: (l) => {
      const nbreFermes = Math.ceil(l.longueur / l.ecartement + 1);
      const entrait = l.portee + 2 * l.debord;
      const arbaletrier = Math.sqrt(Math.pow(entrait / 2, 2) + Math.pow(l.faitage, 2));
      const longueurDeveloppeeFerme = (entrait + 2 * arbaletrier) * 1.15;
      const volumeFermes = nbreFermes * longueurDeveloppeeFerme * l.section * l.section;
      const pannes = l.lignesPannes * 2 * (l.longueur + 2 * l.debord) * l.section * l.section;
      return `Nbre Fermes = ArrondiSup(${net(l.longueur, 2)} / ${net(l.ecartement, 2)} + 1) = ${nbreFermes}\nL. Dév. Ferme = (${net(entrait, 2)} + 2×${net(arbaletrier, 2)}) × 1.15 = ${net(longueurDeveloppeeFerme, 2)} m\nVol. Fermes = ${nbreFermes} × ${net(longueurDeveloppeeFerme, 2)} × ${net(l.section, 3)}² = ${net(volumeFermes, 3)} m³\nVol. Pannes = ${l.lignesPannes} × 2 × (${net(l.longueur, 2)} + 2×${net(l.debord, 2)}) × ${net(l.section, 3)}² = ${net(pannes, 3)} m³\nVolume Total = (${net(volumeFermes, 3)} + ${net(pannes, 3)}) × ${nombre(l.nombre)} = ${net((volumeFermes + pannes) * nombre(l.nombre), 3)} m³`;
    }
  },

  couvertureToles: {
    libelle: 'Couverture en Tôles',
    unite: 'm2',
    requis: ['longueur', 'portee', 'debord'],
    formule: '(L + 2*debord) x (portee + 2*debord)',
    calcul: (l) => (l.longueur + 2 * l.debord) * (l.portee + 2 * l.debord) * nombre(l.nombre),
    trace: (l) => `Surface = (${net(l.longueur, 2)} + 2×${net(l.debord, 2)}) × (${net(l.portee, 2)} + 2×${net(l.debord, 2)}) × ${nombre(l.nombre)} (N) = ${net((l.longueur + 2 * l.debord) * (l.portee + 2 * l.debord) * nombre(l.nombre), 2)} m²`
  },

  acrotere: {
    libelle: 'Chaînage Acrotère',
    unite: 'm3',
    requis: ['perimetre', 'largeur', 'hauteur'],
    formule: 'Perimetre x l x H',
    calcul: (l) => l.perimetre * l.largeur * l.hauteur * nombre(l.nombre),
    trace: (l) => `Volume = ${net(l.perimetre, 2)}m (P) × ${net(l.largeur, 2)}m (l) × ${net(l.hauteur, 2)}m (H) × ${nombre(l.nombre)} (N) = ${net(l.perimetre * l.largeur * l.hauteur * nombre(l.nombre), 3)} m³`,
    // La maconnerie de l'acrotere monte sur sa propre hauteur, pas sur celle
    // du chainage : les confondre sous-estimait la surface d'un facteur 4.
    calculSurfaceMac: (l) =>
      l.perimetre * (renseigne(l.hauteurAcrotere) ? l.hauteurAcrotere : l.hauteur) * nombre(l.nombre)
  },

  formePente: {
    libelle: 'Forme de pente',
    unite: 'm2',
    requis: ['longueur', 'largeur'],
    formule: 'L x l',
    calcul: (l) => l.longueur * l.largeur * nombre(l.nombre),
    trace: (l) => `Surface = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.largeur * nombre(l.nombre), 2)} m²`
  },

  enduits: {
    libelle: 'Enduits',
    unite: 'm2',
    requis: ['surface'],
    requisAlternatifs: [['longueur', 'hauteur']],
    // NB : les ouvertures ne sont pas deduites, conformement au classeur.
    // Les deduire est defendable, mais c'est une decision de metre, pas une correction.
    formule: 'Surface x N, ou L x H x N',
    calcul: (l) =>
      renseigne(l.surface)
        ? Number(l.surface) * nombre(l.nombre)
        : l.longueur * l.hauteur * nombre(l.nombre),
    trace: (l) => renseigne(l.surface) 
        ? `Surface = ${net(l.surface, 2)}m² × ${nombre(l.nombre)} (N) = ${net(Number(l.surface) * nombre(l.nombre), 2)} m²` 
        : `Surface = ${net(l.longueur, 2)}m (L) × ${net(l.hauteur, 2)}m (H) × ${nombre(l.nombre)} (N) = ${net(l.longueur * l.hauteur * nombre(l.nombre), 2)} m²`
  },

  nivellement: {
    libelle: 'Nivellement de l\'emprise',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'L x l x Ep',
    calcul: (l) => l.longueur * l.largeur * l.epaisseur,
    trace: (l) => `Volume = ${net(l.longueur, 2)}m (L) × ${net(l.largeur, 2)}m (l) × ${net(l.epaisseur, 2)}m (Ep) = ${net(l.longueur * l.largeur * l.epaisseur, 3)} m³`
  },
};

/** Champs de dimension connus, pour reperer une saisie orpheline. */
const CHAMPS_DIMENSION = [
  'longueur',
  'largeur',
  'hauteur',
  'profondeur',
  'epaisseur',
  'epaisseurCm',
  'sectionA',
  'sectionB',
  'largeurCm',
  'hauteurCm',
  'perimetre',
  'largeurBase',
  'volume',
  'diametre'
];

/**
 * Calcule une ligne d'un bloc standard.
 * @returns {{valeur: number|null, unite: string, trace: object, manquants: string[]}}
 */
function calculerLigne(bloc, ligne, regles, saisie) {
  const manquants = champsRequisEffectifs(bloc, ligne).filter((champ) => !renseigne(ligne[champ]));

  if (manquants.length > 0) {
    return {
      valeur: null,
      unite: bloc.unite,
      manquants,
      trace: {
        formule: typeof bloc.formule === 'function' ? bloc.formule(ligne) : bloc.formule,
        entrees: {},
        resultat: null,
        unite: bloc.unite,
        motif: `Dimension manquante : ${manquants.join(', ')}`,
      },
    };
  }

  const entrees = { nombre: nombre(ligne.nombre) };
  const champs = champsRequisEffectifs(bloc, ligne);
  for (const champ of champs) {
    if (champ !== 'nombre') entrees[champ] = ligne[champ];
  }

  const valeur = net(bloc.calcul(ligne, regles, saisie));
  const res = {
    valeur,
    unite: bloc.unite,
    manquants: [],
    trace: { formule: typeof bloc.formule === 'function' ? bloc.formule(ligne) : bloc.formule, entrees, resultat: valeur, unite: bloc.unite },
  };

  if (typeof bloc.trace === 'function') {
    res.trace.calcul = bloc.trace(ligne, regles, saisie);
  }
  
  if (bloc.calculCoffrage) {
    res.surfaceCoffrage = net(bloc.calculCoffrage(ligne, regles, saisie));
    const typeSurface = (bloc === BLOCS.dalles) ? (ligne.methodeCoffrage === 'panneaux' ? 'Détail Panneaux' : 'Hypothèse (Ratio)') : 'Géométrique';
    const traceSurfaceText = bloc.traceCoffrage ? bloc.traceCoffrage(ligne, regles) : null;
    
    const options = { surface: res.surfaceCoffrage, typeSurface, traceSurfaceText };
    
    if (bloc === BLOCS.dalles && ligne.methodeCoffrage === 'panneaux') {
      options.dalleOptions = {
        methode: 'panneaux',
        longueur: ligne.longueur,
        largeur: ligne.largeur,
        epaisseurCm: ligne.epaisseurCm,
        panneaux: ligne.panneaux,
        traceSurfaceText
      };
    }
    
    res.coffrage = calculerCoffrage(options);
  } else {
    // Repli : Par ratio
    let ratio = null;
    if (bloc === BLOCS.escalier) ratio = 12; // 12 m2 par m3
    else if (bloc === BLOCS.poteaux) ratio = PARAMETRES.ratiosCoffrage.colonne;
    else if (bloc === BLOCS.poutres) ratio = PARAMETRES.ratiosCoffrage.poutre;
    
    if (ratio && res.valeur) {
      res.surfaceCoffrage = net(res.valeur * ratio);
      res.coffrage = calculerCoffrage({ surface: res.surfaceCoffrage, typeSurface: 'Hypothèse (Ratio)' });
    }
  }
  
  if (bloc.calculBrut) res.volumeBrut = net(bloc.calculBrut(ligne, regles, saisie));
  if (bloc.calculSurfaceMac) res.surfaceMac = net(bloc.calculSurfaceMac(ligne, regles, saisie));
  
  if (ligne.dosage) res.dosage = ligne.dosage;
  if (ligne.cimentType) res.cimentType = ligne.cimentType;
  
  return res;
}

/**
 * Fonctions pour extraire les armatures de chaque type d'ouvrage
 */
const extractionsArmatures = {
  poteaux: (l, regles) => {
    if (!l.hauteur || !l.sectionA || !l.sectionB) return [];
    const h = acierHyp(regles, 'poteaux');
    const dPrin = l.diametrePrin || h.diametrePrin || 12;
    const dCadre = l.diametreCadre || h.diametreCadre || 8;
    const nbreBarresPrin = l.nbreBarresPrin || h.nbreBarresPrin || 4;
    const espacement = l.espacementCadre || h.espacementCadre || 0.15;

    const n = nombre(l.nombre);
    const enrobage = PARAMETRES.armatures.enrobage;

    return [
      calculerBlocArmature({
        designation: 'Principale',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: n * nbreBarresPrin,
        longueurDeveloppee: l.hauteur - 2 * enrobage + calculerRecouvrement(dPrin, PARAMETRES.nuancePrincipaleParDefaut),
        espacement: null,
        overrides: l.overrides_prin
      }),
      calculerBlocArmature({
        designation: 'Cadre',
        diametre: dCadre,
        nuance: PARAMETRES.nuanceCadresParDefaut,
        nombreDeFilesTotal: n * (Math.ceil(l.hauteur / espacement) + 1),
        longueurDeveloppee: (((l.sectionA / 100) - 2 * enrobage) + ((l.sectionB / 100) - 2 * enrobage)) * 2,
        espacement,
        overrides: l.overrides_cadre
      })
    ];
  },
  semelles: (l, regles) => {
    if (!l.longueur || !l.largeur) return [];
    
    const h = acierHyp(regles, 'semelles');
    const dPrinL = l.diametrePrinL || h.diametrePrinL || l.diametrePrin || h.diametrePrin || 10;
    const espacementL = l.espacementL || h.espacementL || l.espacement || h.espacement || 0.15;
    
    const dPrinLarg = l.diametrePrinLarg || h.diametrePrinLarg || l.diametrePrin || h.diametrePrin || 10;
    const espacementLarg = l.espacementLarg || h.espacementLarg || l.espacement || h.espacement || 0.15;
    
    const n = nombre(l.nombre);
    const enrobage = l.enrobage !== undefined ? l.enrobage : PARAMETRES.armatures.enrobage;

    const lignes = [];

    // 1. Maillage Sens Longueur (L)
    const largeurUtileL = l.largeur - 2 * enrobage;
    const nbreBarresL = Math.ceil(largeurUtileL / espacementL) + 1;
    let lbarre1 = l.longueur - 2 * enrobage;
    const typeBarreL = l.typeBarreL || '2_crochets';
    const LcL = l.LcL !== undefined ? l.LcL : PARAMETRES.armatures.crochet;
    let calcLbarre1 = `${net(l.longueur)} - 2×${enrobage}`;
    if (typeBarreL === '1_crochet') { lbarre1 += LcL; calcLbarre1 += ` + ${LcL}`; }
    else if (typeBarreL === '2_crochets') { lbarre1 += 2 * LcL; calcLbarre1 += ` + 2×${LcL}`; }

    lignes.push(calculerBlocArmature({
      designation: 'Nappe sens Longueur (L)',
      diametre: dPrinL,
      nuance: PARAMETRES.nuancePrincipaleParDefaut,
      nombreDeFilesTotal: nbreBarresL * n,
      longueurDeveloppee: lbarre1,
      espacement: espacementL,
      overrides: l.overrides_nappeL,
      tracePrefix: `Nbre barres par semelle = ceil((${net(l.largeur)} - 2×${enrobage}) / ${espacementL}) + 1 = ${nbreBarresL} pièces\nNbre Total = ${nbreBarresL} × ${n} semelles = ${nbreBarresL * n} pièces\nL_barre = ${calcLbarre1} = ${net(lbarre1)} m`,
      traceFormule: 'L_barre = L - 2c + crochets'
    }));

    // 2. Maillage Sens Largeur (l)
    const largeurUtileLarg = l.longueur - 2 * enrobage;
    const nbreBarresLarg = Math.ceil(largeurUtileLarg / espacementLarg) + 1;
    let lbarre2 = l.largeur - 2 * enrobage;
    const typeBarreLarg = l.typeBarreLarg || '2_crochets';
    const LcLarg = l.LcLarg !== undefined ? l.LcLarg : PARAMETRES.armatures.crochet;
    let calcLbarre2 = `${net(l.largeur)} - 2×${enrobage}`;
    if (typeBarreLarg === '1_crochet') { lbarre2 += LcLarg; calcLbarre2 += ` + ${LcLarg}`; }
    else if (typeBarreLarg === '2_crochets') { lbarre2 += 2 * LcLarg; calcLbarre2 += ` + 2×${LcLarg}`; }

    lignes.push(calculerBlocArmature({
      designation: 'Nappe sens Largeur (l)',
      diametre: dPrinLarg,
      nuance: PARAMETRES.nuancePrincipaleParDefaut,
      nombreDeFilesTotal: nbreBarresLarg * n,
      longueurDeveloppee: lbarre2,
      espacement: espacementLarg,
      overrides: l.overrides_nappel,
      tracePrefix: `Nbre barres par semelle = ceil((${net(l.longueur)} - 2×${enrobage}) / ${espacementLarg}) + 1 = ${nbreBarresLarg} pièces\nNbre Total = ${nbreBarresLarg} × ${n} semelles = ${nbreBarresLarg * n} pièces\nL_barre = ${calcLbarre2} = ${net(lbarre2)} m`,
      traceFormule: 'L_barre = l - 2c + crochets'
    }));

    // Amorce saisie DANS la semelle (format historique, voir
    // _volumeAmorceIntegree). Son beton est deja repris ; son acier doit
    // l'etre aussi, sinon un projet enregistre avant la separation des blocs
    // sort avec le beton de ses amorces mais sans leur ferraillage.
    if (l.amorceSectionA && l.amorceSectionB && l.amorceHauteur) {
      const sectionA = l.amorceSectionA / 100;
      const sectionB = l.amorceSectionB / 100;
      const dPrinAmorce = l.amorceDiametrePrin || 10;
      const nbBarresAmorce = l.amorceNbreBarresPrin || 4;
      const dCadreAmorce = l.amorceDiametreCadre || 8;
      const espCadreAmorce = l.amorceEspacementCadre || 0.15;
      const LaAmorce = calculerRecouvrement(dPrinAmorce, PARAMETRES.nuancePrincipaleParDefaut);

      // v7 Fondation!D52 : Ld = hauteur amorce + hauteur semelle + recouvrement.
      // La barre ne s'arrete pas au pied de l'amorce, elle plonge dans la
      // semelle — d'ou la hauteur de semelle dans la longueur developpee.
      const ldAmorce = l.amorceHauteur + l.hauteur + LaAmorce;
      lignes.push(calculerBlocArmature({
        designation: 'Amorce Principale',
        diametre: dPrinAmorce,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbBarresAmorce * n,
        longueurDeveloppee: ldAmorce,
        espacement: null,
        tracePrefix: `Nbre barres par amorce = ${nbBarresAmorce} pièces\nNbre Total = ${nbBarresAmorce} × ${n} amorces = ${nbBarresAmorce * n} pièces\nL_barre = H_amorce + H_semelle + La = ${net(l.amorceHauteur)} + ${net(l.hauteur)} + ${net(LaAmorce)} = ${net(ldAmorce)} m`,
        traceFormule: 'L_barre = H_amorce + H_semelle + La'
      }));

      const nbEtriers = Math.ceil(l.amorceHauteur / espCadreAmorce) + 1;
      const ldEtrier = ((sectionA - 2 * enrobage) + (sectionB - 2 * enrobage)) * 2;
      lignes.push(calculerBlocArmature({
        designation: 'Cadre Amorce',
        diametre: dCadreAmorce,
        nuance: PARAMETRES.nuanceCadresParDefaut || PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbEtriers * n,
        longueurDeveloppee: ldEtrier,
        espacement: espCadreAmorce,
        tracePrefix: `Nbre étriers par amorce = ceil(${net(l.amorceHauteur)} / ${espCadreAmorce}) + 1 = ${nbEtriers} pièces\nNbre Total = ${nbEtriers} × ${n} amorces = ${nbEtriers * n} pièces\nL_étrier = 2×[(${net(sectionA)} - 2×${enrobage}) + (${net(sectionB)} - 2×${enrobage})] = ${net(ldEtrier)} m`,
        traceFormule: 'L_étrier = 2 × [(a - 2c) + (b - 2c)]'
      }));
    }

    return lignes;
  },
  amorces: (l, regles) => {
    if (!l.longueur || !l.largeur || !l.hauteur) return [];
    const h = acierHyp(regles, 'amorces');
    
    const dPrin1 = l.diametrePrin1 || l.diametrePrin || h.diametrePrin1 || h.diametrePrin || 10;
    const nbreBarresPrin1 = l.nbreBarresPrin1 !== undefined ? l.nbreBarresPrin1 : (l.nbreBarresPrin || h.nbreBarresPrin1 || h.nbreBarresPrin || 4);
    
    const nbreBarresPrin2 = l.nbreBarresPrin2 || h.nbreBarresPrin2 || 0;
    const dPrin2 = l.diametrePrin2 || h.diametrePrin2 || 10;
    
    const dCadre = l.diametreCadre || h.diametreCadre || 8;
    const espacement = l.espacementCadre || h.espacementCadre || 0.15;

    const n = nombre(l.nombre);
    const enrobage = l.enrobage !== undefined ? l.enrobage : PARAMETRES.armatures.enrobage;

    // Détermination de La (longueur d'ancrage)
    let La = 0;
    const strLa = String(l.La || '40D');
    if (strLa.endsWith('D')) {
      const coef = parseInt(strLa.replace('D', ''), 10);
      La = (coef * Math.max(dPrin1, dPrin2)) / 1000;
    } else {
      La = Number(strLa);
    }

    const LcCadre = l.LcCadre !== undefined ? l.LcCadre : 0;
    const bint = l.largeur - 2 * enrobage;
    const hint = l.longueur - 2 * enrobage;
    const LcEtrier = 2 * (bint + hint) + 2 * LcCadre;

    const lignesAciers = [];

    if (nbreBarresPrin1 > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Amorce Principale 1',
        diametre: dPrin1,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresPrin1 * n,
        longueurDeveloppee: l.hauteur - 2 * enrobage + La,
        espacement: null,
        overrides: l.overrides_prin1 || l.overrides_prin,
        tracePrefix: `Nbre barres par amorce = ${nbreBarresPrin1} pièces\nNbre Total = ${nbreBarresPrin1} pièces × ${n} amorces = ${nbreBarresPrin1 * n} pièces\nL_barre = H - 2×enrobage + La = ${net(l.hauteur)} - 2×${net(enrobage)} + ${net(La)} = ${net(l.hauteur - 2 * enrobage + La)} m`,
        traceFormule: 'L_barre = H + La'
      }));
    }

    if (nbreBarresPrin2 > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Amorce Principale 2',
        diametre: dPrin2,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresPrin2 * n,
        longueurDeveloppee: l.hauteur - 2 * enrobage + La,
        espacement: null,
        overrides: l.overrides_prin2,
        tracePrefix: `Nbre barres par amorce = ${nbreBarresPrin2} pièces\nNbre Total = ${nbreBarresPrin2} pièces × ${n} amorces = ${nbreBarresPrin2 * n} pièces\nL_barre = H - 2×enrobage + La = ${net(l.hauteur)} - 2×${net(enrobage)} + ${net(La)} = ${net(l.hauteur - 2 * enrobage + La)} m`,
        traceFormule: 'L_barre = H + La'
      }));
    }

    const nbreEtriers = Math.ceil(l.hauteur / espacement) + 1;
    lignesAciers.push(calculerBlocArmature({
      designation: 'Cadre Amorce',
      diametre: dCadre,
      nuance: PARAMETRES.nuanceCadresParDefaut,
      nombreDeFilesTotal: nbreEtriers * n,
      longueurDeveloppee: LcEtrier,
      espacement,
      overrides: l.overrides_cadre,
      tracePrefix: `Nbre Étriers par amorce = ceil(${net(l.hauteur)} / ${espacement}) + 1 = ${nbreEtriers} pièces\nNbre Total = ${nbreEtriers} × ${n} amorces = ${nbreEtriers * n} pièces\nL_étrier = 2×[(${net(l.largeur)} - 2×${enrobage}) + (${net(l.longueur)} - 2×${enrobage})] + 2×${LcCadre}\nL_étrier = 2×(${net(bint)} + ${net(hint)}) + 2×${LcCadre} = ${net(LcEtrier)} m`,
      traceFormule: 'L_étrier = 2×(L - 2c + l - 2c) + 2×crochet'
    }));

    return lignesAciers;
  },
  longrines: (l, regles, hypKey = 'longrines') => {
    if (!l.perimetre || !l.largeur || !l.hauteur) return [];
    const h = acierHyp(regles, hypKey);
    
    // Paramètres globaux
    const enrobage = l.enrobage !== undefined ? l.enrobage : PARAMETRES.armatures.enrobage;
    const LcCadre = l.LcCadre !== undefined ? l.LcCadre : PARAMETRES.armatures.LcCadre;
    
    const dPrin = l.diametrePrin || h.diametrePrin || 12;
    const nbreBarresPrin = l.nbreBarresPrin || h.nbreBarresPrin || 4;
    
    const dPrin2 = l.diametrePrin2 || 10;
    const nbreBarresPrin2 = l.nbreBarresPrin2 || 0;
    
    const dPeau = l.diametrePeau || 8;
    const nbreBarresPeau = l.nbreBarresPeau || 0;
    
    const dChapeau = l.diametreChapeau || 10;
    const nbreBarresChapeau = l.nbreBarresChapeau || 0;
    const longueurChapeau = Number(l.longueurChapeau) || 0;
    
    const dRenfort = l.diametreRenfort || 12;
    const nbreBarresRenfort = l.nbreBarresRenfort || 0;
    const longueurRenfort = Number(l.longueurRenfort) || 0;
    
    const dCadre = l.diametreCadre || h.diametreCadre || 6;
    const espacement = l.espacementCadre || h.espacementCadre || 0.20;

    const bint = l.largeur - 2 * enrobage;
    const hint = l.hauteur - 2 * enrobage;
    const LcEtrier = 2 * (bint + hint) + 2 * LcCadre;

    const lignesAciers = [];

    lignesAciers.push(calculerBlocArmature({
      designation: 'Principale 1',
      diametre: dPrin,
      nuance: PARAMETRES.nuancePrincipaleParDefaut,
      nombreDeFilesTotal: nbreBarresPrin,
      longueurDeveloppee: l.perimetre,
      espacement: null,
      overrides: l.overrides_prin,
      tracePrefix: `Nbre barres principales = ${nbreBarresPrin} pièces\nL_barre = Périmètre = ${net(l.perimetre)} m`,
      traceFormule: 'L_barre = Périmètre'
    }));
    
    if (nbreBarresPrin2 > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Principale 2',
        diametre: dPrin2,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresPrin2,
        longueurDeveloppee: l.perimetre,
        espacement: null,
        overrides: l.overrides_prin2,
        tracePrefix: `Nbre barres principales 2 = ${nbreBarresPrin2} pièces\nL_barre = Périmètre = ${net(l.perimetre)} m`,
        traceFormule: 'L_barre = Périmètre'
      }));
    }
    
    if (nbreBarresPeau > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Armatures de Peau',
        diametre: dPeau,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresPeau,
        longueurDeveloppee: l.perimetre,
        espacement: null,
        overrides: l.overrides_peau,
        tracePrefix: `Nbre barres de peau = ${nbreBarresPeau} pièces\nL_barre = Périmètre = ${net(l.perimetre)} m`,
        traceFormule: 'L_barre = Périmètre'
      }));
    }
    
    if (nbreBarresChapeau > 0 && longueurChapeau > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Chapeaux',
        diametre: dChapeau,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresChapeau,
        longueurDeveloppee: longueurChapeau,
        espacement: null,
        overrides: l.overrides_chapeau,
        tracePrefix: `Nbre barres de chapeau = ${nbreBarresChapeau} pièces\nL_barre saisie = ${net(longueurChapeau)} m`,
        traceFormule: 'L_barre = Saisie manuelle'
      }));
    }
    
    if (nbreBarresRenfort > 0 && longueurRenfort > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Renforts',
        diametre: dRenfort,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresRenfort,
        longueurDeveloppee: longueurRenfort,
        espacement: null,
        overrides: l.overrides_renfort,
        tracePrefix: `Nbre barres de renfort = ${nbreBarresRenfort} pièces\nL_barre saisie = ${net(longueurRenfort)} m`,
        traceFormule: 'L_barre = Saisie manuelle'
      }));
    }

    const nbreEtriers = Math.ceil(l.perimetre / espacement) + 1;
    lignesAciers.push(calculerBlocArmature({
      designation: 'Cadre',
      diametre: dCadre,
      nuance: PARAMETRES.nuanceCadresParDefaut,
      nombreDeFilesTotal: nbreEtriers,
      longueurDeveloppee: LcEtrier,
      espacement,
      overrides: l.overrides_cadre,
      tracePrefix: `Nbre Étriers total = ceil(${net(l.perimetre)} / ${espacement}) + 1 = ${nbreEtriers} pièces\nL_étrier = 2×[(${net(l.largeur)} - 2×${enrobage}) + (${net(l.hauteur)} - 2×${enrobage})] + 2×${LcCadre}\nL_étrier = 2×(${net(bint)} + ${net(hint)}) + 2×${LcCadre} = ${net(LcEtrier)} m`,
      traceFormule: 'L_étrier = 2×(L - 2c + l - 2c) + 2×crochet'
    }));

    return lignesAciers;
  },
  colonnes: (l, regles) => {
    const circulaire = l.forme === 'circulaire';
    if (circulaire ? (!l.diametre || !l.hauteur) : (!l.longueur || !l.largeur || !l.hauteur)) return [];
    const h = acierHyp(regles, 'colonnes');
    
    const dPrin1 = l.diametrePrin1 || l.diametrePrin || h.diametrePrin1 || h.diametrePrin || 12;
    const nbreBarresPrin1 = l.nbreBarresPrin1 !== undefined ? l.nbreBarresPrin1 : (l.nbreBarresPrin || h.nbreBarresPrin1 || h.nbreBarresPrin || 4);
    
    const nbreBarresPrin2 = l.nbreBarresPrin2 || h.nbreBarresPrin2 || 0;
    const dPrin2 = l.diametrePrin2 || h.diametrePrin2 || 10;
    
    const dCadre = l.diametreCadre || h.diametreCadre || 8;
    const espacement = l.espacementCadre || h.espacementCadre || 0.15;

    const n = nombre(l.nombre);
    const enrobage = l.enrobage !== undefined ? l.enrobage : PARAMETRES.armatures.enrobage;

    // Détermination de La (longueur d'ancrage)
    let La = 0;
    const strLa = String(l.La || '40D');
    if (strLa.endsWith('D')) {
      const coef = parseInt(strLa.replace('D', ''), 10);
      La = (coef * Math.max(dPrin1, dPrin2)) / 1000;
    } else {
      La = Number(strLa);
    }

    const LcCadre = l.LcCadre !== undefined ? l.LcCadre : 0;
    
    let LcEtrier = 0;
    if (circulaire) {
      LcEtrier = Math.PI * (l.diametre - 2 * enrobage);
    } else {
      const bint = l.largeur - 2 * enrobage;
      const hint = l.longueur - 2 * enrobage;
      LcEtrier = 2 * (bint + hint) + 2 * LcCadre;
    }

    const lignesAciers = [];

    if (nbreBarresPrin1 > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Principale 1',
        diametre: dPrin1,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresPrin1 * n,
        longueurDeveloppee: l.hauteur - 2 * enrobage + La,
        espacement: null,
        overrides: l.overrides_prin1 || l.overrides_prin,
        tracePrefix: `Nbre barres par colonne = ${nbreBarresPrin1} pièces\nNbre Total = ${nbreBarresPrin1} pièces × ${n} colonnes = ${nbreBarresPrin1 * n} pièces\nL_barre = H - 2×enrobage + La = ${net(l.hauteur)} - 2×${net(enrobage)} + ${net(La)} = ${net(l.hauteur - 2 * enrobage + La)} m`,
        traceFormule: 'L_barre = H + La'
      }));
    }

    if (nbreBarresPrin2 > 0) {
      lignesAciers.push(calculerBlocArmature({
        designation: 'Principale 2',
        diametre: dPrin2,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresPrin2 * n,
        longueurDeveloppee: l.hauteur - 2 * enrobage + La,
        espacement: null,
        overrides: l.overrides_prin2,
        tracePrefix: `Nbre barres par colonne = ${nbreBarresPrin2} pièces\nNbre Total = ${nbreBarresPrin2} pièces × ${n} colonnes = ${nbreBarresPrin2 * n} pièces\nL_barre = H - 2×enrobage + La = ${net(l.hauteur)} - 2×${net(enrobage)} + ${net(La)} = ${net(l.hauteur - 2 * enrobage + La)} m`,
        traceFormule: 'L_barre = H + La'
      }));
    }

    const nbreEtriers = Math.ceil(l.hauteur / espacement) + 1;
    lignesAciers.push(calculerBlocArmature({
      designation: circulaire ? 'Frette (spirale)' : 'Cadre Colonne',
      diametre: dCadre,
      nuance: PARAMETRES.nuanceCadresParDefaut,
      nombreDeFilesTotal: nbreEtriers * n,
      longueurDeveloppee: LcEtrier,
      espacement,
      overrides: l.overrides_cadre,
      tracePrefix: `Nbre Étriers par colonne = ceil(${net(l.hauteur)} / ${espacement}) + 1 = ${nbreEtriers} pièces\nNbre Total = ${nbreEtriers} × ${n} colonnes = ${nbreEtriers * n} pièces\nL_étrier = ${net(LcEtrier)} m`,
      traceFormule: circulaire ? 'L_étrier = π × (D - 2c)' : 'L_étrier = 2×(L - 2c + l - 2c) + 2×crochet'
    }));

    return lignesAciers;
  },
  ceintures: (l, regles) => {
    return extractionsArmatures.longrines(l, regles, 'ceintures');
  },
  linteaux: (l, regles) => {
    const lMapped = { ...l, perimetre: l.longueur || l.perimetre };
    return extractionsArmatures.longrines(lMapped, regles, 'linteaux');
  },
  dalles: (l, regles) => {
    if (!l.longueur || !l.largeur) {
       return null; // Will trigger a warning inside calculerMetre if we want, but let's just return empty and the main calc warns
    }
    const h = acierHyp(regles, 'dallePleine') || {};
    const dPrin = l.diametrePrin || h.diametrePrin || 10;
    const espacement = l.espacement || h.espacement || 0.15;
    const enrobage = PARAMETRES.armatures.enrobage;
    
    // Nappe suivant L
    const filesNappeL = Math.ceil(l.largeur / espacement + 1);
    const ldNappeL = l.longueur - 2 * enrobage;
    
    // Nappe suivant l
    const filesNappel = Math.ceil(l.longueur / espacement + 1);
    const ldNappel = l.largeur - 2 * enrobage;
    
    if (ldNappeL <= 0 || ldNappel <= 0) return null;

    const n = nombre(l.nombre);

    return [
      calculerBlocArmature({
        designation: 'Nappe suivant L',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: filesNappeL * n,
        longueurDeveloppee: ldNappeL,
        espacement,
        overrides: { Ls: 0, ...l.overrides_nappeL }
      }),
      calculerBlocArmature({
        designation: 'Nappe suivant l',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: filesNappel * n,
        longueurDeveloppee: ldNappel,
        espacement,
        overrides: { Ls: 0, ...l.overrides_nappel }
      })
    ];
  },
  escalier: (l, regles) => {
    // Mode ratio historique
    if (!l.mode || l.mode === 'volume') {
      if (!l.volume) return [];
      const ratio = l.ratioAcier || 100; // 100 kg/m3 par defaut
      const poidsTotal = l.volume * ratio;
      const dPrin = l.diametrePrin || 10;
      const nuance = PARAMETRES.nuancePrincipaleParDefaut;
      const pdsL = poidsAuMetre(dPrin);
      if (!pdsL) return []; 
      const longueurCommerciale = 12;
      const nbBarresEquivalentes = Math.ceil(poidsTotal / (longueurCommerciale * pdsL));
      return [{
        repere: l.repere || l.id || 'Escalier',
        designation: 'Acier Paillasse (Ratio)',
        diametre: dPrin,
        nuance: nuance,
        espacement: null,
        nombreDeFiles: nbBarresEquivalentes,
        longueurDeveloppee: longueurCommerciale,
        recouvrement: 0,
        nombreBarres12m: nbBarresEquivalentes,
        poids: poidsTotal,
        trace: {
          formule: "Poids = Volume * Ratio ; Barres = Poids / (12 * pdsAuMetre)",
          entrees: { volume: l.volume, ratio, dPrin },
          resultat: poidsTotal,
          unite: 'kg'
        },
        overrides: {}
      }];
    }

    // Mode géométrie complet
    const h = acierHyp(regles, 'escalier');
    const enrobage = PARAMETRES.armatures.enrobage;
    const crochet = PARAMETRES.armatures.crochet;
    // Escaliers identiques : le beton et le coffrage etaient multiplies par ce
    // nombre, l'acier ne l'etait pas. Deux escaliers sortaient avec deux fois
    // le beton et une seule fois le ferraillage.
    const n = nombre(l.nombre);

    let aciers = [];

    if (l.volees) {
      l.volees.forEach((v, i) => {
        if (coteseManquantesVolee(v).length > 0) return;
        const { L: L_inclinee } = geometrieVolee(v);

        // Les defauts se completent, ils ne se remplacent pas : un ferraillage
        // saisi partiellement (« Ø14 » sans espacement) doit garder l'espacement
        // par defaut, et non repartir sans valeur.
        const f = v.ferraillage || {};
        const p_prin = { diametre: h.diametrePrin || 12, espacement: h.espacement || 0.15, ...f.principales };
        const p_rep = { diametre: h.diametreRepartition || 8, espacement: h.espacementRepartition || 0.20, ...f.repartition };
        // Chapeaux : diametre propre, jamais celui des principales. Les heriter
        // faisait sortir du Ø12 la ou le ferraillage de reference pose du Ø10,
        // soit 6,3 kg de trop par escalier.
        const p_chap = { actif: true, diametre: h.diametreChapeaux || 10, espacement: h.espacementChapeaux || 0.15, longueurAppui: null, ...f.chapeaux };
        const p_repsup = { actif: true, diametre: h.diametreRepartition || 8, espacement: h.espacementRepartition || 0.20, ...f.repartitionSup };

        const prefix = v.id || `V${i+1}`;

        // 1. Principales (inférieures) : sens L, compte sur largeur
        aciers.push(calculerBlocArmature({
          designation: `${prefix} - Principales inf.`,
          diametre: p_prin.diametre,
          nuance: PARAMETRES.nuancePrincipaleParDefaut,
          nombreDeFilesTotal: (Math.ceil(v.largeur / p_prin.espacement) + 1) * n,
          longueurDeveloppee: L_inclinee - 2 * enrobage + 2 * crochet,
          espacement: p_prin.espacement,
          overrides: v.overrides_prin || {}
        }));

        // 2. Répartition (inférieure) : sens largeur, compte sur L
        aciers.push(calculerBlocArmature({
          designation: `${prefix} - Répartition inf.`,
          diametre: p_rep.diametre,
          nuance: PARAMETRES.nuancePrincipaleParDefaut,
          nombreDeFilesTotal: (Math.ceil(L_inclinee / p_rep.espacement) + 1) * n,
          longueurDeveloppee: v.largeur - 2 * enrobage + 2 * crochet,
          espacement: p_rep.espacement,
          overrides: v.overrides_rep || {}
        }));

        // 3. Chapeaux
        if (p_chap.actif !== false) {
          const l_chapeau = (p_chap.longueurAppui !== null && p_chap.longueurAppui !== undefined) ? p_chap.longueurAppui : (L_inclinee / 5 + 0.40);
          aciers.push(calculerBlocArmature({
            designation: `${prefix} - Chapeaux appuis`,
            diametre: p_chap.diametre,
            nuance: PARAMETRES.nuancePrincipaleParDefaut,
            nombreDeFilesTotal: (Math.ceil(v.largeur / p_chap.espacement) + 1) * 2 * n, // 2 appuis (haut et bas)
            longueurDeveloppee: l_chapeau,
            espacement: p_chap.espacement,
            overrides: v.overrides_chapeaux || {}
          }));

          // 4. Répartition Supérieure (liée aux chapeaux)
          if (p_repsup.actif !== false) {
            aciers.push(calculerBlocArmature({
              designation: `${prefix} - Répartition sup.`,
              diametre: p_repsup.diametre,
              nuance: PARAMETRES.nuancePrincipaleParDefaut,
              nombreDeFilesTotal: (Math.ceil(2 * l_chapeau / p_repsup.espacement) + 1) * n,
              longueurDeveloppee: v.largeur - 2 * enrobage + 2 * crochet,
              espacement: p_repsup.espacement,
              overrides: v.overrides_repsup || {}
            }));
          }
        }
      });
    }

    if (l.paliers) {
      l.paliers.forEach((p, i) => {
        if (!p.longueur || !p.largeur) return;
        const f = p.ferraillage || { diametre: h.diametrePrin || 10, espacement: h.espacement || 0.15 };
        const prefix = p.id || `P${i+1}`;
        const nappes = extractionsArmatures._nappeCroisee({
          longueur: p.longueur,
          largeur: p.largeur,
          diametre: f.diametre,
          espacement: f.espacement,
          nombre: n * nombre(p.nombre),
          enrobage,
          repere: prefix,
          designationL: `${prefix} - Nappe sens L`,
          designationl: `${prefix} - Nappe sens l`
        });
        aciers = aciers.concat(nappes);
      });
    }

    return aciers;
  },
  poutres: (l, regles) => extractionsArmatures._poutre(l, regles, 'chainages'),
  _poutre: (l, regles, hypName) => {
    if (!l.longueur || !l.largeurCm || !l.hauteurCm) return [];
    const h = acierHyp(regles, hypName);
    const dPrin = l.diametrePrin || h.diametrePrin || 12;
    const dCadre = l.diametreCadre || h.diametreCadre || 8;
    const nbreBarresPrin = l.nbreBarresPrin || h.nbreBarresPrin || 4;
    const espacement = l.espacementCadre || h.espacementCadre || 0.20;

    const n = nombre(l.nombre);
    const enrobage = PARAMETRES.armatures.enrobage;

    return [
      calculerBlocArmature({
        designation: 'Principale',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: n * nbreBarresPrin,
        longueurDeveloppee: l.longueur - 2 * enrobage + calculerRecouvrement(dPrin, PARAMETRES.nuancePrincipaleParDefaut),
        espacement: null,
        overrides: l.overrides_prin
      }),
      calculerBlocArmature({
        designation: 'Cadre',
        diametre: dCadre,
        nuance: PARAMETRES.nuanceCadresParDefaut,
        nombreDeFilesTotal: n * (Math.ceil(l.longueur / espacement) + 1),
        longueurDeveloppee: (((l.largeurCm / 100) - 2 * enrobage) + ((l.hauteurCm / 100) - 2 * enrobage)) * 2,
        espacement,
        overrides: l.overrides_cadre
      })
    ];
  },
  dalles: (l, regles, avertissements) => {
    if (!l.longueur || !l.largeur) return [];
    const h = acierHyp(regles, 'dallePleine');
    const n = nombre(l.nombre);
    const enrobage = PARAMETRES.armatures.enrobage;
    const espacement = h.espacement || 0.15;
    const diametre = h.diametrePrin || 10;

    return extractionsArmatures._nappeCroisee({
      longueur: l.longueur,
      largeur: l.largeur,
      diametre,
      espacement,
      nombre: n,
      enrobage,
      repere: l.repere,
      avertissements,
      overridesL: l.overrides_nappeL,
      overridesl: l.overrides_nappel,
      designationL: 'Nappe suivant L',
      designationl: 'Nappe suivant l'
    });
  },
  _nappeCroisee: ({ longueur, largeur, diametre, espacement, nombre, enrobage, repere, avertissements, overridesL, overridesl, designationL, designationl }) => {
    let ldSensL = longueur - 2 * enrobage;
    let ldSensl = largeur - 2 * enrobage;

    if (ldSensL < 0 || ldSensl < 0) {
      const nom = repere ? `(Repère ${repere})` : '';
      if (avertissements) avertissements.push(`Attention ${nom} : La dimension de la dalle est plus petite que l'enrobage requis.`);
      return [];
    }

    return [
      calculerBlocArmature({
        designation: designationL || 'Nappe suivant L',
        diametre,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: (Math.ceil(largeur / espacement) + 1) * (nombre || 1),
        longueurDeveloppee: ldSensL,
        espacement,
        overrides: overridesL || {},
        tracePrefix: `Nbre de barres = (Largeur / Espacement + 1) = (${net(largeur)} / ${net(espacement)} + 1) = ${Math.ceil(largeur / espacement) + 1} pièces\nNbre Total = ${Math.ceil(largeur / espacement) + 1} pièces × ${nombre || 1} dalles = ${(Math.ceil(largeur / espacement) + 1) * (nombre || 1)} pièces\nL_barre = Longueur - 2*Enrobage = ${net(longueur)} - 2*${net(enrobage)} = ${net(ldSensL)} m`,
        traceFormule: 'Barres = (Largeur / Esp) + 1 ; L_barre = Longueur - 2*Enrobage'
      }),
      calculerBlocArmature({
        designation: designationl || 'Nappe suivant l',
        diametre,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: (Math.ceil(longueur / espacement) + 1) * (nombre || 1),
        longueurDeveloppee: ldSensl,
        espacement,
        overrides: overridesl || {},
        tracePrefix: `Nbre de barres = (Longueur / Espacement + 1) = (${net(longueur)} / ${net(espacement)} + 1) = ${Math.ceil(longueur / espacement) + 1} pièces\nNbre Total = ${Math.ceil(longueur / espacement) + 1} pièces × ${nombre || 1} dalles = ${(Math.ceil(longueur / espacement) + 1) * (nombre || 1)} pièces\nL_barre = Largeur - 2*Enrobage = ${net(largeur)} - 2*${net(enrobage)} = ${net(ldSensl)} m`,
        traceFormule: 'Barres = (Longueur / Esp) + 1 ; L_barre = Largeur - 2*Enrobage'
      })
    ];
  },
  acrotere: (l, regles) => extractionsArmatures.ceintures(l, regles)
};

function acierHyp(regles, key) {
  if (regles && regles.acier && regles.acier.hypotheses && regles.acier.hypotheses[key]) {
    return regles.acier.hypotheses[key];
  }
  // fallbacks if rules are incomplete
  if (key === 'colonnes' || key === 'poteaux') return { diametrePrin: 12, nbreBarresPrin: 4, diametreCadre: 8, espacementCadre: 0.15 };
  if (key === 'amorces') return { diametrePrin1: 10, nbreBarresPrin1: 4, diametrePrin2: 10, nbreBarresPrin2: 0, diametreCadre: 8, espacementCadre: 0.15 };
  if (key === 'semelles') return { diametrePrinL: 10, espacementL: 0.15, diametrePrinLarg: 10, espacementLarg: 0.15 };
  if (key === 'ceintures' || key === 'longrines' || key === 'chainages') return { diametrePrin: 12, nbreBarresPrin: 4, diametreCadre: 6, espacementCadre: 0.20 };
  if (key === 'linteaux') return { diametrePrin: 10, nbreBarresPrin: 2 };
  if (key === 'dallePleine') return { diametrePrin: 10, espacement: 0.15 };
  if (key === 'escalier') return { diametrePrin: 12, espacement: 0.15, diametreRepartition: 8, espacementRepartition: 0.20, diametreChapeaux: 10, espacementChapeaux: 0.15 };
  return {};
}

/**
 * Maconnerie : surface brute moins les deductions.
 *
 * Le classeur ne deduisait que fenetres et portes, et ne lisait que six murs
 * sur les dix saisissables. On deduit ici fenetres, portes, impostes et
 * poteaux noyes dans le mur, sur autant de murs que l'utilisateur en saisit.
 */
function calculerMur(mur, regles = {}) {
  if (!renseigne(mur.longueur) || !renseigne(mur.hauteur)) {
    return {
      valeur: null,
      unite: 'm2',
      manquants: ['longueur', 'hauteur'].filter((c) => !renseigne(mur[c])),
      trace: {
        formule: '(L x H x N) - deductions',
        entrees: {},
        resultat: null,
        unite: 'm2',
        motif: 'Longueur ou hauteur manquante',
      },
    };
  }

  const n = nombre(mur.nombre);
  const brute = net(mur.longueur * mur.hauteur * n);

  const ouvertures = Array.isArray(mur.ouvertures) ? mur.ouvertures : [];
  const detailDeductions = ouvertures
    .filter((o) => renseigne(o.largeur) && renseigne(o.hauteur))
    .map((o) => ({
      type: o.type ?? 'ouverture',
      nombre: nombre(o.nombre),
      largeur: o.largeur,
      hauteur: o.hauteur,
      surface: net(nombre(o.nombre) * o.largeur * o.hauteur),
    }));

  const colonnesNoyees = Array.isArray(mur.colonnes) ? mur.colonnes : [];
  colonnesNoyees
    .filter((c) => renseigne(c.largeur) && renseigne(c.hauteur))
    .forEach((c) => {
      detailDeductions.push({
        type: 'colonne_noyee',
        nombre: nombre(c.nombre),
        largeur: c.largeur,
        hauteur: c.hauteur,
        surface: net(nombre(c.nombre) * c.largeur * c.hauteur),
      });
    });

  const deductions = net(
    detailDeductions.reduce((somme, d) => somme + d.surface, 0),
  );
  const valeur = net(brute - deductions);

  const surfaceMur = valeur;
  const typeAgglo = String(mur.typeAgglo || regles.maconnerieTypeAgglo || '15');
  const joint = Number(mur.epaisseurJoint ?? regles.maconnerieJoint ?? 0.015);
  // Perte sur les agglos : la majoration d achat du projet, pas un 7 % en dur.
  // v7 Elevation!G167 : ROUNDUP((surface nette / surface bloc) x MAJORATION_ACHAT)
  // avec MAJORATION_ACHAT = 1,1 (Parametres!C75, « Majoration standard a
  // l achat (pertes, chutes) »). Le 7 % ne se retrouve nulle part dans la
  // reference, et faisait cohabiter deux comptes d agglos pour un meme mur.
  const perteParDefaut = Math.round((PARAMETRES.majorations.blocs - 1) * 100);
  const perte = Number(mur.perteAgglos ?? regles.maconneriePerte ?? perteParDefaut);
  const consoMortier = Number(mur.consommationMortier ?? regles.maconnerieConsoMortier ?? (typeAgglo === '15' ? 20 : (typeAgglo === '20' ? 35 : 45))); // L/m2
  const dosageMortier = Number(mur.dosageMortier ?? regles.maconnerieDosageMortier ?? 300); // kg/m3
  const coefSableMortier = Number(mur.coefficientSableMortier ?? regles.maconnerieCoefSable ?? 1.0);
  const dosageBeton = Number(mur.dosageBeton ?? regles.maconnerieDosageBeton ?? 150); // kg/m3
  const margeMortier = Number(mur.margeMortier ?? 0);
  const margeBeton = Number(mur.margeBeton ?? 0);

  let lAgglo = 0.40;
  let hAgglo = 0.20;
  let volBetonAgglo = 0.00721875; // par defaut 20x20x40

  if (typeAgglo === '15') {
    volBetonAgglo = 0.0056875;
  } else if (typeAgglo === '25') {
    volBetonAgglo = 0.009625;
  }
  
  // 4. SURFACE UNITAIRE
  const surfaceUnitaire = (lAgglo + joint) * (hAgglo + joint);
  
  // 5. QUANTITE THEORIQUE (conserver décimales)
  // Un agglo ne se pose pas en fraction : le compte net s arrondit au bloc
  // superieur, comme la commande. Laisser 1068,198 blocs dans un recapitulatif
  // n a aucun sens sur un chantier.
  const nbAggloBrut = Math.ceil(surfaceMur / surfaceUnitaire);
  
  // 6. PERTE ET COMMANDE
  const nbAggloAvecPerte = nbAggloBrut * (1 + perte / 100);
  const nbAgglosCommande = Math.ceil(nbAggloAvecPerte);
  
  // 7, 8. VOLUME MORTIER
  const volumeMortier = (surfaceMur * consoMortier) / 1000;
  const volMortierCommande = volumeMortier * (1 + margeMortier / 100);
  
  // 10. CIMENT MORTIER
  const masseCimentMortier = volMortierCommande * dosageMortier;
  const sacsCimentMortierCommande = Math.ceil(masseCimentMortier / 50);
  
  // 11. SABLE MORTIER
  const sableMortier = volMortierCommande * coefSableMortier;
  
  return {
    valeur,
    unite: 'm2',
    manquants: [],
    surfaceBrute: brute,
    deductions,
    detailDeductions,
    nombreBlocs: nbAgglosCommande,
    nombreBlocsNet: nbAggloBrut,
    volumeMortier: net(volumeMortier),
    trace: {
      formule: '(L x H x N) - deductions',
      entrees: { longueur: mur.longueur, hauteur: mur.hauteur, nombre: n },
      surfaceBrute: brute,
      deductions: detailDeductions,
      totalDeductions: deductions,
      resultat: valeur,
      unite: 'm2',
      blocsCalcul: `CEIL(${valeur.toFixed(2)} / ${surfaceUnitaire.toFixed(4)} * ${1 + perte/100})`,
      nombreBlocs: nbAgglosCommande,
      nombreBlocsNet: nbAggloBrut,
      volumeMortier: net(volumeMortier),
    },
    decomposition_materiaux: [
      { 
        id_materiau: 'agglos_creux', categorie: 'agglos_creux', nom: `Agglos creux ${typeAgglo}×20×40`, unite: 'u', quantiteNette: nbAgglosCommande, 
        formule: '(Surface Mur) ÷ ((L + joint) × (H + joint)) × (1 + perte)',
        calcul: `Surface = ${net(surfaceMur)} m²\nS. Unitaire = (0.40 + ${joint}) × (0.20 + ${joint}) = ${net(surfaceUnitaire, 6)} m²\nQ. Théorique = ${net(surfaceMur)} ÷ ${net(surfaceUnitaire, 6)} = ${net(nbAggloBrut, 2)} agglos\nQ. Avec perte (${perte}%) = ${net(nbAggloBrut, 2)} × ${1 + perte/100} = ${net(nbAggloAvecPerte, 2)} agglos\nQ. Commande = ArrondiSup(${net(nbAggloAvecPerte, 2)}) = ${nbAgglosCommande} agglos` 
      },
      { 
        id_materiau: 'ciment', categorie: 'ciment', nom: 'Ciment (Mortier)', unite: 'sac', quantiteNette: sacsCimentMortierCommande, 
        formule: 'ArrondiSup(Volume mortier × Dosage / 50)',
        calcul: `Vol. Mortier = ${net(surfaceMur)} m² × ${consoMortier} L/m² / 1000 = ${net(volumeMortier, 3)} m³\nVol. Majoré (${margeMortier}%) = ${net(volMortierCommande, 3)} m³\nMasse Ciment = ${net(volMortierCommande, 3)} m³ × ${dosageMortier} kg/m³ = ${net(masseCimentMortier, 2)} kg\nSacs = ArrondiSup(${net(masseCimentMortier, 2)} ÷ 50) = ${sacsCimentMortierCommande} sacs` 
      },
      { 
        id_materiau: 'sable', categorie: 'sable', nom: 'Sable (Mortier)', unite: 't', quantiteNette: net(sableMortier * PARAMETRES.beton.densiteSable), 
        formule: 'Volume mortier × Coef sable',
        calcul: `Vol. Mortier = ${net(volMortierCommande, 3)} m³\nVol. Sable = ${net(volMortierCommande, 3)} × ${coefSableMortier} = ${net(sableMortier, 3)} m³\nVolume Sable (Litres) = ${net(sableMortier, 3)} m³ × 1000 = ${net(sableMortier * 1000, 2)} L\nMasse (kg) = ${net(sableMortier, 3)} m³ × 1500 kg/m³ = ${net(sableMortier * 1500, 2)} kg\nMasse (tonnes) = ${net(sableMortier * 1500, 2)} ÷ 1000 = ${net(sableMortier * 1.50, 3)} t`
      },
      // Eau de gachage du mortier de pose. v7 Elevation!G171 :
      // (sacs de ciment x poids du sac) x RATIO_EAU_CIMENT_MORTIER.
      // Elle ne figurait nulle part : le mortier de maconnerie se serait gache
      // a sec, et le recapitulatif d'eau du chantier etait sous-estime d'autant.
      {
        id_materiau: 'eau', categorie: 'eau', nom: 'Eau de gâchage (Mortier)', unite: 'L',
        quantiteNette: net(masseCimentMortier / PARAMETRES.beton.eauParDosage),
        formule: 'Masse ciment mortier / Eau par dosage',
        calcul: `Masse Ciment = ${net(masseCimentMortier, 2)} kg\nEau = ${net(masseCimentMortier, 2)} ÷ ${PARAMETRES.beton.eauParDosage} = ${net(masseCimentMortier / PARAMETRES.beton.eauParDosage, 2)} L`
      }
    ]
  };
}

/**
 * Calcul analytique complet pour un Mur de Soubassement en agglos.
 * Conforme à la demande d'algorithme détaillé : 
 * - Aucune dépendance sur l'épaisseur pour les quantités (basées sur les alvéoles de l'agglo).
 * - Calcule les agglos, mortier de pose et béton de remplissage.
 * - Sépare strictement Sable(Mortier) et Sable(Béton).
 */
function calculerMurSoubassement(mur) {
  if (!renseigne(mur.longueur) && !renseigne(mur.perimetre)) {
    return {
      valeur: null, unite: 'm2',
      manquants: ['longueur'].filter((c) => !renseigne(mur[c])),
      trace: { motif: 'Longueur manquante' }
    };
  }
  if (!renseigne(mur.hauteur)) {
    return {
      valeur: null, unite: 'm2',
      manquants: ['hauteur'],
      trace: { motif: 'Hauteur manquante' }
    };
  }

  const longueur = Number(mur.longueur || mur.perimetre);
  const hauteur = Number(mur.hauteur);
  const n = nombre(mur.nombre);
  const typeAgglo = String(mur.typeAgglo || '20'); // '15', '20' ou '25'
  
  const joint = Number(mur.epaisseurJoint ?? 0.015);
  // Perte sur les agglos : la majoration d achat du projet, pas un 7 % en dur.
  // v7 Elevation!G167 : ROUNDUP((surface nette / surface bloc) x MAJORATION_ACHAT)
  // avec MAJORATION_ACHAT = 1,1 (Parametres!C75, « Majoration standard a
  // l achat (pertes, chutes) »). Le 7 % ne se retrouve nulle part dans la
  // reference, et faisait cohabiter deux comptes d agglos pour un meme mur.
  const perteParDefaut = Math.round((PARAMETRES.majorations.blocs - 1) * 100);
  const perte = Number(mur.perteAgglos ?? perteParDefaut);
  const consoMortier = Number(mur.consommationMortier ?? (typeAgglo === '15' ? 20 : (typeAgglo === '20' ? 35 : 45))); // L/m2
  const dosageMortier = Number(mur.dosageMortier ?? 300); // kg/m3
  const coefSableMortier = Number(mur.coefficientSableMortier ?? 1.0);
  const dosageBeton = Number(mur.dosageBeton ?? 150); // kg/m3
  const margeMortier = Number(mur.margeMortier ?? 0);
  const margeBeton = Number(mur.margeBeton ?? 0);
  
  // 3. CALCUL DE LA SURFACE DU MUR (Brute - Déductions)
  const brute = longueur * hauteur * n;
  let deductions = 0;
  const detailDeductions = [];

  if (Array.isArray(mur.ouvertures)) {
    mur.ouvertures.forEach(ouv => {
      if (renseigne(ouv.largeur) && renseigne(ouv.hauteur)) {
        const no = nombre(ouv.nombre);
        const surfOuv = ouv.largeur * ouv.hauteur * no;
        deductions += surfOuv;
        detailDeductions.push({ repere: ouv.repere, type: ouv.type, valeur: surfOuv, dimensions: `${ouv.largeur}x${ouv.hauteur}x${no}` });
      }
    });
  }

  const surfaceMur = net(brute - deductions);
  
  let lAgglo = 0.40;
  let hAgglo = 0.20;
  let volBetonAgglo = 0.00721875; // par defaut 20x20x40

  if (typeAgglo === '15') {
    volBetonAgglo = 0.0056875; // 0.325 * 0.10 * 0.175
  } else if (typeAgglo === '25') {
    volBetonAgglo = 0.009625; 
  }
  
  // 4. SURFACE UNITAIRE
  const surfaceUnitaire = (lAgglo + joint) * (hAgglo + joint);
  
  // 5. QUANTITE THEORIQUE (conserver décimales)
  // Un agglo ne se pose pas en fraction : le compte net s arrondit au bloc
  // superieur, comme la commande. Laisser 1068,198 blocs dans un recapitulatif
  // n a aucun sens sur un chantier.
  const nbAggloBrut = Math.ceil(surfaceMur / surfaceUnitaire);
  
  // 6. PERTE ET COMMANDE
  const nbAggloAvecPerte = nbAggloBrut * (1 + perte / 100);
  const nbAgglosCommande = Math.ceil(nbAggloAvecPerte);
  
  // 7, 8. VOLUME MORTIER
  const volumeMortier = (surfaceMur * consoMortier) / 1000;
  const volMortierCommande = volumeMortier * (1 + margeMortier / 100);
  
  // 10. CIMENT MORTIER
  const masseCimentMortier = volMortierCommande * dosageMortier;
  const sacsCimentMortierCommande = Math.ceil(masseCimentMortier / 50);
  
  // 11. SABLE MORTIER
  const sableMortier = volMortierCommande * coefSableMortier;
  
  // 12, 13. BÉTON ALVÉOLES
  const volumeBeton = volBetonAgglo * nbAgglosCommande;
  const volBetonCommande = volumeBeton * (1 + margeBeton / 100);
  
  // 14. CIMENT BÉTON
  const sacsCimentBeton = volBetonCommande * (dosageBeton / 50);
  const sacsCimentBetonCommande = Math.ceil(sacsCimentBeton);
  
  // 15. GRAVIER BÉTON (0.8 m3 par m3 de béton)
  const gravierBeton = volBetonCommande * 0.800;
  
  // 16. SABLE BÉTON (0.4 m3 par m3 de béton)
  const sableBeton = volBetonCommande * 0.400;

  return {
    valeur: surfaceMur,
    unite: 'm2',
    manquants: [],
    surfaceBrute: brute,
    deductions,
    detailDeductions,
    trace: {
      formule: '(L × H × N) - deductions',
      entrees: { longueur, hauteur, nombre: n },
      surfaceBrute: brute,
      deductions: detailDeductions,
      totalDeductions: deductions,
      resultat: surfaceMur,
      unite: 'm2'
    },
    decomposition_materiaux: [
      { 
        id_materiau: 'agglos_pleins', categorie: 'agglos_pleins', nom: `Agglos pleins ${typeAgglo}×20×40`, unite: 'u', quantiteNette: nbAgglosCommande, 
        formule: '(Surface Mur) ÷ ((L + joint) × (H + joint)) × (1 + perte)',
        calcul: `Surface = ${net(surfaceMur)} m²\nS. Unitaire = (0.40 + ${joint}) × (0.20 + ${joint}) = ${net(surfaceUnitaire, 6)} m²\nQ. Théorique = ${net(surfaceMur)} ÷ ${net(surfaceUnitaire, 6)} = ${net(nbAggloBrut, 2)} agglos\nQ. Avec perte (${perte}%) = ${net(nbAggloBrut, 2)} × ${1 + perte/100} = ${net(nbAggloAvecPerte, 2)} agglos\nQ. Commande = ArrondiSup(${net(nbAggloAvecPerte, 2)}) = ${nbAgglosCommande} agglos` 
      },
      
      { 
        id_materiau: 'ciment', categorie: 'ciment', nom: 'Ciment (Mortier)', unite: 'sac', quantiteNette: sacsCimentMortierCommande, 
        formule: 'ArrondiSup(Volume mortier × Dosage / 50)',
        calcul: `Vol. Mortier = ${net(surfaceMur)} m² × ${consoMortier} L/m² / 1000 = ${net(volumeMortier, 3)} m³\nVol. Majoré (${margeMortier}%) = ${net(volMortierCommande, 3)} m³\nMasse Ciment = ${net(volMortierCommande, 3)} m³ × ${dosageMortier} kg/m³ = ${net(masseCimentMortier, 2)} kg\nSacs = ArrondiSup(${net(masseCimentMortier, 2)} ÷ 50) = ${sacsCimentMortierCommande} sacs` 
      },
      { 
        id_materiau: 'sable', categorie: 'sable', nom: 'Sable (Mortier)', unite: 't', quantiteNette: net(sableMortier * PARAMETRES.beton.densiteSable), 
        formule: 'Volume mortier × Coef sable',
        calcul: `Vol. Mortier = ${net(volMortierCommande, 3)} m³\nVol. Sable = ${net(volMortierCommande, 3)} × ${coefSableMortier} = ${net(sableMortier, 3)} m³\nVolume Sable (Litres) = ${net(sableMortier, 3)} m³ × 1000 = ${net(sableMortier * 1000, 2)} L\nMasse (kg) = ${net(sableMortier, 3)} m³ × 1500 kg/m³ = ${net(sableMortier * 1500, 2)} kg\nMasse (tonnes) = ${net(sableMortier * 1500, 2)} ÷ 1000 = ${net(sableMortier * 1.50, 3)} t` 
      },
      
      { 
        id_materiau: 'ciment', categorie: 'ciment', nom: 'Ciment (Béton Alvéoles)', unite: 'sac', quantiteNette: sacsCimentBetonCommande, 
        formule: 'ArrondiSup(Volume béton × Dosage / 50)',
        calcul: `Vol. Alvéoles/agglo = ${net(volBetonAgglo, 6)} m³\nVol. Total = ${net(volBetonAgglo, 6)} × ${nbAgglosCommande} = ${net(volumeBeton, 3)} m³\nVol. Majoré (${margeBeton}%) = ${net(volBetonCommande, 3)} m³\nMasse Ciment = ${net(volBetonCommande, 3)} m³ × ${dosageBeton} kg/m³ = ${net(volBetonCommande * dosageBeton, 2)} kg\nSacs = ArrondiSup(${net(volBetonCommande * dosageBeton, 2)} ÷ 50) = ${sacsCimentBetonCommande} sacs` 
      },
      { 
        id_materiau: 'sable', categorie: 'sable', nom: 'Sable (Béton)', unite: 't', quantiteNette: net(sableBeton * PARAMETRES.beton.densiteSable), 
        formule: 'Volume béton × 0.400',
        calcul: `Vol. Sable = ${net(volBetonCommande, 3)} m³ × 0.400 = ${net(sableBeton, 3)} m³\nVolume Sable (Litres) = ${net(sableBeton, 3)} m³ × 1000 = ${net(sableBeton * 1000, 2)} L\nMasse (kg) = ${net(sableBeton, 3)} m³ × 1500 kg/m³ = ${net(sableBeton * 1500, 2)} kg\nMasse (tonnes) = ${net(sableBeton * 1500, 2)} ÷ 1000 = ${net(sableBeton * 1.50, 3)} t` 
      },
      { 
        id_materiau: 'gravier', categorie: 'gravier', nom: 'Gravier (Béton)', unite: 't', quantiteNette: net(gravierBeton * PARAMETRES.beton.densiteGravier), 
        formule: 'Volume béton × 0.800',
        calcul: `Vol. Gravier = ${net(volBetonCommande, 3)} m³ × 0.800 = ${net(gravierBeton, 3)} m³\nVolume Gravier (Litres) = ${net(gravierBeton, 3)} m³ × 1000 = ${net(gravierBeton * 1000, 2)} L\nMasse (kg) = ${net(gravierBeton, 3)} m³ × 1600 kg/m³ = ${net(gravierBeton * 1600, 2)} kg\nMasse (tonnes) = ${net(gravierBeton * 1600, 2)} ÷ 1000 = ${net(gravierBeton * 1.60, 3)} t`
      },
      // L'eau de gachage manquait entierement pour ce mur : ni le mortier de
      // pose ni le beton de remplissage des alveoles n'en demandaient, alors
      // qu'aucun des deux ne se gache a sec. Meme convention que partout
      // ailleurs : masse de ciment / EAU_PAR_DOSAGE.
      {
        id_materiau: 'eau', categorie: 'eau', nom: 'Eau de gâchage (Mortier + Alvéoles)', unite: 'L',
        quantiteNette: net((masseCimentMortier + volBetonCommande * dosageBeton) / PARAMETRES.beton.eauParDosage),
        formule: 'Masse ciment totale / Eau par dosage',
        calcul: `Ciment mortier = ${net(masseCimentMortier, 2)} kg\nCiment alvéoles = ${net(volBetonCommande * dosageBeton, 2)} kg\nEau = (${net(masseCimentMortier, 2)} + ${net(volBetonCommande * dosageBeton, 2)}) ÷ ${PARAMETRES.beton.eauParDosage} = ${net((masseCimentMortier + volBetonCommande * dosageBeton) / PARAMETRES.beton.eauParDosage, 2)} L`
      },
    ]
  };
}

/**
 * Maçonnerie en moellons — Algorithme analytique complet.
 *
 * Méthode du guide :
 *   Volume moellons = Volume maçonnerie × 70%
 *   Volume mortier  = Volume maçonnerie × 30%
 *   Ciment          = ArrondiSup(Volume mortier × Dosage / 50)
 *   Sable           = Volume mortier × 0.40 × 1.50  (tonnes)
 *   Eau             = Ciment_kg × 0.50  (litres)
 *   Brouettes sable = ArrondiSup(Volume sable m³ × 1000 / 60)
 *
 * @param {object} l - ligne de saisie (perimetre, largeurBase, hauteur, nombre, dosageCiment)
 */
function calculerMoellon(l) {
  if (!renseigne(l.perimetre) || !renseigne(l.largeurBase) || !renseigne(l.hauteur)) {
    return {
      valeur: null,
      unite: 'm3',
      manquants: ['perimetre', 'largeurBase', 'hauteur'].filter(c => !renseigne(l[c])),
      trace: { formule: 'Périmètre × Base × H × N', entrees: {}, resultat: null },
      decomposition_materiaux: [],
    };
  }

  const n = nombre(l.nombre);
  // --- DOSAGES ---
  const PCT_MOELLONS   = 0.70;
  const PCT_MORTIER    = 0.30;
  const DENSITE_MOELLON = 1.60;    // t/m³
  const COEF_SABLE      = 0.40;    // m³ sable / m³ mortier
  const DENSITE_SABLE   = 1.50;    // t/m³
  const POIDS_SAC       = 50;      // kg
  const VOL_BROUETTE    = 0.060;   // m³ (60 L)
  const RATIO_EAU       = 0.50;    // L/kg de ciment
  
  // Dosage mortier — saisie par l'utilisateur, défaut 250 kg/m³
  const dosageCiment = (l.dosageCiment && Number(l.dosageCiment) > 0)
    ? Number(l.dosageCiment)
    : PARAMETRES.dosages.maconnerieCourante; // 250 kg/m³

  // 1. VOLUME MAÇONNERIE
  const volMaconnerie = net(l.perimetre * l.largeurBase * l.hauteur * n);

  // 2. VOLUME MOELLONS
  const volMoellons = net(volMaconnerie * PCT_MOELLONS);

  // 3. VOLUME MORTIER
  const volMortier = net(volMaconnerie * PCT_MORTIER);

  // 4. MOELLONS EN TONNES
  const tonnMoellons = net(volMoellons * DENSITE_MOELLON);

  // 5. CIMENT
  const masseCiment = volMortier * dosageCiment;
  const sacsCiment  = Math.ceil(masseCiment / POIDS_SAC);

  // 6. SABLE
  const volSableM3   = net(volMortier * COEF_SABLE);
  const tonnSable    = net(volSableM3 * DENSITE_SABLE);
  const litresSable  = net(volSableM3 * 1000);
  const nbrBrouettes = Math.ceil(litresSable / (VOL_BROUETTE * 1000));

  // 7. EAU
  const eauL = net(sacsCiment * POIDS_SAC * RATIO_EAU);

  return {
    valeur: volMaconnerie,
    unite: 'm3',
    manquants: [],
    trace: {
      formule: 'Périmètre × Base × H × N',
      entrees: { perimetre: l.perimetre, largeurBase: l.largeurBase, hauteur: l.hauteur, nombre: n },
      resultat: volMaconnerie,
      unite: 'm3',
      calcul: `Vol. Maçonnerie = ${l.perimetre} × ${l.largeurBase} × ${l.hauteur} × ${n} = ${volMaconnerie} m³`,
    },
    decomposition_materiaux: [
      {
        id_materiau: 'moellon',
        categorie: 'pierre',
        nom: 'Moellons',
        unite: 't',
        quantiteNette: tonnMoellons,
        formule: 'Volume Maçonnerie × 70% × 1,60 t/m³',
        calcul: `Vol. Moellons = ${volMaconnerie} × 0.70 = ${volMoellons} m³\nPoids = ${volMoellons} × ${DENSITE_MOELLON} = ${tonnMoellons} t`,
        motif_arrondi: null,
        valeur_arrondie: tonnMoellons,
      },
      {
        id_materiau: 'ciment_mortier',
        categorie: 'ciment',
        nom: `Ciment mortier (dosage ${dosageCiment} kg/m³)`,
        unite: 'sac',
        quantiteNette: sacsCiment,
        formule: 'ArrondiSup(Vol. Mortier × Dosage ÷ 50)',
        calcul: `Vol. Mortier = ${volMaconnerie} × 0.30 = ${volMortier} m³\nMasse Ciment = ${volMortier} × ${dosageCiment} = ${net(masseCiment, 2)} kg\nSacs = ArrondiSup(${net(masseCiment, 2)} ÷ 50) = ${sacsCiment} sacs`,
        motif_arrondi: 'Arrondi supérieur — on ne peut pas acheter un demi-sac',
        valeur_arrondie: sacsCiment,
      },
      {
        id_materiau: 'sable_mortier',
        categorie: 'sable',
        nom: 'Sable (Mortier moellon)',
        unite: 'm³',
        quantiteNette: volSableM3,
        formule: 'Vol. Mortier × 0.40',
        calcul: `Vol. Mortier = ${volMortier} m³\nVol. Sable = ${volMortier} × 0.40 = ${volSableM3} m³\nVolume Sable (Litres) = ${volSableM3} m³ × 1000 = ${litresSable} L → ${nbrBrouettes} brouettes de 60 L\nMasse (kg) = ${volSableM3} m³ × 1500 kg/m³ = ${net(tonnSable * 1000)} kg\nMasse (tonnes) = ${net(tonnSable * 1000)} ÷ 1000 = ${tonnSable} t`,
        motif_arrondi: null,
        valeur_arrondie: volSableM3,
      },
      {
        id_materiau: 'eau_gachage',
        categorie: 'eau',
        nom: 'Eau de gâchage',
        unite: 'L',
        quantiteNette: eauL,
        formule: 'Ciment (kg) × 0,50 L/kg',
        calcul: `Ciment = ${sacsCiment} × 50 = ${sacsCiment * POIDS_SAC} kg\nEau = ${sacsCiment * POIDS_SAC} × 0.50 = ${eauL} L`,
        motif_arrondi: null,
        valeur_arrondie: eauL,
      },
    ],
    // Champs synthétiques pour l'affichage rapide dans résumé fondation
    _volumeMoellons: volMoellons,
    _tonnMoellons: tonnMoellons,
    _volMortier: volMortier,
    _sacsCiment: sacsCiment,
    _volSableM3: volSableM3,
    _tonnSable: tonnSable,
    _nbrBrouettes: nbrBrouettes,
    _eauL: eauL,
    _dosageCiment: dosageCiment,
  };
}

/**
 * Dallage — Algorithme analytique spécifique pour dalle sur terre-plein (sans coffrage).
 * @param {object} l - ligne de saisie (longueur, largeur, epaisseur, dosage, pertes, etc.)
 */
function calculerDallage(l) {
  const lLongueur = Number(l.longueur);
  const lLargeur = Number(l.largeur);
  
  if (!renseigne(l.longueur) || !renseigne(l.largeur) || (!renseigne(l.epaisseur) && !renseigne(l.epaisseurCm))) {
    return {
      valeur: null,
      unite: 'm3',
      manquants: ['longueur', 'largeur', renseigne(l.epaisseur) ? '' : 'epaisseur'].filter(c => !renseigne(l[c]) && c),
      trace: { formule: 'L × B × e × N', entrees: {}, resultat: null },
      decomposition_materiaux: [],
    };
  }

  const e = renseigne(l.epaisseurCm) ? Number(l.epaisseurCm) / 100 : Number(l.epaisseur);
  const n = nombre(l.nombre);
  
  const P = renseigne(l.pertes) ? Number(l.pertes) : 5;
  const D = renseigne(l.dosage) ? Number(l.dosage) : PARAMETRES.dosages.maconnerieCourante;
  const Ks = renseigne(l.coefSable) ? Number(l.coefSable) : PARAMETRES.beton.sableParM3;
  const Kg = renseigne(l.coefGravier) ? Number(l.coefGravier) : PARAMETRES.beton.gravierParM3;
  const densiteS = renseigne(l.densiteSable) ? Number(l.densiteSable) : (PARAMETRES.beton.densiteSable * 1000);
  const densiteG = renseigne(l.densiteGravier) ? Number(l.densiteGravier) : (PARAMETRES.beton.densiteGravier * 1000);
  
  const POIDS_SAC = PARAMETRES.beton.poidsSacCiment || 50;
  const RATIO_EAU = 0.50; // L/kg de ciment

  const surface = net(lLongueur * lLargeur * n);
  const volTheorique = net(surface * e);
  const volFinal = net(volTheorique * (1 + P / 100));
  
  const cimentKg = net(volFinal * D);
  const cimentTonnes = net(cimentKg / 1000, 2);
  const cimentSacs = Math.ceil(cimentKg / POIDS_SAC);
  
  const volSable = net(volFinal * Ks);
  const sableKg = net(volSable * densiteS);
  const sableTonnes = net(sableKg / 1000, 2);
  
  const volGravier = net(volFinal * Kg);
  const gravierKg = net(volGravier * densiteG);
  const gravierTonnes = net(gravierKg / 1000, 2);
  
  const eauL = net(cimentKg * RATIO_EAU);
  
  return {
    valeur: volFinal,
    unite: 'm3',
    manquants: [],
    trace: {
      formule: 'L × B × e × N × (1 + Pertes%)',
      entrees: { longueur: lLongueur, largeur: lLargeur, epaisseur: e, nombre: n, pertes: P },
      resultat: volFinal,
      unite: 'm3',
      calcul: `Surface = ${lLongueur} × ${lLargeur} × ${n} = ${surface} m²\nVol. Théorique = ${surface} × ${e} = ${volTheorique} m³\nVol. Final (+${P}%) = ${volTheorique} × ${1 + P/100} = ${volFinal} m³`,
    },
    decomposition_materiaux: [
      {
        id_materiau: 'ciment', categorie: 'ciment', nom: `Ciment (Dosage ${D} kg/m³)`, unite: 'sac', quantiteNette: cimentSacs,
        formule: 'ArrondiSup(Volume Final × Dosage / 50)',
        calcul: `Masse = ${volFinal} m³ × ${D} kg/m³ = ${cimentKg} kg (${cimentTonnes} t)\nSacs = ArrondiSup(${cimentKg} ÷ 50) = ${cimentSacs} sacs`,
        motif_arrondi: 'Arrondi supérieur par élément', valeur_arrondie: cimentSacs,
      },
      {
        id_materiau: 'sable', categorie: 'sable', nom: 'Sable de rivière', unite: 'm³', quantiteNette: volSable,
        formule: 'Volume Final × Ks',
        calcul: `Vol. Sable (m³) = ${volFinal} m³ × ${Ks} = ${volSable} m³\nVolume Sable (Litres) = ${volSable} m³ × 1000 = ${net(volSable * 1000, 2)} L\nMasse (kg) = ${volSable} m³ × ${densiteS} kg/m³ = ${sableKg} kg\nMasse (tonnes) = ${sableKg} ÷ 1000 = ${sableTonnes} t`,
        motif_arrondi: null, valeur_arrondie: volSable,
      },
      {
        id_materiau: 'gravier', categorie: 'gravier', nom: 'Gravier', unite: 'm³', quantiteNette: volGravier,
        formule: 'Volume Final × Kg',
        calcul: `Vol. Gravier (m³) = ${volFinal} m³ × ${Kg} = ${volGravier} m³\nVolume Gravier (Litres) = ${volGravier} m³ × 1000 = ${net(volGravier * 1000, 2)} L\nMasse (kg) = ${volGravier} m³ × ${densiteG} kg/m³ = ${gravierKg} kg\nMasse (tonnes) = ${gravierKg} ÷ 1000 = ${gravierTonnes} t`,
        motif_arrondi: null, valeur_arrondie: volGravier,
      },
      {
        id_materiau: 'eau', categorie: 'eau', nom: 'Eau de gâchage', unite: 'L', quantiteNette: eauL,
        formule: 'Ciment (kg) × E/C',
        calcul: `Ciment = ${cimentKg} kg\nEau = ${cimentKg} × ${RATIO_EAU} = ${eauL} L`,
        motif_arrondi: null, valeur_arrondie: eauL,
      },
    ],
    _surface: surface,
    _volTheorique: volTheorique,
  };
}


/**
 * Carrelage : surface au sol et perimetre.
 *
 * Le classeur laissait la colonne « Perim. (m) » sans formule et sans total,
 * ce qui mettait les plinthes a zero dans tout le devis. Le perimetre est
 * desormais deduit des dimensions, et reste remplacable a la main.
 */

function calculerLocal(local) {
  if (!renseigne(local.longueur) || !renseigne(local.largeur)) {
    return {
      surface: null,
      perimetre: null,
      unite: 'm2',
      manquants: ['longueur', 'largeur'].filter((c) => !renseigne(local[c])),
      trace: {
        formule: 'L x l x N',
        entrees: {},
        resultat: null,
        unite: 'm2',
        motif: 'Longueur ou largeur manquante',
      },
    };
  }

  const n = nombre(local.nombre);
  const surface = net(local.longueur * local.largeur * n);

  const perimetreForce = renseigne(local.perimetre);
  const perimetre = perimetreForce
    ? local.perimetre
    : net(2 * (local.longueur + local.largeur) * n);
    
  const epaisseur = renseigne(local.epaisseur) ? local.epaisseur : 0.03; // par defaut 3cm

  return {
    surface,
    perimetre,
    perimetreForce,
    epaisseur,
    unite: 'm2',
    manquants: [],
    trace: {
      formule: 'L x l x N',
      entrees: { longueur: local.longueur, largeur: local.largeur, nombre: n },
      resultat: surface,
      unite: 'm2',
      perimetre: {
        formule: perimetreForce ? 'saisi a la main' : '2 x (L + l) x N',
        resultat: perimetre,
        unite: 'ml',
      },
      calcul: `Surface = ${local.longueur} × ${local.largeur} × ${n} = ${surface} m²` + 
              (perimetreForce ? `\nPérimètre = ${perimetre} ml (saisi manuellement)` : `\nPérimètre = 2 × (${local.longueur} + ${local.largeur}) × ${n} = ${perimetre} ml`)
    },
  };
}

/** Somme les lignes calculables ; rend `null` si aucune ne l'est. */
function totaliser(lignes, cle = 'valeur') {
  const valeurs = lignes.map((l) => l[cle]).filter((v) => v !== null);
  if (valeurs.length === 0) return null;
  return net(valeurs.reduce((a, b) => a + b, 0));
}

/**
 * Calcule le metre complet d'un projet.
 *
 * @param {object} saisie   Un tableau de lignes par bloc.
 * @param {object} regles   Jeu de regles (voir regles.js).
 * @returns {{blocs: object, avertissements: Array}}
 */
export function calculerMetre(saisie = {}, regles = {}) {
  // Aliases pour uniformiser
  if (saisie.soubassement && !saisie.murSoubassement) saisie.murSoubassement = saisie.soubassement;
  if (saisie.murSoubassement && !saisie.soubassement) saisie.soubassement = saisie.murSoubassement;
  if (saisie.poteaux && !saisie.colonnes) saisie.colonnes = saisie.poteaux;

  // Le meme mur alimente deux blocs : `murSoubassement` porte sa surface pour
  // le devis, `soubassement` en tire les agglos pleins et le mortier. Le premier
  // se saisit par un perimetre, le second attend une longueur — sans cette
  // equivalence, les agglos pleins n'apparaissent jamais dans le devis.
  if (Array.isArray(saisie.soubassement)) {
    saisie.soubassement = saisie.soubassement.map((m) =>
      m && !renseigne(m.longueur) && renseigne(m.perimetre) ? { ...m, longueur: m.perimetre } : m,
    );
  }

  // L'acrotere porte deux hauteurs distinctes : celle de son chainage (le beton)
  // et la sienne propre (la maconnerie au-dessus). On ramene les noms explicites
  // aux champs standards pour que le calcul d'armatures, commun aux ceintures,
  // continue de lire largeur et hauteur.
  if (Array.isArray(saisie.acrotere)) {
    saisie.acrotere = saisie.acrotere.map((l) => {
      if (!l) return l;
      const norm = { ...l };
      if (!renseigne(norm.largeur) && renseigne(norm.largeurChainage)) norm.largeur = norm.largeurChainage;
      if (!renseigne(norm.hauteur) && renseigne(norm.hauteurChainage)) norm.hauteur = norm.hauteurChainage;
      return norm;
    });
  }

  const blocs = {};
  const avertissements = [];

  // maconnerie, carrelage et soubassement sont traites plus bas par du code
  // dedie (calculerMur/calculerLocal), pas par la table BLOCS : sans leur
  // presence ici, le moteur les traitait correctement tout en affirmant a
  // l'utilisateur qu'il les ignorait — un faux avertissement, pas un vrai.
  const knownKeys = [...Object.keys(BLOCS), 'faience', 'peinture', 'autresOuvrages', 'niveaux', 'maconnerie', 'carrelage', 'soubassement'];
  for (const key of Object.keys(saisie || {})) {
    if (!knownKeys.includes(key) && Array.isArray(saisie[key]) && saisie[key].length > 0) {
      avertissements.push({
        bloc: key,
        ligne: 0,
        repere: 'GLOBAL',
        type: 'saisie-ignoree',
        message: `Saisie ignorée : ${key} — ce bloc n'existe pas dans le moteur.`
      });
    }
  }

  // Blocs standard, pilotes par la table BLOCS.
  for (const [code, bloc] of Object.entries(BLOCS)) {
    const entree = Array.isArray(saisie[code]) ? saisie[code] : [];
    const lignesCalculees = entree.map((ligne, index) => {
      const resultat = calculerLigne(bloc, ligne, regles, saisie);

      if (resultat.manquants.length > 0 && aUneSaisie(ligne)) {
        avertissements.push({
          bloc: code,
          ligne: index,
          repere: ligne.repere ?? `${code} ${index + 1}`,
          type: 'dimension-manquante',
          message: `${bloc.libelle} — ${resultat.manquants.join(', ')} manquant(e).`,
        });
      }

      for (const orpheline of champsOrphelins(bloc, ligne)) {
        avertissements.push({
          bloc: code,
          ligne: index,
          repere: ligne.repere ?? `${code} ${index + 1}`,
          type: 'saisie-inutilisee',
          message: `${bloc.libelle} — « ${orpheline} » est saisi mais n'entre pas dans la formule ${bloc.formule}.`,
        });
      }

      // Controles propres au bloc : regles de l'art, coherences internes.
      // Ce sont des avertissements, jamais des blocages : on informe le
      // chiffreur, on ne l'empeche pas de saisir ce qu'il a sur son plan.
      if (bloc.valider) {
        for (const alerte of bloc.valider(ligne, regles, resultat)) {
          avertissements.push({
            bloc: code,
            ligne: index,
            repere: ligne.repere ?? `${code} ${index + 1}`,
            type: alerte.type,
            message: `${bloc.libelle} — ${alerte.message}`,
          });
        }
      }

      for (const invalide of champsInvalides(ligne)) {
        avertissements.push({
          bloc: code,
          ligne: index,
          repere: ligne.repere ?? `${code} ${index + 1}`,
          type: 'dimension-invalide',
          message: `${bloc.libelle} — « ${invalide} » est négative ou nulle (valeur: ${ligne[invalide]}).`,
        });
      }

      return { ...ligne, ...resultat };
    });

    const res = { 
      libelle: bloc.libelle,
      unite: bloc.unite,
      formule: bloc.formule,
      lignes: lignesCalculees, 
      total: totaliser(lignesCalculees, 'valeur') 
    };
    
    const totCoffrage = totaliser(lignesCalculees, 'surfaceCoffrage');
    if (totCoffrage !== null && totCoffrage > 0) res.totalCoffrage = totCoffrage;

    const totBrut = totaliser(lignesCalculees, 'volumeBrut');
    if (totBrut !== null && totBrut > 0) res.totalBrut = totBrut;
    
    const totSurfaceMac = totaliser(lignesCalculees, 'surfaceMac');
    if (totSurfaceMac !== null && totSurfaceMac > 0) res.totalSurfaceMac = totSurfaceMac;
    
    blocs[code] = res;
  }

  // Moellons — calculés analytiquement (comme le soubassement)
  // Le bloc 'moellon' a été retiré de BLOCS pour être géré ici.
  const lignesMoellon = (Array.isArray(saisie.moellons || saisie.moellon) ? (saisie.moellons || saisie.moellon) : []).map(
    (m) => calculerMoellon(m),
  );
  blocs.moellon = {
    libelle: 'Fondation en moellon',
    unite: 'm3',
    formule: 'Périmètre × Base × H × N',
    lignes: lignesMoellon,
    total: totaliser(lignesMoellon),
  };

  // Dallages — calculés analytiquement
  const lignesDallage = (Array.isArray(saisie.dallages || saisie.dallage) ? (saisie.dallages || saisie.dallage) : []).map(
    (d) => calculerDallage(d),
  );
  blocs.dallage = {
    libelle: 'Dallage',
    unite: 'm3',
    formule: 'L × B × e × (1 + Pertes)',
    lignes: lignesDallage,
    total: totaliser(lignesDallage),
  };

  // Exclusion mutuelle Moellon vs (Longrines + Mur Soubassement)
  const aMoellon = blocs.moellon && blocs.moellon.total > 0;

  const aLongrineMur = (blocs.longrines && blocs.longrines.total > 0) || (blocs.murSoubassement && blocs.murSoubassement.total > 0);
  
  if (aMoellon && aLongrineMur) {
    avertissements.push({
      bloc: 'moellon',
      ligne: 0,
      repere: 'GLOBAL',
      type: 'exclusion-mutuelle',
      message: 'Moellon et Longrine/Mur de soubassement saisis simultanément. Le classeur annule les moellons dans ce cas. Le moellon a été ignoré.'
    });
    // On neutralise le moellon
    blocs.moellon.total = 0;
    blocs.moellon.lignes = [];
  }


  // --- Calcul des Armatures globales ---
  const toutesArmatures = [];

  for (const [code, bloc] of Object.entries(BLOCS)) {
    const entree = Array.isArray(saisie[code]) ? saisie[code] : [];
    if (extractionsArmatures[code]) {
      entree.forEach((ligne, index) => {
        if (!aUneSaisie(ligne)) return;
        const arms = extractionsArmatures[code](ligne, regles, avertissements);
        let poidsAcierLigne = 0;
        arms.forEach(a => {
          toutesArmatures.push({
            repereSource: ligne.repere || `${bloc.libelle} ${index + 1}`,
            ...a
          });
          poidsAcierLigne += (a.poids || 0);
          if (a.trace && Array.isArray(a.trace.avertissements)) {
            a.trace.avertissements.forEach(msg => {
              avertissements.push({
                bloc: code,
                ligne: index,
                repere: ligne.repere || `${bloc.libelle} ${index + 1}`,
                type: 'armature-warning',
                message: msg
              });
            });
          }
        });
        
        // Save the total steel weight on the calculated line so it can be used for tie wire
        if (blocs[code] && blocs[code].lignes && blocs[code].lignes[index]) {
          blocs[code].lignes[index].poidsAcier = net(poidsAcierLigne);
          blocs[code].lignes[index].detailsArmatures = arms;
        }
      });
    }
  }

  // Agregation par type et diametre
  const aggArmatures = {};
  let totalPoidsArmatures = 0;

  toutesArmatures.forEach(a => {
    const key = `${a.designation}${a.diametre}`;
    if (!aggArmatures[key]) {
      aggArmatures[key] = { diametre: a.diametre, type: a.designation, barres12m: 0, poids: 0, details: [] };
    }
    aggArmatures[key].barres12m += (a.nombreBarres12m || 0);
    aggArmatures[key].poids += a.poids;
    aggArmatures[key].details.push(a.repereSource + ' (' + a.designation + ')');
    totalPoidsArmatures += a.poids;
  });

  const lignesArmatures = Object.values(aggArmatures).map(a => ({
    id: `acier_${a.type}${a.diametre}`,
    designation: `Fer ${a.type} ${a.diametre}`,
    unite: 'barres 12m',
    diametre: a.diametre,
    type: a.type,
    quantite: a.barres12m,
    poids: net(a.poids),
    details: a.details
  }));

  blocs.armatures = {
    libelle: 'Armatures',
    unite: 'kg',
    formule: 'Calcul par element',
    lignes: lignesArmatures,
    total: net(totalPoidsArmatures)
  };

  // Maconnerie.
  const murs = (Array.isArray(saisie.maconnerie) ? saisie.maconnerie : []).map(
    (mur) => calculerMur(mur, regles),
  );
  blocs.maconnerie = {
    libelle: 'Maconnerie en agglos',
    unite: 'm2',
    formule: '(L x H x N) - deductions',
    lignes: murs,
    surfaceBrute: totaliser(murs, 'surfaceBrute'),
    deductions: totaliser(murs, 'deductions'),
    total: totaliser(murs),
  };

  // Murs de soubassement, en agglos pleins. Bloc distinct de `murSoubassement`,
  // qui n'en porte que la surface pour le devis : celui-ci porte le detail
  // (blocs et mortier) et sert a deduire le volume de l'ouvrage filant du remblai.
  const mursSoubassement = (Array.isArray(saisie.soubassement) ? saisie.soubassement : []).map(
    (m) => calculerMurSoubassement(m),
  );
  blocs.soubassement = {
    libelle: 'Murs de soubassement (Agglos)',
    unite: 'm2',
    formule: 'L x H x N',
    lignes: mursSoubassement,
    total: totaliser(mursSoubassement),
  };




  // Carrelage et plinthes.
  const locaux = (Array.isArray(saisie.carrelage) ? saisie.carrelage : []).map(
    calculerLocal,
  );
  
  // Extraire les épaisseurs pondérées ou utiliser la première trouvée.
  const epaisseurCarrelageMoyenne = locaux.length > 0 ? (locaux[0].epaisseur || 0.03) : 0.03;

  blocs.carrelage = {
    libelle: 'Carrelage sol et plinthes',
    unite: 'm2',
    formule: 'L x l x N',
    lignes: locaux,
    total: totaliser(locaux, 'surface'),
    perimetreTotal: totaliser(locaux, 'perimetre'),
    epaisseurCarrelage: epaisseurCarrelageMoyenne
  };
  
  // Faïence
  const faience = (Array.isArray(saisie.faience) ? saisie.faience : []).map((f) => {
     if (!renseigne(f.longueur) || !renseigne(f.hauteur)) {
        return { valeur: null, manquants: ['longueur', 'hauteur'].filter((c) => !renseigne(f[c])) };
     }
     const n = nombre(f.nombre);
     const v = net(f.longueur * f.hauteur * n);
     return { 
       ...f, 
       valeur: v,
       trace: {
         calcul: `Surface = ${f.longueur} × ${f.hauteur} × ${n} = ${v} m²`
       }
     };
  });
  blocs.faience = {
    libelle: 'Faïence murale',
    unite: 'm2',
    formule: 'L x H x N',
    lignes: faience,
    total: totaliser(faience, 'valeur')
  };
  
  // Peinture
  const peinture = (Array.isArray(saisie.peinture) ? saisie.peinture : []).map((p) => {
     const n = nombre(p.nombre);

     // Une surface peut etre fournie directement — c'est par la que passe la
     // reprise automatique des deux faces de maconnerie.
     if (renseigne(p.surface)) {
       const v = net(Number(p.surface) * n);
       return {
         ...p,
         valeur: v,
         typePeinture: p.type || 'latex',
         trace: { calcul: `Surface = ${net(Number(p.surface), 2)} m² × ${n} = ${v} m²` }
       };
     }

     if (!renseigne(p.longueur) || !renseigne(p.hauteur)) {
        return { valeur: null, typePeinture: p.type || 'latex', manquants: ['longueur', 'hauteur'].filter((c) => !renseigne(p[c])) };
     }
     const v = net(p.longueur * p.hauteur * n);
     return {
        ...p,
        valeur: v,
        typePeinture: p.type || 'latex',
        trace: {
          calcul: `Surface = ${p.longueur} × ${p.hauteur} × ${n} = ${v} m²`
        }
     };
  });
  blocs.peinture = {
    libelle: 'Peinture',
    unite: 'm2',
    formule: 'L x H x N',
    lignes: peinture,
    total: totaliser(peinture, 'valeur')
  };

  // Autres Ouvrages (Tâches Libres).
  const autresLignes = (Array.isArray(saisie.autresOuvrages) ? saisie.autresOuvrages : []).map(o => ({
    id: o.id,
    designation: o.designation || 'Tâche sans nom',
    unite: o.unite || 'u',
    quantite: Number(o.quantite) || 0,
    pu: Number(o.pu) || 0
  }));
  blocs.autresOuvrages = {
    libelle: 'Ouvrages Supplémentaires',
    unite: '-',
    formule: 'Quantité Libre',
    lignes: autresLignes,
    total: 0
  };

  // Valeur par défaut pour l'enduit (2x surface maçonnerie) si non saisi explicitement.
  // Le total derive doit exister aussi comme ligne : recettes, resume et devis
  // parcourent les lignes, et un total sans ligne se traduit par un zero muet.
  if ((!blocs.enduits || !blocs.enduits.total) && blocs.maconnerie && blocs.maconnerie.total > 0) {
    if (!blocs.enduits) blocs.enduits = { libelle: 'Enduits', unite: 'm2', lignes: [] };
    const surfaceDeduite = net(blocs.maconnerie.total * 2);
    blocs.enduits.total = surfaceDeduite;
    blocs.enduits.lignes = [
      {
        valeur: surfaceDeduite,
        unite: 'm2',
        manquants: [],
        repere: 'Enduit (deduit)',
        trace: {
          formule: '2 x surface de maconnerie',
          entrees: { surfaceMaconnerie: blocs.maconnerie.total },
          resultat: surfaceDeduite,
          unite: 'm2',
          motif: 'Surface non saisie : deduite des deux faces de la maconnerie.',
        },
      },
    ];
  }

  // Vérification des variantes exclusives
  const hasDalles = blocs.dalles && blocs.dalles.total > 0;
  const hasHourdis = blocs.plancherHourdis && blocs.plancherHourdis.total > 0;
  if (hasDalles && hasHourdis) {
    avertissements.push({
      bloc: 'plancher',
      ligne: 0,
      repere: 'Variantes',
      type: 'variante-exclusive',
      message: 'Dalle pleine et Plancher Hourdis sont saisis simultanément. Une seule variante doit être utilisée.'
    });
  }
  
  if (blocs.peinture?.lignes?.length > 0) {
    const typesSaisis = new Set();
    blocs.peinture.lignes.forEach(p => {
      if (p.valeur > 0) typesSaisis.add(p.typePeinture);
    });
    
    if (typesSaisis.size > 1) {
      avertissements.push({
        bloc: 'peinture',
        ligne: 0,
        repere: 'GLOBAL',
        type: 'exclusion-mutuelle',
        message: 'Plusieurs types de peinture saisis (Latex, Classique, Chaux). Le devis ne doit utiliser qu\'un seul type. Seul le premier type sera retenu pour les matériaux.'
      });
      
      const premierType = Array.from(typesSaisis)[0];
      blocs.peinture.lignes = blocs.peinture.lignes.filter(p => !p.valeur || p.typePeinture === premierType);
      blocs.peinture.total = totaliser(blocs.peinture.lignes, 'valeur');
    }
  }

  const hasCharpente = blocs.charpenteBois && blocs.charpenteBois.total > 0;
  const hasAcrotere = blocs.acrotere && blocs.acrotere.total > 0;
  if (hasCharpente && hasAcrotere) {
    avertissements.push({
      bloc: 'toiture',
      ligne: 0,
      repere: 'Variantes',
      type: 'variante-exclusive',
      message: 'Charpente et Toiture-Terrasse (Acrotère) sont saisis simultanément. Une seule variante doit être utilisée.'
    });
  } else if (hasCharpente) {
    avertissements.push({
      bloc: 'toiture',
      ligne: 0,
      repere: 'Hypothèse',
      type: 'hypothese', // to trigger amber color
      message: 'Le calcul de charpente inclut une majoration forfaitaire de 15% pour couvrir poinçon, fiches, contre-fiches et assemblages.'
    });
  }

  return { blocs, avertissements };
}

/** Vrai si l'utilisateur a commence a remplir la ligne. */
function aUneSaisie(ligne) {
  return CHAMPS_DIMENSION.some((champ) => renseigne(ligne[champ]));
}

/** Dimensions saisies que la formule du bloc n'utilise pas. */
function champsOrphelins(bloc, ligne) {
  const requis = champsRequisEffectifs(bloc, ligne);
  return CHAMPS_DIMENSION.filter(
    (champ) => renseigne(ligne[champ]) && !requis.includes(champ),
  );
}

/**
 * Certains ouvrages se decrivent de plusieurs facons : un enduit se saisit par
 * une surface libre ou par ses dimensions. `requisAlternatifs` liste ces jeux
 * de champs equivalents ; on retient le premier entierement renseigne, et a
 * defaut le jeu principal, pour que le message « champ manquant » reste juste.
 */
function champsRequisEffectifs(bloc, ligne) {
  if (!bloc.requisAlternatifs) return bloc.requis;
  const jeux = [bloc.requis, ...bloc.requisAlternatifs];
  // Un champ explicite (`forme`, ...) tranche avant meme que le jeu soit
  // complet : sans ca, un poteau circulaire a moitie rempli (forme choisie,
  // diametre pas encore tape) se voyait reclamer « longueur, largeur »
  // au lieu de « diametre » — le mauvais message pour la forme choisie.
  if (bloc.requisParChamp) {
    const valeur = ligne[bloc.requisParChamp.champ];
    const index = bloc.requisParChamp.valeurs[valeur];
    if (index !== undefined) return jeux[index];
  }
  return jeux.find((jeu) => jeu.length > 0 && jeu.every((c) => renseigne(ligne[c]))) || bloc.requis;
}

export const _internes = { net, renseigne, nombre, BLOCS, extractionsArmatures };
