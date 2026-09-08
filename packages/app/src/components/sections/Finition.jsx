import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import { AccordionProvider } from '../ui/Accordion.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

const BLOCS_FINITION = ['Enduit Ciment', 'Peinture', 'Faïence Murale', 'Carrelage Sol et Plinthes'];

export default function Finition() {
  const {
    carrelages, setCarrelages,
    enduits, setEnduits,
    peintures, setPeintures,
    faiences, setFaiences,
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
  const currentEnduits = enduits.filter(x => x.niveauId === niveauActifId);
  const currentPeintures = peintures.filter(x => x.niveauId === niveauActifId);
  const currentFaiences = faiences.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Finition</h2>

      <AccordionProvider key={niveauActifId} ids={BLOCS_FINITION}>
      <CarteBloc
        titre="Enduit Ciment"
        onAdd={() => addRow(enduits, setEnduits, { niveauId: niveauActifId, surface: '', nombre: '1' }, 'END')}
        addLabel="Ajouter un enduit"
        totalValeur={getBloc('enduits').total}
        totalUnite={getBloc('enduits').unite}
        totalLabel="Surface totale à enduire"
      >
        <p className="text-sm text-gray-500 mb-4 px-2">
          Laissez la surface vide : elle reprend automatiquement la maçonnerie
          nette de tous les niveaux, <strong>multipliée par 2</strong> — l'enduit
          couvre l'intérieur et l'extérieur. Saisissez une valeur pour l'imposer.
        </p>
        {currentEnduits.map((e, index) => (
          <LigneOuvrage
            key={e.id} repere={e.repere} titre="Zone"
            onRemove={currentEnduits.length > 1 ? () => removeRow(enduits, setEnduits, e.id) : null}
            avertissement={getAvertissementLocal('enduits', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Surface Libre (m²)" value={e.surface} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'surface', v)} unite="m2" placeholder="Auto" />
              <InputSaisie label="Nombre" value={e.nombre} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Surface calculée"
                value={getBloc('enduits').lignes[index]?.valeur || getBloc('enduits').lignes[index]?.surfaceNet}
                unite="m2"
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Peinture"
        onAdd={() => addRow(peintures, setPeintures, { niveauId: niveauActifId, longueur: '', hauteur: '', type: 'latex', nombre: '1' }, 'PNT')}
        addLabel="Ajouter une zone"
        totalValeur={getBloc('peinture').total}
        totalUnite={getBloc('peinture').unite}
        totalLabel="Surface totale à peindre"
      >
        {currentPeintures.map((p, index) => (
          <LigneOuvrage
            key={p.id} repere={p.repere} titre="Mur à peindre"
            onRemove={currentPeintures.length > 1 ? () => removeRow(peintures, setPeintures, p.id) : null}
            avertissement={getAvertissementLocal('peinture', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Type de peinture</label>
                <select
                  value={p.type}
                  onChange={(e) => updateRow(peintures, setPeintures, p.id, 'type', e.target.value)}
                  className="border border-devis-saisie rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-mono"
                >
                  <option value="latex">Latex (S/4 kg)</option>
                  <option value="classique">Classique (S/10 * 2 L)</option>
                  <option value="chaux">Badigeon de chaux (S/6 * 2 kg)</option>
                </select>
              </div>
              <InputSaisie label="Longueur" value={p.longueur} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={p.hauteur} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={p.nombre} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Surface"
                value={getBloc('peinture').lignes[index]?.valeur}
                unite="m2"
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Faïence Murale"
        onAdd={() => addRow(faiences, setFaiences, { niveauId: niveauActifId, longueur: '', hauteur: '', nombre: '1' }, 'FA')}
        addLabel="Ajouter un mur"
        totalValeur={getBloc('faience').total}
        totalUnite={getBloc('faience').unite}
        totalLabel="Surface totale faïence"
      >
        {currentFaiences.map((f, index) => (
          <LigneOuvrage
            key={f.id} repere={f.repere} titre="Mur"
            onRemove={currentFaiences.length > 1 ? () => removeRow(faiences, setFaiences, f.id) : null}
            avertissement={getAvertissementLocal('faience', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <InputSaisie label="Longueur" value={f.longueur} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={f.hauteur} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={f.nombre} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Surface"
                value={getBloc('faience').lignes[index]?.valeur}
                unite="m2"
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

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
      </AccordionProvider>
    </section>
  );
}
