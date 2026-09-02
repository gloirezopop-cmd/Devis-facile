import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

export default function Fondation() {
  const {
    betonProprete, setBetonProprete,
    semelles, setSemelles,
    longrines, setLongrines,
    soubassements, setSoubassements,
    addRow, removeRow, updateRow, niveauActifId
  } = useProjet();
  
  const { metreParNiveau } = useMetre();

  const idx = metreParNiveau.findIndex(m => m.niveauId === niveauActifId);
  const currentMetre = idx >= 0 ? metreParNiveau[idx].metre : { blocs: {}, avertissements: [] };

  const getBloc = (id) => currentMetre.blocs?.[id] || { total: 0, unite: '', lignes: [] };
  const getAvertissementLocal = (blocCode, ligneIndex) => {
    return currentMetre.avertissements?.find(a => a.bloc === blocCode && a.ligne === ligneIndex);
  };

  const currentBP = betonProprete.filter(x => x.niveauId === niveauActifId);
  const currentSemelles = semelles.filter(x => x.niveauId === niveauActifId);
  const currentLongrines = longrines.filter(x => x.niveauId === niveauActifId);
  const currentSoubassements = soubassements.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Fondations & Soubassement</h2>

      <CarteBloc
        titre="Béton de propreté"
        onAdd={() => addRow(betonProprete, setBetonProprete, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseur: '', nombre: '1' }, 'BP')}
        addLabel="Ajouter un béton de propreté"
        totalValeur={getBloc('betonProprete').total}
        totalUnite={getBloc('betonProprete').unite}
        totalLabel="Volume total BP"
      >
        {currentBP.map((bp, index) => (
          <LigneOuvrage
            key={bp.id} repere={bp.repere} titre="Béton de propreté"
            onRemove={currentBP.length > 1 ? () => removeRow(betonProprete, setBetonProprete, bp.id) : null}
            avertissement={getAvertissementLocal('betonProprete', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Longueur" value={bp.longueur} onChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={bp.largeur} onChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Épaisseur" value={bp.epaisseur} onChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'epaisseur', v)} unite="m" />
              <InputSaisie label="Nombre" value={bp.nombre} onChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('betonProprete').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('betonProprete').lignes[index]?.trace}
                overrideValue={bp.override_volume}
                onOverrideChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Semelles Isolées"
        onAdd={() => addRow(semelles, setSemelles, { niveauId: niveauActifId, longueur: '', largeur: '', hauteur: '', nombre: '1', diametrePrin: 10, espacement: 0.15 }, 'S')}
        addLabel="Ajouter type de semelle"
        totalValeur={getBloc('semelles').total}
        totalUnite={getBloc('semelles').unite}
        totalLabel="Volume total semelles"
      >
        {currentSemelles.map((s, index) => (
          <LigneOuvrage
            key={s.id} repere={s.repere} titre="Semelle Isolée (B.A)"
            onRemove={currentSemelles.length > 1 ? () => removeRow(semelles, setSemelles, s.id) : null}
            avertissement={getAvertissementLocal('semelles', index)}
          >
            <div className="grid grid-cols-2 gap-4">
              <InputSaisie label="Longueur (A)" value={s.longueur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur (B)" value={s.largeur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Hauteur (H)" value={s.hauteur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={s.nombre} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('semelles').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('semelles').lignes[index]?.trace}
                overrideValue={s.override_volume}
                onOverrideChange={(v) => updateRow(semelles, setSemelles, s.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Longrines (Chaînage bas)"
        onAdd={() => addRow(longrines, setLongrines, { niveauId: niveauActifId, perimetre: '', largeur: '', hauteur: '' }, 'L')}
        addLabel="Ajouter type de longrine"
        totalValeur={getBloc('longrines').total}
        totalUnite={getBloc('longrines').unite}
        totalLabel="Volume total longrines"
      >
        {currentLongrines.map((l, index) => (
          <LigneOuvrage
            key={l.id} repere={l.repere} titre="Longrine"
            onRemove={currentLongrines.length > 1 ? () => removeRow(longrines, setLongrines, l.id) : null}
            avertissement={getAvertissementLocal('longrines', index)}
          >
            <div className="grid grid-cols-2 gap-4">
              <InputSaisie label="Périmètre (m)" value={l.perimetre} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'perimetre', v)} unite="m" />
              <InputSaisie label="Largeur" value={l.largeur} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={l.hauteur} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'hauteur', v)} unite="m" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('longrines').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('longrines').lignes[index]?.trace}
                overrideValue={l.override_volume}
                onOverrideChange={(v) => updateRow(longrines, setLongrines, l.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Murs de Soubassement"
        onAdd={() => addRow(soubassements, setSoubassements, { niveauId: niveauActifId, longueur: '', hauteur: '', nombre: '1', ouvertures: [] }, 'MS')}
        addLabel="Ajouter section de mur"
        totalValeur={getBloc('soubassement').total}
        totalUnite={getBloc('soubassement').unite}
        totalLabel="Surface nette totale"
      >
        {currentSoubassements.map((m, index) => (
          <LigneOuvrage
            key={m.id} repere={m.repere} titre="Mur"
            onRemove={currentSoubassements.length > 1 ? () => removeRow(soubassements, setSoubassements, m.id) : null}
            avertissement={getAvertissementLocal('soubassement', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Longueur" value={m.longueur} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={m.hauteur} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={m.nombre} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'nombre', v)} unite="u" />
            </div>

            <div className="border-t border-devis-border pt-4 mt-2 bg-gray-50 -mx-3 px-3 pb-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-devis-calcule uppercase">Déductions</h4>
                <button
                  onClick={() => updateRow(soubassements, setSoubassements, m.id, 'ouvertures', [...m.ouvertures, { id: Date.now(), repere: 'O', type: 'Ouverture', largeur: '', hauteur: '', nombre: '1' }])}
                  className="text-xs text-devis-saisie font-bold hover:underline min-h-[44px]"
                >
                  + Ouverture
                </button>
              </div>

              {m.ouvertures.map((ouv, oIdx) => (
                <div key={ouv.id} className="grid grid-cols-2 gap-4 relative mb-3 last:mb-0 border border-gray-200 bg-white p-2 rounded">
                  <button
                    onClick={() => updateRow(soubassements, setSoubassements, m.id, 'ouvertures', m.ouvertures.filter(o => o.id !== ouv.id))}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                  <InputSaisie label="Largeur" value={ouv.largeur} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].largeur = v; updateRow(soubassements, setSoubassements, m.id, 'ouvertures', newOuvs);
                  }} unite="m" />
                  <InputSaisie label="Hauteur" value={ouv.hauteur} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].hauteur = v; updateRow(soubassements, setSoubassements, m.id, 'ouvertures', newOuvs);
                  }} unite="m" />
                  <InputSaisie label="Nombre" value={ouv.nombre} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].nombre = v; updateRow(soubassements, setSoubassements, m.id, 'ouvertures', newOuvs);
                  }} unite="u" />
                </div>
              ))}
              {m.ouvertures.length === 0 && <span className="text-xs text-gray-500 italic">Aucune déduction</span>}
            </div>

            <div className="mt-4">
              <ValeurCalculee
                label="Surface nette"
                value={getBloc('soubassement').lignes[index]?.valeur}
                unite="m2"
                trace={getBloc('soubassement').lignes[index]?.trace}
                overrideValue={m.override_surface}
                onOverrideChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'override_surface', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
    </section>
  );
}
