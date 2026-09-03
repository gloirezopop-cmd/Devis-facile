import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

import ResumeFondation from './ResumeFondation.jsx';

export default function Fondation() {
  const {
    betonProprete, setBetonProprete,
    semelles, setSemelles,
    longrines, setLongrines,
    soubassements, setSoubassements,
    moellons, setMoellons,
    chapeEgalisations, setChapeEgalisations,
    sousPavements, setSousPavements,
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
  const currentMoellons = moellons.filter(x => x.niveauId === niveauActifId);
  const currentChapes = chapeEgalisations.filter(x => x.niveauId === niveauActifId);
  const currentSousPavements = sousPavements.filter(x => x.niveauId === niveauActifId);

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
        titre="Socle Armé (Semelle + Amorce)"
        onAdd={() => addRow(semelles, setSemelles, { 
          niveauId: niveauActifId, 
          longueur: '', largeur: '', hauteur: '', nombre: '1', 
          amorceSectionA: '', amorceSectionB: '', amorceHauteur: '',
          diametrePrin: 10, espacement: 0.15,
          amorceDiametrePrin: 10, amorceNbreBarresPrin: 4,
          amorceDiametreCadre: 8, amorceEspacementCadre: 0.15
        }, 'S')}
        addLabel="Ajouter un socle armé"
        totalValeur={getBloc('semelles').total}
        totalUnite={getBloc('semelles').unite}
        totalLabel="Volume total socle"
      >
        {currentSemelles.map((s, index) => (
          <LigneOuvrage
            key={s.id} repere={s.repere} titre="Socle Armé"
            onRemove={currentSemelles.length > 1 ? () => removeRow(semelles, setSemelles, s.id) : null}
            avertissement={getAvertissementLocal('semelles', index)}
          >
            {/* Dimensions Semelle */}
            <h4 className="text-sm font-bold text-devis-calcule mb-2 border-b border-devis-border pb-1">Dimensions Semelle</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InputSaisie label="Longueur (m)" value={s.longueur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur (m)" value={s.largeur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Hauteur (m)" value={s.hauteur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={s.nombre} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'nombre', v)} unite="u" />
            </div>

            {/* Dimensions Amorce */}
            <h4 className="text-sm font-bold text-devis-calcule mb-2 border-b border-devis-border pb-1">Dimensions Amorce (Optionnelles)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <InputSaisie label="Section A (cm)" value={s.amorceSectionA} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'amorceSectionA', v)} unite="cm" />
              <InputSaisie label="Section B (cm)" value={s.amorceSectionB} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'amorceSectionB', v)} unite="cm" />
              <InputSaisie label="Hauteur (m)" value={s.amorceHauteur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'amorceHauteur', v)} unite="m" />
            </div>

            {/* Hypothèses Armatures */}
            <div className="bg-amber-50 p-3 rounded border border-amber-200 mb-4">
              <h4 className="text-xs font-bold text-amber-800 mb-2 uppercase">Hypothèses d'Armature</h4>
              
              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Maillage Semelle</span>
                <div className="grid grid-cols-2 gap-4">
                  <InputSaisie label="Diam. Principal" value={s.diametrePrin} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'diametrePrin', v)} unite="mm" styleClass="!bg-white" />
                  <InputSaisie label="Espacement" value={s.espacement} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'espacement', v)} unite="m" styleClass="!bg-white" />
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Amorce Principale</span>
                <div className="grid grid-cols-2 gap-4">
                  <InputSaisie label="Diamètre" value={s.amorceDiametrePrin} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'amorceDiametrePrin', v)} unite="mm" styleClass="!bg-white" />
                  <InputSaisie label="Nombre de barres" value={s.amorceNbreBarresPrin} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'amorceNbreBarresPrin', v)} unite="u" styleClass="!bg-white" />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-amber-700 block mb-1">Cadres Amorce</span>
                <div className="grid grid-cols-2 gap-4">
                  <InputSaisie label="Diamètre" value={s.amorceDiametreCadre} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'amorceDiametreCadre', v)} unite="mm" styleClass="!bg-white" />
                  <InputSaisie label="Espacement" value={s.amorceEspacementCadre} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'amorceEspacementCadre', v)} unite="m" styleClass="!bg-white" />
                </div>
              </div>
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
        onAdd={() => addRow(longrines, setLongrines, { niveauId: niveauActifId, perimetre: '', largeur: '', hauteur: '', nombre: '1', diametrePrin: 12, diametreCadre: 6, nbreBarresPrin: 4, espacementCadre: 0.20 }, 'L')}
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
            <h4 className="text-sm font-bold text-devis-calcule mb-2 border-b border-devis-border pb-1">Dimensions Longrine</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InputSaisie label="Périmètre (m)" value={l.perimetre} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'perimetre', v)} unite="m" />
              <InputSaisie label="Largeur (m)" value={l.largeur} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Hauteur (m)" value={l.hauteur} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={l.nombre} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'nombre', v)} unite="u" />
            </div>

            <div className="bg-amber-50 p-3 rounded border border-amber-200 mb-4">
              <h4 className="text-xs font-bold text-amber-800 mb-2 uppercase">Hypothèses d'Armature</h4>
              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Armature Principale</span>
                <div className="grid grid-cols-2 gap-4">
                  <InputSaisie label="Diamètre" value={l.diametrePrin} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametrePrin', v)} unite="mm" styleClass="!bg-white" />
                  <InputSaisie label="Nombre de barres" value={l.nbreBarresPrin} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'nbreBarresPrin', v)} unite="u" styleClass="!bg-white" />
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-amber-700 block mb-1">Cadres</span>
                <div className="grid grid-cols-2 gap-4">
                  <InputSaisie label="Diamètre" value={l.diametreCadre} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametreCadre', v)} unite="mm" styleClass="!bg-white" />
                  <InputSaisie label="Espacement" value={l.espacementCadre} onChange={(v) => updateRow(longrines, setLongrines, l.id, 'espacementCadre', v)} unite="m" styleClass="!bg-white" />
                </div>
              </div>
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
        onAdd={() => addRow(soubassements, setSoubassements, { niveauId: niveauActifId, perimetre: '', hauteur: '', epaisseur: '', nombre: '1', ouvertures: [] }, 'MS')}
        addLabel="Ajouter section de mur"
        totalValeur={getBloc('murSoubassement').total}
        totalUnite={getBloc('murSoubassement').unite}
        totalLabel="Surface nette totale"
      >
        {currentSoubassements.map((m, index) => (
          <LigneOuvrage
            key={m.id} repere={m.repere} titre="Mur"
            onRemove={currentSoubassements.length > 1 ? () => removeRow(soubassements, setSoubassements, m.id) : null}
            avertissement={getAvertissementLocal('murSoubassement', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Périmètre (m)" value={m.perimetre} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'perimetre', v)} unite="m" />
              <InputSaisie label="Hauteur" value={m.hauteur} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Épaisseur" value={m.epaisseur} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'epaisseur', v)} unite="m" placeholder="0.15" />
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
                value={getBloc('murSoubassement').lignes[index]?.valeur}
                unite="m2"
                trace={getBloc('murSoubassement').lignes[index]?.trace}
                overrideValue={m.override_surface}
                onOverrideChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'override_surface', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
      <CarteBloc
        titre="Fondation en Moellon"
        onAdd={() => addRow(moellons, setMoellons, { niveauId: niveauActifId, perimetre: '', largeurBase: '', hauteur: '', nombre: '1' }, 'MO')}
        addLabel="Ajouter moellon"
        totalValeur={getBloc('moellon').total}
        totalUnite={getBloc('moellon').unite}
        totalLabel="Volume total moellon"
      >
        {currentMoellons.map((mo, index) => (
          <LigneOuvrage
            key={mo.id} repere={mo.repere} titre="Moellon"
            onRemove={currentMoellons.length > 1 ? () => removeRow(moellons, setMoellons, mo.id) : null}
            avertissement={getAvertissementLocal('moellon', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Périmètre (m)" value={mo.perimetre} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'perimetre', v)} unite="m" />
              <InputSaisie label="Base (m)" value={mo.largeurBase} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'largeurBase', v)} unite="m" />
              <InputSaisie label="Hauteur (m)" value={mo.hauteur} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={mo.nombre} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('moellon').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('moellon').lignes[index]?.trace}
                overrideValue={mo.override_volume}
                onOverrideChange={(v) => updateRow(moellons, setMoellons, mo.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Chape d'égalisation"
        onAdd={() => addRow(chapeEgalisations, setChapeEgalisations, { niveauId: niveauActifId, perimetre: '', largeur: '', epaisseur: '', nombre: '1' }, 'CH')}
        addLabel="Ajouter chape"
        totalValeur={getBloc('chapeEgalisation').total}
        totalUnite={getBloc('chapeEgalisation').unite}
        totalLabel="Volume total chape"
      >
        {currentChapes.map((ch, index) => (
          <LigneOuvrage
            key={ch.id} repere={ch.repere} titre="Chape"
            onRemove={currentChapes.length > 1 ? () => removeRow(chapeEgalisations, setChapeEgalisations, ch.id) : null}
            avertissement={getAvertissementLocal('chapeEgalisation', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Périmètre (m)" value={ch.perimetre} onChange={(v) => updateRow(chapeEgalisations, setChapeEgalisations, ch.id, 'perimetre', v)} unite="m" />
              <InputSaisie label="Largeur (m)" value={ch.largeur} onChange={(v) => updateRow(chapeEgalisations, setChapeEgalisations, ch.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Épaisseur (m)" value={ch.epaisseur} onChange={(v) => updateRow(chapeEgalisations, setChapeEgalisations, ch.id, 'epaisseur', v)} unite="m" />
              <InputSaisie label="Nombre" value={ch.nombre} onChange={(v) => updateRow(chapeEgalisations, setChapeEgalisations, ch.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('chapeEgalisation').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('chapeEgalisation').lignes[index]?.trace}
                overrideValue={ch.override_volume}
                onOverrideChange={(v) => updateRow(chapeEgalisations, setChapeEgalisations, ch.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Béton de sous-pavement"
        onAdd={() => addRow(sousPavements, setSousPavements, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseur: '', nombre: '1' }, 'SP')}
        addLabel="Ajouter sous-pavement"
        totalValeur={getBloc('sousPavement').total}
        totalUnite={getBloc('sousPavement').unite}
        totalLabel="Volume total"
      >
        {currentSousPavements.map((sp, index) => (
          <LigneOuvrage
            key={sp.id} repere={sp.repere} titre="Sous-pavement"
            onRemove={currentSousPavements.length > 1 ? () => removeRow(sousPavements, setSousPavements, sp.id) : null}
            avertissement={getAvertissementLocal('sousPavement', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Longueur (m)" value={sp.longueur} onChange={(v) => updateRow(sousPavements, setSousPavements, sp.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur (m)" value={sp.largeur} onChange={(v) => updateRow(sousPavements, setSousPavements, sp.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Épaisseur (m)" value={sp.epaisseur} onChange={(v) => updateRow(sousPavements, setSousPavements, sp.id, 'epaisseur', v)} unite="m" />
              <InputSaisie label="Nombre" value={sp.nombre} onChange={(v) => updateRow(sousPavements, setSousPavements, sp.id, 'nombre', v)} unite="u" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('sousPavement').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('sousPavement').lignes[index]?.trace}
                overrideValue={sp.override_volume}
                onOverrideChange={(v) => updateRow(sousPavements, setSousPavements, sp.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <ResumeFondation />
    </section>
  );
}
