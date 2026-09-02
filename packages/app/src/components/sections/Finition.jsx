import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

export default function Finition() {
  const {
    carrelages, setCarrelages,
    addRow, removeRow, updateRow, niveauActifId
  } = useProjet();
  
  const { metreParNiveau } = useMetre();

  const idx = metreParNiveau.findIndex(m => m.niveauId === niveauActifId);
  const currentMetre = idx >= 0 ? metreParNiveau[idx].metre : { blocs: {}, avertissements: [] };

  const getBloc = (id) => currentMetre.blocs?.[id] || { total: 0, unite: '', lignes: [] };
  const getAvertissementLocal = (blocCode, ligneIndex) => {
    return currentMetre.avertissements?.find(a => a.bloc === blocCode && a.ligne === ligneIndex);
  };

  const currentCarrelages = carrelages.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Finition</h2>

      <CarteBloc
        titre="Carrelage Sol et Plinthes"
        onAdd={() => addRow(carrelages, setCarrelages, { niveauId: niveauActifId, longueur: '', largeur: '', nombre: '1', perimetre: '' }, 'SDB')}
        addLabel="Ajouter une pièce"
        totalValeur={getBloc('carrelage').total}
        totalUnite={getBloc('carrelage').unite}
        totalLabel="Surface totale carrelée"
      >
        {currentCarrelages.map((c, index) => (
          <LigneOuvrage
            key={c.id} repere={c.repere} titre="Pièce"
            onRemove={currentCarrelages.length > 1 ? () => removeRow(carrelages, setCarrelages, c.id) : null}
            avertissement={getAvertissementLocal('carrelage', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Longueur" value={c.longueur} onChange={(v) => updateRow(carrelages, setCarrelages, c.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={c.largeur} onChange={(v) => updateRow(carrelages, setCarrelages, c.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Périmètre Forcé" value={c.perimetre} onChange={(v) => updateRow(carrelages, setCarrelages, c.id, 'perimetre', v)} unite="ml" placeholder="Auto" />
              <InputSaisie label="Nombre" value={c.nombre} onChange={(v) => updateRow(carrelages, setCarrelages, c.id, 'nombre', v)} unite="u" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Surface au sol"
                value={getBloc('carrelage').lignes[index]?.surface}
                unite="m2"
                trace={getBloc('carrelage').lignes[index]?.trace}
                overrideValue={c.override_surface}
                onOverrideChange={(v) => updateRow(carrelages, setCarrelages, c.id, 'override_surface', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
    </section>
  );
}
