import { calculerRecettes } from '../src/recettes.js';
import { PARAMETRES } from '../src/parametres.js';

const r1 = calculerRecettes({ betonProprete: { total: 1 } });
console.log("Recettes Beton Proprete:", r1);

const r2 = calculerRecettes({ semelles: { total: 1 } });
console.log("Recettes Semelles:", r2);

