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
  },

  nivellement: {
    libelle: 'Nivellement de l\'emprise',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'L x l x Ep',
    calcul: (l) => l.longueur * l.largeur * l.epaisseur,
  },

  semelles: {
    libelle: 'Semelles isolées et amorces',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'hauteur'],
    formule: '(Lxlxh + axbxhamorce) x N',
    calcul: (l) => {
      const vSemelle = l.longueur * l.largeur * l.hauteur;
      const vAmorce = ((l.amorceSectionA || 0) / 100) * ((l.amorceSectionB || 0) / 100) * (l.amorceHauteur || 0);
      return (vSemelle + vAmorce) * nombre(l.nombre);
    },
    calculCoffrage: (l) => {
      const surfSemelle = (2 * l.longueur + 2 * l.largeur) * l.hauteur;
      const surfAmorce = (2 * (l.amorceSectionA || 0)/100 + 2 * (l.amorceSectionB || 0)/100) * (l.amorceHauteur || 0);
      return (surfSemelle + surfAmorce) * nombre(l.nombre);
    }
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
      if (saisie && saisie.semelles) {
        saisie.semelles.forEach(sem => {
          const a = (sem.amorceSectionA || 0) / 100;
          const b = (sem.amorceSectionB || 0) / 100;
          // Hauteur H de la longrine
          volAmorces += a * b * l.hauteur * nombre(sem.nombre);
        });
      }
      return volBrut - volAmorces;
    },
    calculCoffrage: (l) => l.perimetre * l.hauteur * 2,
    calculBrut: (l) => l.perimetre * l.largeur * l.hauteur
  },

  murSoubassement: {
    libelle: 'Murs de soubassement',
    unite: 'm2',
    requis: ['perimetre', 'hauteur'],
    formule: 'Perimetre x H',
    calcul: (l) => l.perimetre * l.hauteur
  },
  colonnes: {
    libelle: 'Colonnes',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'hauteur'],
    // Poteau circulaire : meme bloc, forme choisie par l'utilisateur (`forme`),
    // diametre en metres au lieu de longueur/largeur. V = pi x r^2 x H x N.
    requisAlternatifs: [['diametre', 'hauteur']],
    requisParChamp: { champ: 'forme', valeurs: { rectangulaire: 0, circulaire: 1 } },
    formule: 'a x b x H x N (rectangulaire), ou pi x (d/2)^2 x H x N (circulaire)',
    calcul: (l) =>
      l.forme === 'circulaire'
        ? Math.PI * (l.diametre / 2) ** 2 * l.hauteur * nombre(l.nombre)
        : l.longueur * l.largeur * l.hauteur * nombre(l.nombre),
    calculCoffrage: (l) =>
      l.forme === 'circulaire'
        ? Math.PI * l.diametre * l.hauteur * nombre(l.nombre)
        : (2 * l.longueur + 2 * l.largeur) * l.hauteur * nombre(l.nombre)
  },
  ceintures: {
    libelle: 'Ceintures et Chaînages',
    unite: 'm3',
    requis: ['perimetre', 'largeur', 'hauteur'],
    formule: 'Périmètre x l x h x N',
    calcul: (l) => l.perimetre * l.largeur * l.hauteur * nombre(l.nombre),
    calculCoffrage: (l) => l.perimetre * l.hauteur * 2 * nombre(l.nombre)
  },
  linteaux: {
    libelle: 'Linteaux et Appuis',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'hauteur'],
    formule: 'L x l x h x N',
    calcul: (l) => l.longueur * l.largeur * l.hauteur * nombre(l.nombre),
    calculCoffrage: (l) => l.longueur * (2 * l.hauteur + l.largeur) * nombre(l.nombre)
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
            message: `${repere} : 2h + g = ${arrondi(blondel)} m, hors de la plage de Blondel 0,60–0,65 m.`,
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

  moellon: {
    libelle: 'Fondation en moellon',
    unite: 'm3',
    requis: ['perimetre', 'largeurBase', 'hauteur'],
    formule: 'Perimetre x Base x H',
    calcul: (l) => l.perimetre * l.largeurBase * l.hauteur
  },

  chapeEgalisation: {
    libelle: 'Chape d\'égalisation',
    unite: 'm3',
    requis: ['perimetre', 'largeur', 'epaisseur'],
    formule: 'Perimetre x largeur x Ep',
    calcul: (l) => l.perimetre * l.largeur * l.epaisseur,
    calculCoffrage: (l) => l.perimetre * l.epaisseur * 2
  },

  sousPavement: {
    libelle: 'Béton de sous-pavement',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'L x l x Ep',
    calcul: (l) => l.longueur * l.largeur * l.epaisseur
  },

  poutres: {
    libelle: 'Poutres, chainages et linteaux',
    unite: 'm3',
    requis: ['largeurCm', 'hauteurCm', 'longueur'],
    formule: 'N x (larg/100) x (haut/100) x L',
    calcul: (l) =>
      nombre(l.nombre) * (l.largeurCm / 100) * (l.hauteurCm / 100) * l.longueur,
  },

  dalles: {
    libelle: 'Dalles pleines',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseurCm'],
    formule: 'L x l x (Ep/100) x N',
    calcul: (l) => l.longueur * l.largeur * (l.epaisseurCm / 100) * nombre(l.nombre),
    calculCoffrage: (l) => l.longueur * l.largeur * 1.12 * nombre(l.nombre)
  },

  plancherHourdis: {
    libelle: 'Plancher Hourdis',
    unite: 'm2',
    requis: ['longueur', 'largeur'],
    formule: 'L x l x N',
    calcul: (l) => l.longueur * l.largeur * nombre(l.nombre),
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
    }
  },

  couvertureToles: {
    libelle: 'Couverture en Tôles',
    unite: 'm2',
    requis: ['longueur', 'portee', 'debord'],
    formule: '(L + 2*debord) x (portee + 2*debord)',
    calcul: (l) => (l.longueur + 2 * l.debord) * (l.portee + 2 * l.debord) * nombre(l.nombre),
  },

  acrotere: {
    libelle: 'Chaînage Acrotère',
    unite: 'm3',
    requis: ['perimetre', 'largeur', 'hauteur'],
    formule: 'Perimetre x l x H',
    calcul: (l) => l.perimetre * l.largeur * l.hauteur * nombre(l.nombre),
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
  },

  nivellement: {
    libelle: 'Nivellement de l\'emprise',
    unite: 'm3',
    requis: ['longueur', 'largeur', 'epaisseur'],
    formule: 'L x l x Ep',
    calcul: (l) => l.longueur * l.largeur * l.epaisseur,
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
        formule: bloc.formule,
        entrees: {},
        resultat: null,
        unite: bloc.unite,
        motif: `Dimension manquante : ${manquants.join(', ')}`,
      },
    };
  }

  const entrees = { nombre: nombre(ligne.nombre) };
  for (const champ of bloc.requis) entrees[champ] = ligne[champ];

  const valeur = net(bloc.calcul(ligne, regles, saisie));
  const res = {
    valeur,
    unite: bloc.unite,
    manquants: [],
    trace: { formule: bloc.formule, entrees, resultat: valeur, unite: bloc.unite },
  };
  
  if (bloc.calculCoffrage) {
    res.surfaceCoffrage = net(bloc.calculCoffrage(ligne, regles, saisie));
    const typeSurface = (bloc === BLOCS.dalles) ? 'Hypothèse (Ratio)' : 'Géométrique';
    res.coffrage = calculerCoffrage({ surface: res.surfaceCoffrage, typeSurface });
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
    const dPrin = l.diametrePrin || h.diametrePrin || 10;
    const espacement = l.espacement || h.espacement || 0.15;
    
    const n = nombre(l.nombre);
    const enrobage = PARAMETRES.armatures.enrobage; // 0.02

    const lignes = [];

    const nbreBarresL = Math.ceil(l.largeur / espacement) + 1;
    const nbreBarresLarg = Math.ceil(l.longueur / espacement) + 1;

    // Regroupement pour les semelles carrées (pour retomber exactement sur les totaux du classeur)
    if (l.longueur === l.largeur && !l.overrides_nappeL && !l.overrides_nappel) {
      lignes.push(calculerBlocArmature({
        designation: 'Nappe (Quadrillage)',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: (nbreBarresL + nbreBarresLarg) * n,
        longueurDeveloppee: l.longueur - 2 * enrobage + 2 * 0.10,
        espacement,
        overrides: l.overrides_nappe
      }));
    } else {
      // 1. Maillage Sens 1 (Longueur L)
      lignes.push(calculerBlocArmature({
        designation: 'Nappe (Sens Longueur)',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresL * n,
        longueurDeveloppee: l.longueur - 2 * enrobage + 2 * 0.10,
        espacement,
        overrides: l.overrides_nappeL
      }));

      // 2. Maillage Sens 2 (Largeur l)
      lignes.push(calculerBlocArmature({
        designation: 'Nappe (Sens Largeur)',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresLarg * n,
        longueurDeveloppee: l.largeur - 2 * enrobage + 2 * 0.10,
        espacement,
        overrides: l.overrides_nappel
      }));
    }

    if (l.amorceSectionA && l.amorceSectionB && l.amorceHauteur) {
      // Amorce 
      const hAmorce = acierHyp(regles, 'poteaux');
      const dAmorcePrin = l.amorceDiametrePrin || hAmorce.diametrePrin || 10;
      const dAmorceCadre = l.amorceDiametreCadre || hAmorce.diametreCadre || 8;
      const nbreBarresAmorce = l.amorceNbreBarresPrin || hAmorce.nbreBarresPrin || 4;
      const espacementAmorce = l.amorceEspacementCadre || hAmorce.espacementCadre || 0.15;

      // 3. Amorce de colonne (Principale)
      lignes.push(calculerBlocArmature({
        designation: 'Amorce Principale',
        diametre: dAmorcePrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresAmorce * n,
        longueurDeveloppee: l.amorceHauteur + l.hauteur + calculerRecouvrement(dAmorcePrin, PARAMETRES.nuancePrincipaleParDefaut),
        espacement: null,
        overrides: l.overrides_amorcePrin
      }));

      // 4. Cadres de l'amorce
      const nbreCadresAmorce = Math.ceil(l.amorceHauteur / espacementAmorce) + 1;
      lignes.push(calculerBlocArmature({
        designation: 'Cadre Amorce',
        diametre: dAmorceCadre,
        nuance: PARAMETRES.nuanceCadresParDefaut,
        nombreDeFilesTotal: nbreCadresAmorce * n,
        longueurDeveloppee: ((l.amorceSectionA / 100 - 2 * enrobage) + (l.amorceSectionB / 100 - 2 * enrobage)) * 2,
        espacement: espacementAmorce,
        overrides: l.overrides_amorceCadres
      }));
    }

    return lignes;
  },
  longrines: (l, regles) => {
    if (!l.perimetre || !l.largeur || !l.hauteur) return [];
    const h = acierHyp(regles, 'longrines');
    const dPrin = l.diametrePrin || h.diametrePrin || 12;
    const dCadre = l.diametreCadre || h.diametreCadre || 6;
    const nbreBarresPrin = l.nbreBarresPrin || h.nbreBarresPrin || 4;
    const espacement = l.espacementCadre || h.espacementCadre || 0.20;

    const enrobage = PARAMETRES.armatures.enrobage;

    return [
      calculerBlocArmature({
        designation: 'Principale',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: nbreBarresPrin, // files = nombre de barres (déjà à l'échelle du bâtiment)
        longueurDeveloppee: l.perimetre,
        espacement: null,
        overrides: l.overrides_prin
      }),
      calculerBlocArmature({
        designation: 'Cadre',
        diametre: dCadre,
        nuance: PARAMETRES.nuanceCadresParDefaut,
        nombreDeFilesTotal: Math.ceil(l.perimetre / espacement) + 1,
        longueurDeveloppee: ((l.largeur - 2 * enrobage) + (l.hauteur - 2 * enrobage)) * 2,
        espacement,
        overrides: l.overrides_cadre
      })
    ];
  },
  colonnes: (l, regles) => {
    const circulaire = l.forme === 'circulaire';
    if (circulaire ? (!l.diametre || !l.hauteur) : (!l.longueur || !l.largeur || !l.hauteur)) return [];
    const h = acierHyp(regles, 'colonnes');
    const dPrin = l.diametrePrin || h.diametrePrin || 12;
    const dCadre = l.diametreCadre || h.diametreCadre || 8;
    const nbreBarresPrin = l.nbreBarresPrin || h.nbreBarresPrin || 4;
    const espacement = l.espacementCadre || h.espacementCadre || 0.15;

    const n = nombre(l.nombre);
    const enrobage = PARAMETRES.armatures.enrobage;

    // Cadre (ou spirale/frette) : perimetre rectangulaire, ou circonference au
    // nu des aciers principaux (diametre - 2 x enrobage) pour un poteau rond.
    const developpeeCadre = circulaire
      ? Math.PI * (l.diametre - 2 * enrobage)
      : ((l.longueur - 2 * enrobage) + (l.largeur - 2 * enrobage)) * 2;

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
        designation: circulaire ? 'Frette (spirale)' : 'Cadre',
        diametre: dCadre,
        nuance: PARAMETRES.nuanceCadresParDefaut,
        nombreDeFilesTotal: n * (Math.ceil(l.hauteur / espacement) + 1),
        longueurDeveloppee: developpeeCadre,
        espacement,
        overrides: l.overrides_cadre
      })
    ];
  },
  ceintures: (l, regles) => {
    if (!l.perimetre || !l.largeur || !l.hauteur) return [];
    const h = acierHyp(regles, 'ceintures');
    const dPrin = l.diametrePrin || h.diametrePrin || 12;
    const dCadre = l.diametreCadre || h.diametreCadre || 6;
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
        longueurDeveloppee: l.perimetre,
        espacement: null,
        overrides: l.overrides_prin
      }),
      calculerBlocArmature({
        designation: 'Cadre',
        diametre: dCadre,
        nuance: PARAMETRES.nuanceCadresParDefaut,
        nombreDeFilesTotal: n * (Math.ceil(l.perimetre / espacement) + 1),
        longueurDeveloppee: ((l.largeur - 2 * enrobage) + (l.hauteur - 2 * enrobage)) * 2,
        espacement,
        overrides: l.overrides_cadre
      })
    ];
  },
  linteaux: (l, regles) => {
    if (!l.longueur || !l.largeur || !l.hauteur) return [];
    const h = acierHyp(regles, 'linteaux');
    const dPrin = l.diametrePrin || h.diametrePrin || 10;
    const nbreBarresPrin = l.nbreBarresPrin || h.nbreBarresPrin || 2;

    const n = nombre(l.nombre);
    const enrobage = PARAMETRES.armatures.enrobage;

    return [
      calculerBlocArmature({
        designation: 'Principale',
        diametre: dPrin,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: n * nbreBarresPrin,
        longueurDeveloppee: l.longueur - 2 * enrobage, // pas de recouvrement sur linteau
        espacement: null,
        overrides: l.overrides_prin
      })
      // Pas de cadres sur les linteaux selon le guide
    ];
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
        overrides: overridesL || {}
      }),
      calculerBlocArmature({
        designation: designationl || 'Nappe suivant l',
        diametre,
        nuance: PARAMETRES.nuancePrincipaleParDefaut,
        nombreDeFilesTotal: (Math.ceil(longueur / espacement) + 1) * (nombre || 1),
        longueurDeveloppee: ldSensl,
        espacement,
        overrides: overridesl || {}
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
  if (key === 'semelles') return { diametrePrin: 10, espacement: 0.15 };
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

  const epaisseurMur = mur.epaisseur || 0.15;
  const lBloc = mur.longueurBloc || 0.40;
  const hBloc = mur.hauteurBloc || 0.20;
  const joint = PARAMETRES.mortier.jointMaconnerie || 0.015;
  const majoration = regles?.majorations?.blocs || PARAMETRES.majorations?.blocs || 1.10;

  const sp = (lBloc + joint) * (hBloc + joint);
  const nombreBlocsNet = Math.ceil(valeur / sp);
  const nombreBlocs = Math.ceil(nombreBlocsNet * majoration);
  const volumeMortier = nombreBlocsNet * (sp - (lBloc * hBloc)) * epaisseurMur;

  return {
    valeur,
    unite: 'm2',
    manquants: [],
    surfaceBrute: brute,
    deductions,
    detailDeductions,
    nombreBlocs,
    nombreBlocsNet,
    volumeMortier: net(volumeMortier),
    trace: {
      formule: '(L x H x N) - deductions',
      entrees: { longueur: mur.longueur, hauteur: mur.hauteur, nombre: n },
      surfaceBrute: brute,
      deductions: detailDeductions,
      totalDeductions: deductions,
      resultat: valeur,
      unite: 'm2',
      blocsCalcul: `CEIL(${valeur.toFixed(2)} / ${sp.toFixed(4)} * ${majoration})`,
      nombreBlocs,
      nombreBlocsNet,
      volumeMortier: net(volumeMortier),
    },
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
    (m) => calculerMur(m, regles),
  );
  blocs.soubassement = {
    libelle: 'Murs de soubassement (Agglos pleins)',
    unite: 'm2',
    formule: '(L x H x N) - deductions',
    lignes: mursSoubassement,
    surfaceBrute: totaliser(mursSoubassement, 'surfaceBrute'),
    deductions: totaliser(mursSoubassement, 'deductions'),
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
     return { ...f, valeur: net(f.longueur * f.hauteur * nombre(f.nombre)) };
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
     if (!renseigne(p.longueur) || !renseigne(p.hauteur)) {
        return { valeur: null, typePeinture: p.type || 'latex', manquants: ['longueur', 'hauteur'].filter((c) => !renseigne(p[c])) };
     }
     return { ...p, valeur: net(p.longueur * p.hauteur * nombre(p.nombre)), typePeinture: p.type || 'latex' };
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
