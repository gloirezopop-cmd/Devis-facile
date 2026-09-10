import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import { AccordionProvider } from '../ui/Accordion.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';
import SelectSaisie from '../ui/SelectSaisie.jsx';

import ResumeFondation from './ResumeFondation.jsx';

const TYPE_BARRE_OPTIONS = [
  { label: 'Droite', value: 'droite' },
  { label: '1 crochet', value: '1_crochet' },
  { label: '2 crochets', value: '2_crochets' }
];

const LC_OPTIONS = [
  { label: '0 m (Sans crochets)', value: 0 },
  { label: '0.10 m', value: 0.10 },
  { label: '0.15 m', value: 0.15 },
  { label: '0.20 m', value: 0.20 },
  { label: '0.25 m', value: 0.25 },
  { label: '0.30 m', value: 0.30 }
];

const ENROBAGE_OPTIONS = [
  { label: '3 cm (0.03m)', value: 0.03 },
  { label: '4 cm (0.04m)', value: 0.04 },
  { label: '5 cm (0.05m)', value: 0.05 }
];

// Le remblai n'est plus saisi ici : il se calcule seul, à partir des fouilles,
// des semelles, des longrines et des murs de soubassement. Le montrer comme un
// ouvrage à mesurer aurait laissé croire qu'il fallait le mesurer soi-même.
// Sa valeur reste consultable dans la Note de Calcul, à côté du déblai.
const BLOCS_FONDATION = [
  'Béton de propreté', 'Semelles Isolées', 'Amorces (Poteaux courts)',
  'Longrines (Chaînage bas)', 'Murs de Soubassement', 'Fondation en Moellon',
  'Dallage', 'Béton de sous-pavement'
];

const LA_OPTIONS = [
  { label: '40 × Ø', value: '40D' },
  { label: '50 × Ø', value: '50D' },
  { label: '0.50 m', value: 0.50 },
  { label: '0.60 m', value: 0.60 },
  { label: '0.80 m', value: 0.80 },
  { label: '1.00 m', value: 1.00 }
];

export default function Fondation() {
  const {
    betonProprete, setBetonProprete,
    semelles, setSemelles,
    amorces, setAmorces,
    longrines, setLongrines,
    soubassements, setSoubassements,
    moellons, setMoellons,
    dallages, setDallages,
    sousPavements, setSousPavements,
    parametresProjet, setParametresProjet,
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
  const currentAmorces = amorces.filter(x => x.niveauId === niveauActifId);
  const currentLongrines = longrines.filter(x => x.niveauId === niveauActifId);
  const currentSoubassements = soubassements.filter(x => x.niveauId === niveauActifId);
  const currentMoellons = moellons.filter(x => x.niveauId === niveauActifId);
  const currentDallages = (dallages || []).filter(x => x.niveauId === niveauActifId);
  const currentSousPavements = (sousPavements || []).filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Fondations & Soubassement</h2>

      <AccordionProvider key={niveauActifId} ids={BLOCS_FONDATION}>
      <CarteBloc
        titre="Béton de propreté"
        onAdd={() => addRow(betonProprete, setBetonProprete, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseur: '', nombre: '1' }, 'BP')}
        addLabel="Ajouter un béton de propreté"
        totalValeur={getBloc('betonProprete').total}
        totalUnite={getBloc('betonProprete').unite}
        totalLabel="Volume total BP"
      >
        <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres globaux du béton</h4>
          <div className="flex gap-4 w-full md:w-auto">
            <SelectSaisie
              label="Dosage (kg/m³)"
              value={parametresProjet.dosageBP || 150}
              onChange={(v) => setParametresProjet({...parametresProjet, dosageBP: Number(v)})}
              options={[
                {label: '150 kg/m³', value: 150},
                {label: '200 kg/m³', value: 200},
                {label: '250 kg/m³', value: 250},
                {label: '300 kg/m³', value: 300},
                {label: '350 kg/m³', value: 350},
                {label: '400 kg/m³', value: 400}
              ]}
            />
            <SelectSaisie
              label="Type de ciment"
              value={parametresProjet.cimentTypeBP || '42.5'}
              onChange={(v) => setParametresProjet({...parametresProjet, cimentTypeBP: v})}
              options={[
                {label: 'Ciment 32.5', value: '32.5'},
                {label: 'Ciment 42.5', value: '42.5'}
              ]}
            />
          </div>
        </div>

        {currentBP.map((bp, index) => (
          <LigneOuvrage
            key={bp.id} repere={bp.repere} titre="Béton de propreté"
            onRemove={currentBP.length > 1 ? () => removeRow(betonProprete, setBetonProprete, bp.id) : null}
            avertissement={getAvertissementLocal('betonProprete', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Longueur" value={bp.longueur} onChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={bp.largeur} onChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Épaisseur" value={bp.epaisseur} onChange={(v) => updateRow(betonProprete, setBetonProprete, bp.id, 'epaisseur', v)} unite="m" placeholder="0.05" />
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

      {/* SEMELLES ISOLEES */}
      <CarteBloc
        titre="Semelles Isolées"
        onAdd={() => addRow(semelles, setSemelles, { niveauId: niveauActifId, longueur: '', largeur: '', hauteur: '', nombre: '1', diametrePrin: 10, espacement: 0.15, enrobage: 0.05, typeBarreL: '2_crochets', LcL: 0.15, typeBarreLarg: '2_crochets', LcLarg: 0.15 }, 'S')}
        addLabel="Ajouter une semelle"
        totalValeur={getBloc('semelles').total}
        totalUnite={getBloc('semelles').unite}
        totalLabel="Volume total semelles"
      >
        <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres globaux du béton</h4>
          <div className="flex gap-4 w-full md:w-auto">
            <SelectSaisie
              label="Dosage (kg/m³)"
              value={parametresProjet.dosageSemelles || 350}
              onChange={(v) => setParametresProjet({...parametresProjet, dosageSemelles: Number(v)})}
              options={[
                {label: '250 kg/m³', value: 250},
                {label: '300 kg/m³', value: 300},
                {label: '350 kg/m³', value: 350},
                {label: '400 kg/m³', value: 400}
              ]}
            />
            <SelectSaisie
              label="Type de ciment"
              value={parametresProjet.cimentTypeSemelles || '42.5'}
              onChange={(v) => setParametresProjet({...parametresProjet, cimentTypeSemelles: v})}
              options={[
                {label: 'Ciment 32.5', value: '32.5'},
                {label: 'Ciment 42.5', value: '42.5'}
              ]}
            />
          </div>
        </div>

        {currentSemelles.map((s, index) => (
          <LigneOuvrage key={s.id} repere={s.repere} titre="Semelle"
            onRemove={currentSemelles.length > 1 ? () => removeRow(semelles, setSemelles, s.id) : null}
            avertissement={getAvertissementLocal('semelles', index)}>
            <h4 className="text-sm font-bold text-devis-calcule mb-2 border-b border-devis-border pb-1">Dimensions Semelle</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InputSaisie label="Longueur (m)" value={s.longueur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur (m)" value={s.largeur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Hauteur (m)" value={s.hauteur} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={s.nombre} onChange={(v) => updateRow(semelles, setSemelles, s.id, 'nombre', v)} unite="u" />
            </div>

            {/* Hypothèses Armatures Semelles */}
            <div className="bg-amber-50 p-3 rounded border border-amber-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-amber-800 uppercase">Armatures Semelle</h4>
                <div className="w-48">
                  <SelectSaisie
                    label="Enrobage (c)"
                    value={s.enrobage || 0.05}
                    onChange={(v) => updateRow(semelles, setSemelles, s.id, 'enrobage', Number(v))}
                    options={ENROBAGE_OPTIONS}
                    styleClass="!bg-white"
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Nappe sens Longueur (L)</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SelectSaisie
                    label="Diam. Principal"
                    value={s.diametrePrinL || s.diametrePrin || 10}
                    onChange={(v) => updateRow(semelles, setSemelles, s.id, 'diametrePrinL', Number(v))}
                    options={[
                      {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Espacement (m)"
                    value={s.espacementL || s.espacement || 0.15}
                    onChange={(v) => updateRow(semelles, setSemelles, s.id, 'espacementL', Number(v))}
                    options={[
                      {label: '0.10 m', value: 0.10}, {label: '0.15 m', value: 0.15}, {label: '0.20 m', value: 0.20}, {label: '0.25 m', value: 0.25}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Type Barre"
                    value={s.typeBarreL || '2_crochets'}
                    onChange={(v) => updateRow(semelles, setSemelles, s.id, 'typeBarreL', v)}
                    options={TYPE_BARRE_OPTIONS}
                    styleClass="!bg-white"
                  />
                  {s.typeBarreL !== 'droite' && (
                    <SelectSaisie
                      label="Longueur Crochet Lc"
                      value={s.LcL || 0.15}
                      onChange={(v) => updateRow(semelles, setSemelles, s.id, 'LcL', Number(v))}
                      options={LC_OPTIONS}
                      styleClass="!bg-white"
                    />
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-amber-700 block mb-1">Nappe sens Largeur (l)</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SelectSaisie
                    label="Diam. Principal"
                    value={s.diametrePrinLarg || s.diametrePrin || 10}
                    onChange={(v) => updateRow(semelles, setSemelles, s.id, 'diametrePrinLarg', Number(v))}
                    options={[
                      {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Espacement (m)"
                    value={s.espacementLarg || s.espacement || 0.15}
                    onChange={(v) => updateRow(semelles, setSemelles, s.id, 'espacementLarg', Number(v))}
                    options={[
                      {label: '0.10 m', value: 0.10}, {label: '0.15 m', value: 0.15}, {label: '0.20 m', value: 0.20}, {label: '0.25 m', value: 0.25}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Type Barre"
                    value={s.typeBarreLarg || '2_crochets'}
                    onChange={(v) => updateRow(semelles, setSemelles, s.id, 'typeBarreLarg', v)}
                    options={TYPE_BARRE_OPTIONS}
                    styleClass="!bg-white"
                  />
                  {s.typeBarreLarg !== 'droite' && (
                    <SelectSaisie
                      label="Longueur Crochet Lc"
                      value={s.LcLarg || 0.15}
                      onChange={(v) => updateRow(semelles, setSemelles, s.id, 'LcLarg', Number(v))}
                      options={LC_OPTIONS}
                      styleClass="!bg-white"
                    />
                  )}
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

      {/* AMORCES (Poteaux courts) */}
      <CarteBloc
        titre="Amorces (Poteaux courts)"
        onAdd={() => addRow(amorces, setAmorces, { niveauId: niveauActifId, longueur: '', largeur: '', hauteur: '', nombre: '1', diametrePrin: 10, diametreCadre: 8, espacementCadre: 0.15, nbreBarresPrin: 4, enrobage: 0.05, La: '40D', LcCadre: 0 }, 'AM')}
        addLabel="Ajouter une amorce"
        totalValeur={getBloc('amorces').total}
        totalUnite={getBloc('amorces').unite}
        totalLabel="Volume total amorces"
      >
        <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres globaux du béton</h4>
          <div className="flex gap-4 w-full md:w-auto">
            <SelectSaisie
              label="Dosage (kg/m³)"
              value={parametresProjet.dosageSemelles || 350}
              onChange={(v) => setParametresProjet({...parametresProjet, dosageSemelles: Number(v)})}
              options={[
                {label: '250 kg/m³', value: 250},
                {label: '300 kg/m³', value: 300},
                {label: '350 kg/m³', value: 350},
                {label: '400 kg/m³', value: 400}
              ]}
            />
            <SelectSaisie
              label="Type de ciment"
              value={parametresProjet.cimentTypeSemelles || '42.5'}
              onChange={(v) => setParametresProjet({...parametresProjet, cimentTypeSemelles: v})}
              options={[
                {label: 'Ciment 32.5', value: '32.5'},
                {label: 'Ciment 42.5', value: '42.5'}
              ]}
            />
          </div>
        </div>

        {currentAmorces.map((a, index) => (
          <LigneOuvrage key={a.id} repere={a.repere} titre="Amorce"
            onRemove={currentAmorces.length > 1 ? () => removeRow(amorces, setAmorces, a.id) : null}
            avertissement={getAvertissementLocal('amorces', index)}>
            <h4 className="text-sm font-bold text-devis-calcule mb-2 border-b border-devis-border pb-1">Dimensions Amorce</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InputSaisie label="Côté a (m)" value={a.longueur} onChange={(v) => updateRow(amorces, setAmorces, a.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Côté b (m)" value={a.largeur} onChange={(v) => updateRow(amorces, setAmorces, a.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Hauteur (m)" value={a.hauteur} onChange={(v) => updateRow(amorces, setAmorces, a.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={a.nombre} onChange={(v) => updateRow(amorces, setAmorces, a.id, 'nombre', v)} unite="u" />
            </div>

            {/* Hypothèses Armatures Amorces */}
            <div className="bg-amber-50 p-3 rounded border border-amber-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-amber-800 uppercase">Armatures Amorce</h4>
                <div className="w-48">
                  <SelectSaisie
                    label="Enrobage (c)"
                    value={a.enrobage || 0.05}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'enrobage', Number(v))}
                    options={ENROBAGE_OPTIONS}
                    styleClass="!bg-white"
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Armatures Principales 1</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SelectSaisie
                    label="Diam. Principal"
                    value={a.diametrePrin1 || a.diametrePrin || 10}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'diametrePrin1', Number(v))}
                    options={[
                      {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nbre barres"
                    value={a.nbreBarresPrin1 !== undefined ? a.nbreBarresPrin1 : (a.nbreBarresPrin || 4)}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'nbreBarresPrin1', Number(v))}
                    options={[
                      {label: '4', value: 4}, {label: '6', value: 6}, {label: '8', value: 8}, {label: '10', value: 10}, {label: '12', value: 12}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Ancrage (La)"
                    value={a.La || '40D'}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'La', v)}
                    options={LA_OPTIONS}
                    styleClass="!bg-white"
                  />
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Armatures Principales 2 (Optionnel)</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SelectSaisie
                    label="Diam. Principal"
                    value={a.diametrePrin2 || 10}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'diametrePrin2', Number(v))}
                    options={[
                      {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nbre barres"
                    value={a.nbreBarresPrin2 || 0}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'nbreBarresPrin2', Number(v))}
                    options={[
                      {label: '0 (Aucune)', value: 0}, {label: '2', value: 2}, {label: '4', value: 4}, {label: '6', value: 6}, {label: '8', value: 8}
                    ]}
                    styleClass="!bg-white"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-amber-700 block mb-1">Cadres</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SelectSaisie
                    label="Diam. Cadres"
                    value={a.diametreCadre || 8}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'diametreCadre', Number(v))}
                    options={[
                      {label: 'RL 6', value: 6}, {label: 'RL 8', value: 8}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Espacement (m)"
                    value={a.espacementCadre || 0.15}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'espacementCadre', Number(v))}
                    options={[
                      {label: '0.10 m', value: 0.10}, {label: '0.15 m', value: 0.15}, {label: '0.20 m', value: 0.20}, {label: '0.25 m', value: 0.25}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Crochets (Lc)"
                    value={a.LcCadre !== undefined ? a.LcCadre : 0}
                    onChange={(v) => updateRow(amorces, setAmorces, a.id, 'LcCadre', Number(v))}
                    options={LC_OPTIONS}
                    styleClass="!bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('amorces').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('amorces').lignes[index]?.trace}
                overrideValue={a.override_volume}
                onOverrideChange={(v) => updateRow(amorces, setAmorces, a.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Longrines (Chaînage bas)"
        onAdd={() => addRow(longrines, setLongrines, { 
          niveauId: niveauActifId, perimetre: '', largeur: '', hauteur: '', nombre: '1', 
          diametrePrin: 12, diametreCadre: 6, nbreBarresPrin: 4, espacementCadre: 0.20,
          diametrePrin2: 10, nbreBarresPrin2: 0,
          diametrePeau: 8, nbreBarresPeau: 0,
          diametreChapeau: 10, nbreBarresChapeau: 0, longueurChapeau: '',
          diametreRenfort: 12, nbreBarresRenfort: 0, longueurRenfort: '',
          enrobage: 0.025, LcCadre: 0.10
        }, 'L')}
        addLabel="Ajouter type de longrine"
        totalValeur={getBloc('longrines').total}
        totalUnite={getBloc('longrines').unite}
        totalLabel="Volume total longrines"
      >
        <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres globaux du béton</h4>
          <div className="flex gap-4 w-full md:w-auto">
            <SelectSaisie
              label="Dosage (kg/m³)"
              value={parametresProjet.dosageLongrines || 350}
              onChange={(v) => setParametresProjet({...parametresProjet, dosageLongrines: Number(v)})}
              options={[
                {label: '250 kg/m³', value: 250},
                {label: '300 kg/m³', value: 300},
                {label: '350 kg/m³', value: 350},
                {label: '400 kg/m³', value: 400}
              ]}
            />
            <SelectSaisie
              label="Type de ciment"
              value={parametresProjet.cimentTypeLongrines || '42.5'}
              onChange={(v) => setParametresProjet({...parametresProjet, cimentTypeLongrines: v})}
              options={[
                {label: 'Ciment 32.5', value: '32.5'},
                {label: 'Ciment 42.5', value: '42.5'}
              ]}
            />
          </div>
        </div>

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
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 border-b border-amber-200 pb-2">
                <h4 className="text-xs font-bold text-amber-800 uppercase">Paramètres d'Armature</h4>
                <div className="flex gap-4 mt-2 md:mt-0">
                  <SelectSaisie
                    label="Enrobage (c)"
                    value={l.enrobage || 0.025}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'enrobage', Number(v))}
                    options={[
                      {label: '2 cm', value: 0.02}, {label: '2.5 cm', value: 0.025}, {label: '3 cm', value: 0.03}, {label: '4 cm', value: 0.04}, {label: '5 cm', value: 0.05}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Ancrage (La)"
                    value={l.La || '40D'}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'La', v)}
                    options={LA_OPTIONS}
                    styleClass="!bg-white"
                  />
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Armature Principale 1</span>
                <div className="grid grid-cols-2 gap-4">
                  <SelectSaisie
                    label="Diamètre"
                    value={l.diametrePrin || 12}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametrePrin', Number(v))}
                    options={[{label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nombre de barres"
                    value={l.nbreBarresPrin || 4}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'nbreBarresPrin', Number(v))}
                    options={[{label: '2', value: 2}, {label: '3', value: 3}, {label: '4', value: 4}, {label: '6', value: 6}, {label: '8', value: 8}]}
                    styleClass="!bg-white"
                  />
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Armature Principale 2 (Optionnelle)</span>
                <div className="grid grid-cols-2 gap-4">
                  <SelectSaisie
                    label="Diamètre"
                    value={l.diametrePrin2 || 10}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametrePrin2', Number(v))}
                    options={[{label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nombre de barres"
                    value={l.nbreBarresPrin2 || 0}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'nbreBarresPrin2', Number(v))}
                    options={[{label: '0 (Aucune)', value: 0}, {label: '2', value: 2}, {label: '4', value: 4}, {label: '6', value: 6}, {label: '8', value: 8}]}
                    styleClass="!bg-white"
                  />
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Armatures de Peau (Optionnelles)</span>
                <div className="grid grid-cols-2 gap-4">
                  <SelectSaisie
                    label="Diamètre"
                    value={l.diametrePeau || 8}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametrePeau', Number(v))}
                    options={[{label: 'HA 6', value: 6}, {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nombre de barres"
                    value={l.nbreBarresPeau || 0}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'nbreBarresPeau', Number(v))}
                    options={[{label: '0 (Aucune)', value: 0}, {label: '2', value: 2}, {label: '4', value: 4}, {label: '6', value: 6}]}
                    styleClass="!bg-white"
                  />
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Armatures de Chapeau (Optionnelles)</span>
                <div className="grid grid-cols-3 gap-4">
                  <SelectSaisie
                    label="Diamètre"
                    value={l.diametreChapeau || 10}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametreChapeau', Number(v))}
                    options={[{label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nombre de barres"
                    value={l.nbreBarresChapeau || 0}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'nbreBarresChapeau', Number(v))}
                    options={[{label: '0 (Aucune)', value: 0}, {label: '2', value: 2}, {label: '3', value: 3}, {label: '4', value: 4}, {label: '6', value: 6}]}
                    styleClass="!bg-white"
                  />
                  <InputSaisie 
                    label="Longueur unitaire (m)" 
                    value={l.longueurChapeau || ''} 
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'longueurChapeau', v)} 
                    unite="m" 
                    styleClass="!bg-white" 
                  />
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Renforts (Optionnels)</span>
                <div className="grid grid-cols-3 gap-4">
                  <SelectSaisie
                    label="Diamètre"
                    value={l.diametreRenfort || 12}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametreRenfort', Number(v))}
                    options={[{label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nombre de barres"
                    value={l.nbreBarresRenfort || 0}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'nbreBarresRenfort', Number(v))}
                    options={[{label: '0 (Aucune)', value: 0}, {label: '2', value: 2}, {label: '3', value: 3}, {label: '4', value: 4}, {label: '6', value: 6}]}
                    styleClass="!bg-white"
                  />
                  <InputSaisie 
                    label="Longueur unitaire (m)" 
                    value={l.longueurRenfort || ''} 
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'longueurRenfort', v)} 
                    unite="m" 
                    styleClass="!bg-white" 
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-amber-700 block mb-1">Cadres</span>
                <div className="grid grid-cols-3 gap-4">
                  <SelectSaisie
                    label="Diamètre Cadres"
                    value={l.diametreCadre || 6}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'diametreCadre', Number(v))}
                    options={[{label: 'RL 6', value: 6}, {label: 'RL 8', value: 8}]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Espacement (m)"
                    value={l.espacementCadre || 0.20}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'espacementCadre', Number(v))}
                    options={[{label: '0.10 m', value: 0.10}, {label: '0.15 m', value: 0.15}, {label: '0.20 m', value: 0.20}, {label: '0.25 m', value: 0.25}]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Crochets (Lc)"
                    value={l.LcCadre || 0.10}
                    onChange={(v) => updateRow(longrines, setLongrines, l.id, 'LcCadre', Number(v))}
                    options={LC_OPTIONS}
                    styleClass="!bg-white"
                  />
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
        onAdd={() => addRow(soubassements, setSoubassements, { 
          niveauId: niveauActifId, longueur: '', hauteur: '', epaisseur: '', nombre: '1', ouvertures: [],
          typeAgglo: '20', epaisseurJoint: 0.015, perteAgglos: 7, consommationMortier: 35, dosageMortier: 300,
          coefficientSableMortier: 1.0, dosageBeton: 150
        }, 'MS')}
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
            <div className="bg-amber-50 p-3 rounded border border-amber-200 mb-4">
              <h4 className="text-xs font-bold text-amber-800 uppercase mb-3">Paramètres du Mur</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <SelectSaisie
                  label="Type d'agglo"
                  value={m.typeAgglo || '20'}
                  onChange={(v) => {
                    const conso = v === '15' ? 20 : (v === '20' ? 35 : 45);
                    updateRow(soubassements, setSoubassements, m.id, 'typeAgglo', v);
                    updateRow(soubassements, setSoubassements, m.id, 'consommationMortier', conso);
                  }}
                  options={[{label: '15×20×40', value: '15'}, {label: '20×20×40', value: '20'}, {label: '25×20×40', value: '25'}]}
                  styleClass="!bg-white"
                />
                <InputSaisie label="Joint (m)" value={m.epaisseurJoint ?? 0.015} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'epaisseurJoint', v)} unite="m" styleClass="!bg-white" />
                <InputSaisie label="Perte agglos" value={m.perteAgglos ?? 7} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'perteAgglos', v)} unite="%" styleClass="!bg-white" />
                <InputSaisie label="Mortier de pose" value={m.consommationMortier ?? 35} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'consommationMortier', v)} unite="L/m²" styleClass="!bg-white" />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <InputSaisie label="Dosage mortier" value={m.dosageMortier ?? 300} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'dosageMortier', v)} unite="kg/m³" styleClass="!bg-white" />
                <InputSaisie label="Coef. Sable mortier" value={m.coefficientSableMortier ?? 1.0} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'coefficientSableMortier', v)} styleClass="!bg-white" />
                <InputSaisie label="Dosage béton alvéoles" value={m.dosageBeton ?? 150} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'dosageBeton', v)} unite="kg/m³" styleClass="!bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InputSaisie label="Longueur (L)" value={m.longueur || m.perimetre} onChange={(v) => { updateRow(soubassements, setSoubassements, m.id, 'longueur', v); updateRow(soubassements, setSoubassements, m.id, 'perimetre', v); }} unite="m" />
              <InputSaisie label="Hauteur (H)" value={m.hauteur} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Épaisseur" value={m.epaisseur} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'epaisseur', v)} unite="m" placeholder="0.20" />
              <InputSaisie label="Nombre" value={m.nombre} onChange={(v) => updateRow(soubassements, setSoubassements, m.id, 'nombre', v)} unite="u" />
            </div>

            <div className="border-t border-devis-border pt-4 mt-2 bg-gray-50 -mx-3 px-3 pb-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-devis-calcule uppercase">Déductions</h4>
                <button
                  onClick={() => updateRow(soubassements, setSoubassements, m.id, 'ouvertures', [...(m.ouvertures || []), { id: Date.now(), repere: 'O', type: 'Porte', largeur: '', hauteur: '', nombre: '1' }])}
                  className="text-xs text-devis-saisie font-bold hover:underline min-h-[44px]"
                >
                  + Ouverture
                </button>
              </div>

              {(m.ouvertures || []).map((ouv, oIdx) => (
                <div key={ouv.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 relative mb-3 last:mb-0 border border-gray-200 bg-white p-2 rounded pt-4 md:pt-2 mt-4 md:mt-2">
                  <button
                    onClick={() => updateRow(soubassements, setSoubassements, m.id, 'ouvertures', m.ouvertures.filter(o => o.id !== ouv.id))}
                    className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow z-10"
                  >
                    ×
                  </button>
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</label>
                    <select 
                      className="w-full bg-white border border-devis-border rounded px-3 py-2 text-sm text-devis-calcule font-mono focus:border-devis-saisie focus:ring-1 focus:ring-devis-saisie h-[42px]"
                      value={ouv.type || 'Porte'}
                      onChange={(e) => {
                        const newOuvs = [...m.ouvertures]; newOuvs[oIdx].type = e.target.value; updateRow(soubassements, setSoubassements, m.id, 'ouvertures', newOuvs);
                      }}
                    >
                      <option value="Porte">Porte</option>
                      <option value="Fenêtre">Fenêtre</option>
                      <option value="Baie">Baie vitrée</option>
                      <option value="Autre">Autre ouverture</option>
                    </select>
                  </div>
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
              {(!m.ouvertures || m.ouvertures.length === 0) && <span className="text-xs text-gray-500 italic">Aucune déduction</span>}
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
        onAdd={() => addRow(moellons, setMoellons, { niveauId: niveauActifId, perimetre: '', largeurBase: '', hauteur: '', nombre: '1', dosageCiment: '250' }, 'MO')}
        addLabel="Ajouter moellon"
        totalValeur={getBloc('moellon').total}
        totalUnite={getBloc('moellon').unite}
        totalLabel="Volume total moellon"
      >
        {currentMoellons.map((mo, index) => {
          const ligneCalculee = getBloc('moellon').lignes[index];
          const decomp = ligneCalculee?.decomposition_materiaux || [];
          const moellonsMat  = decomp.find(m => m.id_materiau === 'moellon');
          const cimentMat    = decomp.find(m => m.id_materiau === 'ciment_mortier');
          const sableMat     = decomp.find(m => m.id_materiau === 'sable_mortier');
          const eauMat       = decomp.find(m => m.id_materiau === 'eau_gachage');

          return (
          <LigneOuvrage
            key={mo.id} repere={mo.repere} titre="Moellon"
            onRemove={currentMoellons.length > 1 ? () => removeRow(moellons, setMoellons, mo.id) : null}
            avertissement={getAvertissementLocal('moellon', index)}
          >
            {/* Dimensions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Périmètre (m)" value={mo.perimetre} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'perimetre', v)} unite="m" />
              <InputSaisie label="Base (m)" value={mo.largeurBase} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'largeurBase', v)} unite="m" />
              <InputSaisie label="Hauteur (m)" value={mo.hauteur} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={mo.nombre} onChange={(v) => updateRow(moellons, setMoellons, mo.id, 'nombre', v)} unite="u" />
            </div>

            {/* Hypothèses — dosage mortier */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="text-[12.5px] font-semibold text-[#8A5D00] flex items-center gap-2">
                <span>Dosage mortier (hypothèse) :</span>
                <select
                  value={mo.dosageCiment || '250'}
                  onChange={(e) => updateRow(moellons, setMoellons, mo.id, 'dosageCiment', e.target.value)}
                  className="min-h-[36px] rounded border border-[#8A5D00]/30 bg-[#8A5D00]/5 px-2 text-[12.5px] font-mono text-[#8A5D00] focus:outline-none focus:border-[#8A5D00]/60"
                >
                  <option value="100">100 kg/m³ — Mortier maigre</option>
                  <option value="150">150 kg/m³ — Mortier ordinaire</option>
                  <option value="200">200 kg/m³ — Mortier courant</option>
                  <option value="250">250 kg/m³ — Mortier standard (défaut)</option>
                  <option value="300">300 kg/m³ — Mortier renforcé</option>
                  <option value="350">350 kg/m³ — Mortier fort</option>
                </select>
              </label>
            </div>

            {/* Volume calculé + Décomposition matériaux */}
            <div className="mt-4 pt-4 border-t border-devis-border">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <ValeurCalculee
                  label="Volume maçonnerie"
                  value={ligneCalculee?.valeur}
                  unite="m³"
                  trace={ligneCalculee?.trace}
                  overrideValue={mo.override_volume}
                  onOverrideChange={(v) => updateRow(moellons, setMoellons, mo.id, 'override_volume', v)}
                />
              </div>

              {/* Grille de décomposition analytique */}
              {decomp.length > 0 && (
                <div className="rounded-lg bg-black/[0.02] border border-brand-primary/10 p-3">
                  <p className="text-[11.5px] font-bold uppercase tracking-wider text-brand-text/50 mb-2">
                    Décomposition matériaux
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {moellonsMat && (
                      <div className="rounded border border-brand-primary/10 bg-white p-2.5">
                        <div className="text-[11px] text-brand-text/50 font-semibold uppercase mb-1">Moellons</div>
                        <div className="font-mono font-bold text-[13px] text-[#14634A] tabular-nums">{moellonsMat.valeur_arrondie} t</div>
                        <div className="text-[10.5px] text-brand-text/40 mt-1 whitespace-pre-wrap">{moellonsMat.calcul}</div>
                      </div>
                    )}
                    {cimentMat && (
                      <div className="rounded border border-brand-primary/10 bg-white p-2.5">
                        <div className="text-[11px] text-brand-text/50 font-semibold uppercase mb-1">Ciment</div>
                        <div className="font-mono font-bold text-[13px] text-[#14479B] tabular-nums">{cimentMat.valeur_arrondie} sacs</div>
                        <div className="text-[10.5px] text-brand-text/40 mt-1 whitespace-pre-wrap">{cimentMat.calcul}</div>
                      </div>
                    )}
                    {sableMat && (
                      <div className="rounded border border-brand-primary/10 bg-white p-2.5">
                        <div className="text-[11px] text-brand-text/50 font-semibold uppercase mb-1">Sable (Mortier)</div>
                        <div className="font-mono font-bold text-[13px] text-[#0F151B] tabular-nums">{sableMat.valeur_arrondie} t</div>
                        <div className="text-[10.5px] text-brand-text/40 mt-1 whitespace-pre-wrap">{sableMat.calcul}</div>
                      </div>
                    )}
                    {eauMat && (
                      <div className="rounded border border-brand-primary/10 bg-white p-2.5">
                        <div className="text-[11px] text-brand-text/50 font-semibold uppercase mb-1">Eau de gâchage</div>
                        <div className="font-mono font-bold text-[13px] text-[#0F151B] tabular-nums">{eauMat.valeur_arrondie} L</div>
                        <div className="text-[10.5px] text-brand-text/40 mt-1 whitespace-pre-wrap">{eauMat.calcul}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </LigneOuvrage>
          );
        })}

      </CarteBloc>

      <CarteBloc
        titre="Dallage"
        /* Densités : sable 1500, gravier 1600 — elles étaient inversées ici,
           alors que le moteur porte les bonnes valeurs (PARAMETRES.beton).
           Le sable était donc facturé 6,7 % trop lourd et le gravier 6,25 %
           trop léger, sur chaque dallage créé depuis cet écran.
           Dosage : 350 kg/m³, le béton de dallage courant. Les lignes déjà
           enregistrées gardent la valeur qu'elles portent. */
        onAdd={() => addRow(dallages, setDallages, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseur: '', nombre: '1', pertes: '5', dosage: '350', coefSable: '0.40', coefGravier: '0.80', densiteSable: '1500', densiteGravier: '1600' }, 'DL')}
        addLabel="Ajouter dallage"
        totalValeur={getBloc('dallage').total}
        totalUnite={getBloc('dallage').unite}
        totalLabel="Volume final dallage"
      >
        {currentDallages.map((ch, index) => {
          const m = getBloc('dallage').lignes[index];
          const cimentMat = m?.decomposition_materiaux?.find(mat => mat.id_materiau === 'ciment');
          const sableMat = m?.decomposition_materiaux?.find(mat => mat.id_materiau === 'sable');
          const gravierMat = m?.decomposition_materiaux?.find(mat => mat.id_materiau === 'gravier');
          
          return (
          <LigneOuvrage
            key={ch.id} repere={ch.repere} titre="Dallage"
            onRemove={currentDallages.length > 1 ? () => removeRow(dallages, setDallages, ch.id) : null}
            avertissement={getAvertissementLocal('dallage', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InputSaisie label="Longueur (m)" value={ch.longueur} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur (m)" value={ch.largeur} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Épaisseur (m)" value={ch.epaisseur} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'epaisseur', v)} unite="m" />
              <InputSaisie label="Nombre" value={ch.nombre} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'nombre', v)} unite="u" />
            </div>
            
            <div className="bg-devis-surface p-3 rounded mb-4 border border-devis-border">
              <h4 className="text-xs font-bold text-devis-calcule mb-2">Paramètres de composition</h4>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {/* Le dosage se choisit, il ne se tape pas : les dosages du
                    bâtiment sont une liste courte et connue, et une frappe
                    libre laisse passer un 25 ou un 3500 sans que rien ne le
                    signale. Même liste que les paramètres globaux du béton
                    plus haut, pour qu'on ne trouve pas deux vocabulaires
                    différents dans un même écran. */}
                <SelectSaisie
                  label="Dosage"
                  value={Number(ch.dosage) || 350}
                  onChange={(v) => updateRow(dallages, setDallages, ch.id, 'dosage', Number(v))}
                  options={[
                    { label: '150 kg/m³', value: 150 },
                    { label: '200 kg/m³', value: 200 },
                    { label: '250 kg/m³', value: 250 },
                    { label: '300 kg/m³', value: 300 },
                    { label: '350 kg/m³', value: 350 },
                    { label: '400 kg/m³', value: 400 },
                  ]}
                />
                <InputSaisie label="Pertes" value={ch.pertes || 5} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'pertes', v)} unite="%" />
                <InputSaisie label="Ks" value={ch.coefSable || 0.40} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'coefSable', v)} unite="m³/m³" />
                <InputSaisie label="Kg" value={ch.coefGravier || 0.80} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'coefGravier', v)} unite="m³/m³" />
                <InputSaisie label="ρ Sable" value={ch.densiteSable || 1500} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'densiteSable', v)} unite="kg/m³" />
                <InputSaisie label="ρ Gravier" value={ch.densiteGravier || 1600} onChange={(v) => updateRow(dallages, setDallages, ch.id, 'densiteGravier', v)} unite="kg/m³" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume final (m³)"
                value={m?.valeur}
                unite="m3"
                trace={m?.trace}
                overrideValue={ch.override_volume}
                onOverrideChange={(v) => updateRow(dallages, setDallages, ch.id, 'override_volume', v)}
              />
              
              {m && (
                <div className="bg-devis-surface rounded border border-devis-border p-3 flex flex-col gap-2">
                  <span className="text-xs font-bold text-devis-text uppercase mb-1">Matériaux générés</span>
                  <div className="grid grid-cols-3 gap-2">
                    {cimentMat && (
                      <div className="rounded border border-brand-primary/10 bg-white p-2.5">
                        <div className="text-[11px] text-brand-text/50 font-semibold uppercase mb-1">Ciment</div>
                        <div className="font-mono font-bold text-[13px] text-[#0F151B] tabular-nums">{cimentMat.valeur_arrondie} sacs</div>
                      </div>
                    )}
                    {sableMat && (
                      <div className="rounded border border-brand-primary/10 bg-white p-2.5">
                        <div className="text-[11px] text-brand-text/50 font-semibold uppercase mb-1">Sable</div>
                        <div className="font-mono font-bold text-[13px] text-[#0F151B] tabular-nums">{sableMat.valeur_arrondie} t</div>
                      </div>
                    )}
                    {gravierMat && (
                      <div className="rounded border border-brand-primary/10 bg-white p-2.5">
                        <div className="text-[11px] text-brand-text/50 font-semibold uppercase mb-1">Gravier</div>
                        <div className="font-mono font-bold text-[13px] text-[#0F151B] tabular-nums">{gravierMat.valeur_arrondie} t</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </LigneOuvrage>
        )})}
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
      </AccordionProvider>

      <ResumeFondation />
    </section>
  );
}
