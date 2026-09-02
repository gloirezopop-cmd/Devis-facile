import { calculerMetre } from '../src/metre.js';
import { genererDevisParticulier, genererDevisEntreprise } from '../src/valorisation.js';
import { REGLES_DEFAUT } from '../src/regles.js';

const saisie = {
    semelles: [
    { nombre: 12, longueur: 0.35, largeur: 0.35, hauteur: 0.30, amorceSectionA: 15, amorceSectionB: 15, amorceHauteur: 0.55 }
    ],
    longrines: [
    { perimetre: 60.85, largeur: 0.20, hauteur: 0.30, nombre: 1 }
    ],
    murSoubassement: [
    { perimetre: 60.85, hauteur: 0.60, nombre: 1 }
    ],
    chapeEgalisation: [
    { perimetre: 60.85, largeur: 0.40, epaisseur: 0.05, nombre: 1 }
    ],
    sousPavement: [
    { longueur: 9.65, largeur: 7.15, epaisseur: 0.10, nombre: 1 }
    ]
};

const metre = calculerMetre(saisie, REGLES_DEFAUT);
const projet = [{
    niveau: { id: 'rdc', nom: 'RDC' },
    saisie,
    metre
}];

const part = genererDevisParticulier(projet, REGLES_DEFAUT, {});
console.log("Devis Particulier - Total:", part.total);
if (part.lots['fondation']) console.log("Devis Particulier - Fondation:", part.lots['fondation'].sousTotal, "(cible 2 035 617)");

const ent = genererDevisEntreprise(projet, REGLES_DEFAUT, {});
console.log("Devis Entreprise - Total:", ent.total);
if (ent.niveaux['fondation']) console.log("Devis Entreprise - Fondation:", ent.niveaux['fondation'].sousTotal, "(cible 2 651 436)");

