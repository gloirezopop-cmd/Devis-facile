const val = require('./src/valorisation.js');
const regles = require('./src/regles.js').REGLES_DEFAUT;
const parametres = require('./src/parametres.js').PARAMETRES;

const res = val.genererSousDetailPrix('semelles', { total: 1 }, regles, {});
console.log(res);

const fauxBlocs = { semelles: { total: 1, totalCoffrage: 0.9 }, armatures: { lignes: [{ id: 'acierHA_10', unite: 'kg', quantite: 130, poids: 130 }] } };
const { calculerRecettes } = require('./src/recettes.js');
const recettes = calculerRecettes(fauxBlocs);
console.log(recettes);

let deb = 0;
for (const [id, mat] of Object.entries(recettes)) {
    const quantite = mat.quantiteNette;
    
    let puKey = id;
    if (id === 'bois_charpente') puKey = 'chevrons';
    if (id === 'clous_charpente' || id === 'clous_toiture' || id === 'clous') puKey = 'clousKg';
    if (id === 'faitieres') puKey = 'toleFaitierePiece';
    if (id === 'toles') puKey = 'toleBG28Piece';

    let pu = parametres.prixUnitaires[puKey] ?? parametres.prixUnitaires[id] ?? 0;
    
    if (['eau', 'eauM3'].includes(puKey) && mat.unite === 'L') {
      pu = pu / 1000;
    } else if (puKey.startsWith('acier') && mat.unite === 'kg') {
      const match = puKey.match(/_(\d+)$/);
      if (match) {
        const diam = match[1];
        const pL = parametres.aciersPoidsLineique[diam] || 0.617;
        pu = pu / (12 * pL); // le PU est pour une barre de 12m, on cherche le prix au kg
      }
    }
    console.log(id, 'quantite:', quantite, 'puKey:', puKey, 'pu:', pu, 'pt:', quantite * pu);
    deb += quantite * pu;
}
console.log("Total deb:", deb);
