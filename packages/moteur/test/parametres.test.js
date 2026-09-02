import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PARAMETRES, calculerRecouvrement, prixBarre } from '../src/parametres.js';

describe('Paramètres et règles globales', () => {
  it('calculerRecouvrement()', () => {
    // 12mm en FeE400 (HA) = 12/1000 * 40 = 0.48
    assert.equal(calculerRecouvrement(12, 'FeE400'), 0.48);

    // 8mm en FeE235 (RL) = 8/1000 * 50 = 0.40
    assert.equal(calculerRecouvrement(8, 'FeE235'), 0.40);
  });

  it('prixBarre()', () => {
    // 12mm en HA -> prixUnitaires.acierHA_12
    assert.equal(prixBarre(12, 'FeE400'), PARAMETRES.prixUnitaires.acierHA_12);

    // 8mm en RL -> prixUnitaires.acierRL_8
    assert.equal(prixBarre(8, 'FeE235'), PARAMETRES.prixUnitaires.acierRL_8);
  });
});
