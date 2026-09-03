import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

export default function Terrassement() {
  const { fouilles, setFouilles, fouilleFilante, setFouilleFilante, nivellement, setNivellement, addRow, removeRow, updateRow, niveauActifId } = useProjet();
  const { metreParNiveau } = useMetre();

  const idx = metreParNiveau.findIndex(m => m.niveauId === niveauActifId);
  const currentMetre = idx >= 0 ? metreParNiveau[idx].metre : { blocs: {}, avertissements: [] };

  const getBloc = (id) => currentMetre.blocs?.[id] || { total: 0, unite: '', lignes: [] };
  const getAvertissementLocal = (blocCode, ligneIndex) => {
    return currentMetre.avertissements?.find(a => a.bloc === blocCode && a.ligne === ligneIndex);
  };

  const currentFouilles = fouilles.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Terrassement</h2>
      <p className="text-sm text-gray-600 mb-6 italic">Le terrassement concerne les fouilles et les mouvements de terre.</p>

      <CarteBloc
        titre="Fouilles en rigoles et en puits"
        onAdd={() => addRow(fouilles, setFouilles, { niveauId: niveauActifId, longueur: '', largeur: '', profondeur: '', nombre: '1' }, 'F')}
        addLabel="Ajouter une fouille"
        totalValeur={getBloc('fouilles').total}
        totalUnite={getBloc('fouilles').unite}
        totalLabel="Volume total fouilles"
      >
        {currentFouilles.map((f, index) => (
          <LigneOuvrage
            key={f.id} repere={f.repere} titre="Fouille"
            onRemove={currentFouilles.length > 1 ? () => removeRow(fouilles, setFouilles, f.id) : null}
            avertissement={getAvertissementLocal('fouilles', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Longueur" value={f.longueur} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={f.largeur} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Profondeur" value={f.profondeur} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'profondeur', v)} unite="m" />
              <InputSaisie label="Nombre" value={f.nombre} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'nombre', v)} unite="u" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume (m³)"
                value={getBloc('fouilles').lignes[index]?.valeur}
                unite="m³"
                trace={getBloc('fouilles').lignes[index]?.trace}
                overrideValue={f.override_volume}
                onOverrideChange={(v) => updateRow(fouilles, setFouilles, f.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Fouilles en tranchée (Filante)"
        onAdd={() => addRow(fouilleFilante, setFouilleFilante, { niveauId: niveauActifId, longueur: '', largeur: '', profondeur: '', nombre: '1' }, 'FF')}
        addLabel="Ajouter une fouille filante"
        totalValeur={getBloc('fouilleFilante').total}
        totalUnite={getBloc('fouilleFilante').unite}
        totalLabel="Volume total filante"
      >
        {fouilleFilante.filter(x => x.niveauId === niveauActifId).map((f, index) => (
          <LigneOuvrage
            key={f.id} repere={f.repere} titre="Fouille Filante"
            onRemove={fouilleFilante.filter(x => x.niveauId === niveauActifId).length > 1 ? () => removeRow(fouilleFilante, setFouilleFilante, f.id) : null}
            avertissement={getAvertissementLocal('fouilleFilante', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Longueur" value={f.longueur} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={f.largeur} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Profondeur" value={f.profondeur} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'profondeur', v)} unite="m" />
              <InputSaisie label="Nombre" value={f.nombre} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'nombre', v)} unite="u" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume (m³)"
                value={getBloc('fouilleFilante').lignes[index]?.valeur}
                unite="m³"
                trace={getBloc('fouilleFilante').lignes[index]?.trace}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Nivellement de l'emprise"
        onAdd={() => addRow(nivellement, setNivellement, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseur: '', nombre: '1' }, 'NIV')}
        addLabel="Ajouter un nivellement"
        totalValeur={getBloc('nivellement').total}
        totalUnite={getBloc('nivellement').unite}
        totalLabel="Volume total nivellement"
      >
        {nivellement.filter(x => x.niveauId === niveauActifId).map((n, index) => (
          <LigneOuvrage
            key={n.id} repere={n.repere} titre="Nivellement"
            onRemove={nivellement.filter(x => x.niveauId === niveauActifId).length > 1 ? () => removeRow(nivellement, setNivellement, n.id) : null}
            avertissement={getAvertissementLocal('nivellement', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Longueur" value={n.longueur} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={n.largeur} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Épaisseur" value={n.epaisseur} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'epaisseur', v)} unite="m" />
              <InputSaisie label="Nombre" value={n.nombre} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'nombre', v)} unite="u" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume (m³)"
                value={getBloc('nivellement').lignes[index]?.valeur}
                unite="m³"
                trace={getBloc('nivellement').lignes[index]?.trace}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
    </section>
  );
}
