import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

export default function Elevation() {
  const {
    colonnes, setColonnes,
    maconneries, setMaconneries,
    addRow, removeRow, updateRow, niveauActifId
  } = useProjet();
  
  const { metreParNiveau } = useMetre();

  const idx = metreParNiveau.findIndex(m => m.niveauId === niveauActifId);
  const currentMetre = idx >= 0 ? metreParNiveau[idx].metre : { blocs: {}, avertissements: [] };

  const getBloc = (id) => currentMetre.blocs?.[id] || { total: 0, unite: '', lignes: [] };
  const getAvertissementLocal = (blocCode, ligneIndex) => {
    return currentMetre.avertissements?.find(a => a.bloc === blocCode && a.ligne === ligneIndex);
  };

  const currentColonnes = colonnes.filter(x => x.niveauId === niveauActifId);
  const currentMaconneries = maconneries.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Élévation</h2>

      <CarteBloc
        titre="Colonnes (Poteaux)"
        onAdd={() => addRow(colonnes, setColonnes, { niveauId: niveauActifId, sectionA: '', sectionB: '', hauteur: '', nombre: '1', diametrePrin: 12, diametreCadre: 8, nbreBarresPrin: 4, espacementCadre: 0.15 }, 'C')}
        addLabel="Ajouter type de colonne"
        totalValeur={getBloc('poteaux').total}
        totalUnite={getBloc('poteaux').unite}
        totalLabel="Volume total colonnes"
      >
        {currentColonnes.map((c, index) => (
          <LigneOuvrage
            key={c.id} repere={c.repere} titre="Colonne"
            onRemove={currentColonnes.length > 1 ? () => removeRow(colonnes, setColonnes, c.id) : null}
            avertissement={getAvertissementLocal('poteaux', index)}
          >
            <div className="grid grid-cols-2 gap-4">
              <InputSaisie label="Section A" value={c.sectionA} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'sectionA', v)} unite="cm" />
              <InputSaisie label="Section B" value={c.sectionB} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'sectionB', v)} unite="cm" />
              <InputSaisie label="Hauteur" value={c.hauteur} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={c.nombre} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('poteaux').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('poteaux').lignes[index]?.trace}
                overrideValue={c.override_volume}
                onOverrideChange={(v) => updateRow(colonnes, setColonnes, c.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Maçonnerie en Agglos"
        onAdd={() => addRow(maconneries, setMaconneries, { niveauId: niveauActifId, longueur: '', hauteur: '', nombre: '1', ouvertures: [] }, 'M')}
        addLabel="Ajouter section de mur"
        totalValeur={getBloc('maconnerie').total}
        totalUnite={getBloc('maconnerie').unite}
        totalLabel="Surface nette totale"
      >
        {currentMaconneries.map((m, index) => (
          <LigneOuvrage
            key={m.id} repere={m.repere} titre="Mur"
            onRemove={currentMaconneries.length > 1 ? () => removeRow(maconneries, setMaconneries, m.id) : null}
            avertissement={getAvertissementLocal('maconnerie', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Longueur" value={m.longueur} onChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={m.hauteur} onChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={m.nombre} onChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'nombre', v)} unite="u" />
            </div>

            <div className="border-t border-devis-border pt-4 mt-2 bg-gray-50 -mx-3 px-3 pb-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-devis-calcule uppercase">Déductions</h4>
                <button
                  onClick={() => updateRow(maconneries, setMaconneries, m.id, 'ouvertures', [...m.ouvertures, { id: Date.now(), repere: 'O', type: 'Porte', largeur: '', hauteur: '', nombre: '1' }])}
                  className="text-xs text-devis-saisie font-bold hover:underline min-h-[44px]"
                >
                  + Ouverture
                </button>
              </div>

              {m.ouvertures.map((ouv, oIdx) => (
                <div key={ouv.id} className="grid grid-cols-2 gap-4 relative mb-3 last:mb-0 border border-gray-200 bg-white p-2 rounded">
                  <button
                    onClick={() => updateRow(maconneries, setMaconneries, m.id, 'ouvertures', m.ouvertures.filter(o => o.id !== ouv.id))}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                  <InputSaisie label="Largeur" value={ouv.largeur} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].largeur = v; updateRow(maconneries, setMaconneries, m.id, 'ouvertures', newOuvs);
                  }} unite="m" />
                  <InputSaisie label="Hauteur" value={ouv.hauteur} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].hauteur = v; updateRow(maconneries, setMaconneries, m.id, 'ouvertures', newOuvs);
                  }} unite="m" />
                  <InputSaisie label="Nombre" value={ouv.nombre} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].nombre = v; updateRow(maconneries, setMaconneries, m.id, 'ouvertures', newOuvs);
                  }} unite="u" />
                </div>
              ))}
              {m.ouvertures.length === 0 && <span className="text-xs text-gray-500 italic">Aucune déduction</span>}
            </div>

            <div className="mt-4">
              <ValeurCalculee
                label="Surface nette"
                value={getBloc('maconnerie').lignes[index]?.valeur}
                unite="m2"
                trace={getBloc('maconnerie').lignes[index]?.trace}
                overrideValue={m.override_surface}
                onOverrideChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'override_surface', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
    </section>
  );
}
