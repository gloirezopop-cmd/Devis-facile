import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import { AccordionProvider } from '../ui/Accordion.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import SelectSaisie from '../ui/SelectSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

const BLOCS_ELEVATION = ['Colonnes (Poteaux)', 'Linteaux', 'Maçonnerie en Agglos', 'Escaliers'];

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

const LA_OPTIONS = [
  { label: '40 × Ø', value: '40D' },
  { label: '50 × Ø', value: '50D' },
  { label: '0.50 m', value: 0.50 },
  { label: '0.60 m', value: 0.60 },
  { label: '0.80 m', value: 0.80 },
  { label: '1.00 m', value: 1.00 }
];

export default function Elevation() {
  const {
    colonnes, setColonnes,
    linteaux, setLinteaux,
    maconneries, setMaconneries,
    escaliers, setEscaliers,
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

  const currentColonnes = colonnes.filter(x => x.niveauId === niveauActifId);
  const currentLinteaux = linteaux.filter(x => x.niveauId === niveauActifId);
  const currentMaconneries = maconneries.filter(x => x.niveauId === niveauActifId);
  const currentEscaliers = escaliers.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Élévation</h2>

      <AccordionProvider key={niveauActifId} ids={BLOCS_ELEVATION}>
      <CarteBloc
        titre="Colonnes (Poteaux)"
        onAdd={() => addRow(colonnes, setColonnes, { niveauId: niveauActifId, forme: 'rectangulaire', longueur: '', largeur: '', diametre: '', hauteur: '', nombre: '1', diametrePrin1: 12, diametreCadre: 8, espacementCadre: 0.15, nbreBarresPrin1: 4, enrobage: 0.05, La: '40D', LcCadre: 0 }, 'C')}
        addLabel="Ajouter type de colonne"
        totalValeur={getBloc('colonnes').total}
        totalUnite={getBloc('colonnes').unite}
        totalLabel="Volume total colonnes"
      >
        <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres globaux du béton</h4>
          <div className="flex gap-4 w-full md:w-auto">
            <SelectSaisie
              label="Dosage (kg/m³)"
              value={parametresProjet.dosageColonnes || 350}
              onChange={(v) => setParametresProjet({...parametresProjet, dosageColonnes: Number(v)})}
              options={[
                {label: '250 kg/m³', value: 250},
                {label: '300 kg/m³', value: 300},
                {label: '350 kg/m³', value: 350},
                {label: '400 kg/m³', value: 400}
              ]}
            />
            <SelectSaisie
              label="Type de ciment"
              value={parametresProjet.cimentTypeColonnes || '42.5'}
              onChange={(v) => setParametresProjet({...parametresProjet, cimentTypeColonnes: v})}
              options={[
                {label: 'Ciment 32.5', value: '32.5'},
                {label: 'Ciment 42.5', value: '42.5'}
              ]}
            />
          </div>
        </div>

        {currentColonnes.map((c, index) => {
          const circulaire = c.forme === 'circulaire';
          return (
          <LigneOuvrage
            key={c.id} repere={c.repere} titre="Colonne"
            onRemove={currentColonnes.length > 1 ? () => removeRow(colonnes, setColonnes, c.id) : null}
            avertissement={getAvertissementLocal('colonnes', index)}
          >
            <h4 className="text-sm font-bold text-devis-calcule mb-2 border-b border-devis-border pb-1">Dimensions Colonne</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Forme</label>
                <select
                  value={c.forme || 'rectangulaire'}
                  onChange={(v) => {
                    const nouvelleForme = v.target.value;
                    setColonnes(colonnes.map((x) => x.id !== c.id ? x : (
                      nouvelleForme === 'circulaire'
                        ? { ...x, forme: nouvelleForme, longueur: '', largeur: '' }
                        : { ...x, forme: nouvelleForme, diametre: '' }
                    )));
                  }}
                  className="border border-devis-saisie rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-sans text-sm"
                >
                  <option value="rectangulaire">Rectangulaire</option>
                  <option value="circulaire">Circulaire</option>
                </select>
              </div>
              {circulaire ? (
                <InputSaisie label="Diamètre (m)" value={c.diametre} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'diametre', v)} unite="m" />
              ) : (
                <>
                  <InputSaisie label="Côté a (m)" value={c.longueur} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'longueur', v)} unite="m" />
                  <InputSaisie label="Côté b (m)" value={c.largeur} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'largeur', v)} unite="m" />
                </>
              )}
              <InputSaisie label="Hauteur (m)" value={c.hauteur} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={c.nombre} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'nombre', v)} unite="u" />
            </div>

            {/* Hypothèses Armatures Colonnes */}
            <div className="bg-amber-50 p-3 rounded border border-amber-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-amber-800 uppercase">Armatures Colonne</h4>
                <div className="w-48">
                  <SelectSaisie
                    label="Enrobage (c)"
                    value={c.enrobage || 0.05}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'enrobage', Number(v))}
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
                    value={c.diametrePrin1 || c.diametrePrin || 12}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'diametrePrin1', Number(v))}
                    options={[
                      {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nbre barres"
                    value={c.nbreBarresPrin1 !== undefined ? c.nbreBarresPrin1 : (c.nbreBarresPrin || 4)}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'nbreBarresPrin1', Number(v))}
                    options={[
                      {label: '4', value: 4}, {label: '6', value: 6}, {label: '8', value: 8}, {label: '10', value: 10}, {label: '12', value: 12}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Ancrage (La)"
                    value={c.La || '40D'}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'La', v)}
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
                    value={c.diametrePrin2 || 10}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'diametrePrin2', Number(v))}
                    options={[
                      {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}, {label: 'HA 16', value: 16}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Nbre barres"
                    value={c.nbreBarresPrin2 || 0}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'nbreBarresPrin2', Number(v))}
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
                    value={c.diametreCadre || 8}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'diametreCadre', Number(v))}
                    options={[
                      {label: 'RL 6', value: 6}, {label: 'RL 8', value: 8}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Espacement (m)"
                    value={c.espacementCadre || 0.15}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'espacementCadre', Number(v))}
                    options={[
                      {label: '0.10 m', value: 0.10}, {label: '0.15 m', value: 0.15}, {label: '0.20 m', value: 0.20}, {label: '0.25 m', value: 0.25}
                    ]}
                    styleClass="!bg-white"
                  />
                  <SelectSaisie
                    label="Crochets (Lc)"
                    value={c.LcCadre !== undefined ? c.LcCadre : 0}
                    onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'LcCadre', Number(v))}
                    options={LC_OPTIONS}
                    styleClass="!bg-white"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('colonnes').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('colonnes').lignes[index]?.trace}
                overrideValue={c.override_volume}
                onOverrideChange={(v) => updateRow(colonnes, setColonnes, c.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
          );
        })}
      </CarteBloc>

      <CarteBloc
        titre="Linteaux"
        onAdd={() => addRow(linteaux, setLinteaux, { niveauId: niveauActifId, longueur: '', largeur: '', hauteur: '', nombre: '1', diametrePrin: 10, diametreCadre: 6, espacementCadre: 0.20, nbreBarresPrin: 2, enrobage: 0.05 }, 'L')}
        addLabel="Ajouter type de linteau"
        totalValeur={getBloc('linteaux').total}
        totalUnite={getBloc('linteaux').unite}
        totalLabel="Volume total linteaux"
      >
        {currentLinteaux.map((l, index) => (
          <LigneOuvrage
            key={l.id} repere={l.repere} titre="Linteau"
            onRemove={currentLinteaux.length > 1 ? () => removeRow(linteaux, setLinteaux, l.id) : null}
            avertissement={getAvertissementLocal('linteaux', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InputSaisie label="Longueur" value={l.longueur} onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={l.largeur} onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={l.hauteur} onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={l.nombre} onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'nombre', v)} unite="u" />
            </div>
            
            <div className="border-t border-devis-border pt-4 mt-2 bg-gray-50 -mx-3 px-3 pb-3 rounded">
              <h4 className="text-xs font-bold text-devis-calcule uppercase mb-3">Armatures (Formule Longrines)</h4>
              
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <span className="text-xs font-semibold text-devis-saisie block mb-1">Aciers Principaux</span>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectSaisie
                      label="Diamètre"
                      value={l.diametrePrin || 10}
                      onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'diametrePrin', Number(v))}
                      options={[
                        {label: 'HA 8', value: 8}, {label: 'HA 10', value: 10}, {label: 'HA 12', value: 12}, {label: 'HA 14', value: 14}
                      ]}
                      styleClass="!bg-white"
                    />
                    <SelectSaisie
                      label="Nbre par file"
                      value={l.nbreBarresPrin !== undefined ? l.nbreBarresPrin : 2}
                      onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'nbreBarresPrin', Number(v))}
                      options={[
                        {label: '2', value: 2}, {label: '4', value: 4}, {label: '6', value: 6}, {label: '8', value: 8}
                      ]}
                      styleClass="!bg-white"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-amber-700 block mb-1">Cadres</span>
                  <div className="grid grid-cols-3 gap-4">
                    <SelectSaisie
                      label="Diam. Cadres"
                      value={l.diametreCadre || 6}
                      onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'diametreCadre', Number(v))}
                      options={[
                        {label: 'RL 6', value: 6}, {label: 'RL 8', value: 8}
                      ]}
                      styleClass="!bg-white"
                    />
                    <SelectSaisie
                      label="Espacement"
                      value={l.espacementCadre || 0.20}
                      onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'espacementCadre', Number(v))}
                      options={[
                        {label: '0.15 m', value: 0.15}, {label: '0.20 m', value: 0.20}, {label: '0.25 m', value: 0.25}
                      ]}
                      styleClass="!bg-white"
                    />
                    <SelectSaisie
                      label="Crochets (Lc)"
                      value={l.LcCadre !== undefined ? l.LcCadre : 0}
                      onChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'LcCadre', Number(v))}
                      options={LC_OPTIONS}
                      styleClass="!bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('linteaux').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('linteaux').lignes[index]?.trace}
                overrideValue={l.override_volume}
                onOverrideChange={(v) => updateRow(linteaux, setLinteaux, l.id, 'override_volume', v)}
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
        <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres Globaux Maçonnerie</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
            <SelectSaisie
              label="Type d'Agglo"
              value={parametresProjet.maconnerieTypeAgglo || '15'}
              onChange={(v) => setParametresProjet({...parametresProjet, maconnerieTypeAgglo: v})}
              options={[
                {label: 'Agglo 15 cm', value: '15'},
                {label: 'Agglo 20 cm', value: '20'},
                {label: 'Agglo 25 cm', value: '25'}
              ]}
              styleClass="!bg-white"
            />
            <InputSaisie 
              label="Perte Agglos (%)" 
              value={parametresProjet.maconneriePerte !== undefined ? parametresProjet.maconneriePerte : 7} 
              onChange={(v) => setParametresProjet({...parametresProjet, maconneriePerte: Number(v)})} 
              unite="%" 
            />
            <SelectSaisie
              label="Dosage Mortier"
              value={parametresProjet.maconnerieDosageMortier || 300}
              onChange={(v) => setParametresProjet({...parametresProjet, maconnerieDosageMortier: Number(v)})}
              options={[
                {label: '250 kg/m³', value: 250},
                {label: '300 kg/m³', value: 300},
                {label: '350 kg/m³', value: 350}
              ]}
              styleClass="!bg-white"
            />
          </div>
        </div>
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
                <div key={ouv.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 relative mb-3 last:mb-0 border border-gray-200 bg-white p-2 rounded pt-4 md:pt-2 mt-4 md:mt-2">
                  <button
                    onClick={() => updateRow(maconneries, setMaconneries, m.id, 'ouvertures', m.ouvertures.filter(o => o.id !== ouv.id))}
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
                        const newOuvs = [...m.ouvertures]; newOuvs[oIdx].type = e.target.value; updateRow(maconneries, setMaconneries, m.id, 'ouvertures', newOuvs);
                      }}
                    >
                      <option value="Porte">Porte</option>
                      <option value="Fenêtre">Fenêtre</option>
                      <option value="Baie">Baie vitrée</option>
                      <option value="Autre">Autre ouverture</option>
                    </select>
                  </div>
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

      <CarteBloc
        titre="Escaliers"
        onAdd={() => addRow(escaliers, setEscaliers, { 
          niveauId: niveauActifId, mode: 'geometrie', nombre: '1', volume: '',
          volees: [{
            id: Date.now(), hauteurAMonter: '', nombreContremarches: '', giron: '', largeur: '',
            epaisseurPaillasse: '', typeEpaisseur: 'perpendiculaire', convention: 'arrivee_palier'
          }],
          paliers: [] 
        }, 'ESC')}
        addLabel="Ajouter un escalier"
        totalValeur={getBloc('escalier').total}
        totalUnite={getBloc('escalier').unite}
        totalLabel="Volume total escaliers"
      >
        <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres globaux du béton</h4>
          <div className="flex gap-4 w-full md:w-auto">
            <SelectSaisie
              label="Dosage (kg/m³)"
              value={parametresProjet.dosageEscaliers || 350}
              onChange={(v) => setParametresProjet({...parametresProjet, dosageEscaliers: Number(v)})}
              options={[
                {label: '250 kg/m³', value: 250},
                {label: '300 kg/m³', value: 300},
                {label: '350 kg/m³', value: 350},
                {label: '400 kg/m³', value: 400}
              ]}
            />
            <SelectSaisie
              label="Type de ciment"
              value={parametresProjet.cimentTypeEscaliers || '42.5'}
              onChange={(v) => setParametresProjet({...parametresProjet, cimentTypeEscaliers: v})}
              options={[
                {label: 'Ciment 32.5', value: '32.5'},
                {label: 'Ciment 42.5', value: '42.5'}
              ]}
            />
          </div>
        </div>

        {currentEscaliers.map((e, index) => (
          <LigneOuvrage
            key={e.id} repere={e.repere} titre="Escalier"
            onRemove={currentEscaliers.length > 1 ? () => removeRow(escaliers, setEscaliers, e.id) : null}
            avertissement={getAvertissementLocal('escalier', index)}
          >
            <div className="flex space-x-2 mb-4">
              <button 
                onClick={() => updateRow(escaliers, setEscaliers, e.id, 'mode', 'geometrie')}
                className={`px-3 py-1 rounded text-xs font-bold ${e.mode === 'geometrie' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600'}`}
              >Géométrie</button>
              <button 
                onClick={() => updateRow(escaliers, setEscaliers, e.id, 'mode', 'volume')}
                className={`px-3 py-1 rounded text-xs font-bold ${e.mode === 'volume' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600'}`}
              >Volume simple (Ancien)</button>
            </div>

            {e.mode === 'volume' ? (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <InputSaisie label="Volume (m³)" value={e.volume} onChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'volume', v)} unite="m³" />
                <InputSaisie label="Nombre" value={e.nombre} onChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'nombre', v)} unite="u" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputSaisie label="Nombre" value={e.nombre} onChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'nombre', v)} unite="u" />
                </div>
                
                {/* VOLEES */}
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-devis-calcule">Volées</h4>
                    <button
                      onClick={() => updateRow(escaliers, setEscaliers, e.id, 'volees', [...(e.volees || []), {
                        id: Date.now(), hauteurAMonter: '', nombreContremarches: '', giron: '', largeur: '',
                        epaisseurPaillasse: '', typeEpaisseur: 'perpendiculaire', convention: 'arrivee_palier'
                      }])}
                      className="text-xs text-devis-saisie font-bold hover:underline"
                    >+ Ajouter une volée</button>
                  </div>
                  {(e.volees || []).map((v, vIdx) => (
                    <div key={v.id} className="relative bg-white border border-gray-200 p-3 mb-2 rounded last:mb-0">
                      <button
                        onClick={() => updateRow(escaliers, setEscaliers, e.id, 'volees', e.volees.filter(x => x.id !== v.id))}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >×</button>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <InputSaisie label="H. à monter (H)" value={v.hauteurAMonter} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].hauteurAMonter = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <InputSaisie label="Nb Contremarches (n)" value={v.nombreContremarches} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].nombreContremarches = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="u" />
                        <InputSaisie label="Giron (g)" value={v.giron} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].giron = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <InputSaisie label="Largeur (L)" value={v.largeur} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].largeur = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <InputSaisie label="Ep. Paillasse" value={v.epaisseurPaillasse} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].epaisseurPaillasse = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <div>
                          <label className="text-xs text-devis-saisie font-bold uppercase block mb-1">Type Ep.</label>
                          <select className="border border-devis-border rounded p-1 w-full text-xs" value={v.typeEpaisseur} onChange={(ev) => {
                            const arr = [...e.volees]; arr[vIdx].typeEpaisseur = ev.target.value; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }}>
                            <option value="perpendiculaire">Perpendiculaire</option>
                            <option value="verticale">Verticale</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-devis-saisie font-bold uppercase block mb-1">Convention</label>
                          <select className="border border-devis-border rounded p-1 w-full text-xs" value={v.convention} onChange={(ev) => {
                            const arr = [...e.volees]; arr[vIdx].convention = ev.target.value; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }}>
                            <option value="arrivee_palier">Arrivée palier</option>
                            <option value="marche_terminale">Marche terminale</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <h5 className="text-xs font-bold text-gray-500 mb-1">Ferraillage Volée</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <InputSaisie label="Ø Principale" value={v.ferraillage?.principales?.diametre || 12} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.principales) arr[vIdx].ferraillage.principales = {}; arr[vIdx].ferraillage.principales.diametre = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="mm" />
                          <InputSaisie label="Esp. Princ." value={v.ferraillage?.principales?.espacement || 0.15} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.principales) arr[vIdx].ferraillage.principales = {}; arr[vIdx].ferraillage.principales.espacement = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="m" />
                          <InputSaisie label="Ø Répartition" value={v.ferraillage?.repartition?.diametre || 8} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.repartition) arr[vIdx].ferraillage.repartition = {}; arr[vIdx].ferraillage.repartition.diametre = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="mm" />
                          <InputSaisie label="Esp. Rép." value={v.ferraillage?.repartition?.espacement || 0.20} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.repartition) arr[vIdx].ferraillage.repartition = {}; arr[vIdx].ferraillage.repartition.espacement = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="m" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PALIERS */}
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-devis-calcule">Paliers</h4>
                    <button
                      onClick={() => updateRow(escaliers, setEscaliers, e.id, 'paliers', [...(e.paliers || []), {
                        id: Date.now(), longueur: '', largeur: '', epaisseur: ''
                      }])}
                      className="text-xs text-devis-saisie font-bold hover:underline"
                    >+ Ajouter un palier</button>
                  </div>
                  {(e.paliers || []).map((p, pIdx) => (
                    <div key={p.id} className="relative bg-white border border-gray-200 p-2 mb-2 rounded last:mb-0">
                      <button
                        onClick={() => updateRow(escaliers, setEscaliers, e.id, 'paliers', e.paliers.filter(x => x.id !== p.id))}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >×</button>
                      <div className="grid grid-cols-3 gap-2">
                        <InputSaisie label="Longueur" value={p.longueur} onChange={(val) => {
                          const arr = [...e.paliers]; arr[pIdx].longueur = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                        }} unite="m" />
                        <InputSaisie label="Largeur" value={p.largeur} onChange={(val) => {
                          const arr = [...e.paliers]; arr[pIdx].largeur = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                        }} unite="m" />
                        <InputSaisie label="Épaisseur" value={p.epaisseur} onChange={(val) => {
                          const arr = [...e.paliers]; arr[pIdx].epaisseur = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                        }} unite="m" />
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <h5 className="text-xs font-bold text-gray-500 mb-1">Ferraillage Palier (Nappes)</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <InputSaisie label="Ø Barres" value={p.ferraillage?.diametre || 10} onChange={(val) => {
                            const arr = [...e.paliers]; if(!arr[pIdx].ferraillage) arr[pIdx].ferraillage = {}; arr[pIdx].ferraillage.diametre = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                          }} unite="mm" />
                          <InputSaisie label="Espacement" value={p.ferraillage?.espacement || 0.15} onChange={(val) => {
                            const arr = [...e.paliers]; if(!arr[pIdx].ferraillage) arr[pIdx].ferraillage = {}; arr[pIdx].ferraillage.espacement = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                          }} unite="m" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('escalier').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('escalier').lignes[index]?.trace}
                overrideValue={e.override_volume}
                onOverrideChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
      </AccordionProvider>
    </section>
  );
}
