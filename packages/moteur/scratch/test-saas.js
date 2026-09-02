import { calculerMetre } from '../src/metre.js';
import { genererDevisParticulier, genererDevisEntreprise, genererSousDetailPrix } from '../src/valorisation.js';
import { REGLES_DEFAUT } from '../src/regles.js';
import { PARAMETRES } from '../src/parametres.js';

const sdProprete = genererSousDetailPrix('betonProprete', { total: 1 }, REGLES_DEFAUT, {});
console.log(`Prix tout compris du m3 de béton de propreté : ${sdProprete.prixVenteUnitaire} FCFA (cible 73 744)`);
console.log(sdProprete);

const sdArmeDefaut = genererSousDetailPrix('semelles', { total: 1 }, REGLES_DEFAUT, {});
console.log(`Prix tout compris du m3 de béton armé au ratio forfaitaire : ${sdArmeDefaut.prixVenteUnitaire} FCFA (cible 273 288)`);
console.log(sdArmeDefaut);
