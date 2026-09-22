import React, { useState } from 'react';
import { useProjet } from '../../context/ProjetContext';
import CarteBloc from '../ui/CarteBloc';
import LigneOuvrage from '../ui/LigneOuvrage';
import InputSaisie from '../ui/InputSaisie';
import SelectSaisie from '../ui/SelectSaisie';

export default function Plancher() {
  const { niveauActifId, dalles, setDalles, plancherHourdis12, setPlancherHourdis12, plancherHourdis16, setPlancherHourdis16, parametresProjet, setParametresProjet, addRow, updateRow, removeRow } = useProjet();

  const dallesNiveau = dalles.filter(d => d.niveauId === niveauActifId);
  const hourdis12Niveau = plancherHourdis12.filter(p => p.niveauId === niveauActifId);
  const hourdis16Niveau = plancherHourdis16.filter(p => p.niveauId === niveauActifId);

  const hasHourdis12 = hourdis12Niveau.length > 0;
  const hasHourdis16 = hourdis16Niveau.length > 0;

  const [variante, setVariante] = useState(
    hasHourdis16 ? 'hourdis16' : 'dalle'
  );

  return (
    <section className="mb-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-4 border-b border-devis-border pb-2">
        <h2 className="font-sans text-2xl font-bold text-devis-calcule">Plancher</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setVariante('dalle')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'dalle' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Dalle Pleine (BA)
          </button>
          <button 
            onClick={() => setVariante('hourdis16')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'hourdis16' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Hourdis 16+4
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {variante === 'dalle' && (
          <CarteBloc titre="Dalle Pleine (Dosage 350 kg/m³)">
            <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
              <h4 className="text-xs font-bold text-blue-800 uppercase w-full md:w-auto md:mr-auto">Paramètres globaux du béton</h4>
              <div className="flex gap-4 w-full md:w-auto">
                <SelectSaisie
                  label="Dosage (kg/m³)"
                  value={parametresProjet.dosageDalles || 350}
                  onChange={(v) => setParametresProjet({...parametresProjet, dosageDalles: Number(v)})}
                  options={[
                    {label: '250 kg/m³', value: 250},
                    {label: '300 kg/m³', value: 300},
                    {label: '350 kg/m³', value: 350},
                    {label: '400 kg/m³', value: 400}
                  ]}
                />
                <SelectSaisie
                  label="Type de ciment"
                  value={parametresProjet.cimentTypeDalles || '42.5'}
                  onChange={(v) => setParametresProjet({...parametresProjet, cimentTypeDalles: v})}
                  options={[
                    {label: 'Ciment 32.5', value: '32.5'},
                    {label: 'Ciment 42.5', value: '42.5'}
                  ]}
                />
              </div>
            </div>

            <div className="bg-amber-50/50 p-3 rounded border border-amber-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
              <h4 className="text-xs font-bold text-amber-800 uppercase w-full md:w-auto md:mr-auto">Paramètres de coffrage</h4>
              <div className="flex gap-4 w-full md:w-auto">
                <SelectSaisie
                  label="Longueur des planches"
                  value={parametresProjet.longueurPlanchesDalles || 3}
                  onChange={(v) => setParametresProjet({...parametresProjet, longueurPlanchesDalles: Number(v)})}
                  options={[
                    {label: '3 mètres', value: 3},
                    {label: '4 mètres', value: 4},
                    {label: '5 mètres', value: 5}
                  ]}
                  styleClass="!bg-white"
                />
                <SelectSaisie
                  label="Longueur des chevrons"
                  value={parametresProjet.longueurChevronsDalles || 5}
                  onChange={(v) => setParametresProjet({...parametresProjet, longueurChevronsDalles: Number(v)})}
                  options={[
                    {label: '3 mètres', value: 3},
                    {label: '4 mètres', value: 4},
                    {label: '5 mètres', value: 5}
                  ]}
                  styleClass="!bg-white"
                />
              </div>
            </div>

            {dallesNiveau.map((ligne, i) => (
              <LigneOuvrage
                key={`dalle-${ligne.id}`}
                titre={`Dalle ${i + 1}`}
                repere={ligne.repere || `D${i + 1}`}
                onRemove={() => removeRow(dalles, setDalles, ligne.id)}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <InputSaisie label="Longueur globale (m)" value={ligne.longueur} onChange={(v) => updateRow(dalles, setDalles, ligne.id, 'longueur', v)} unite="m" />
                  <InputSaisie label="Largeur globale (m)" value={ligne.largeur} onChange={(v) => updateRow(dalles, setDalles, ligne.id, 'largeur', v)} unite="m" />
                  <InputSaisie label="Épaisseur (cm)" value={ligne.epaisseurCm !== undefined ? ligne.epaisseurCm : 10} onChange={(v) => updateRow(dalles, setDalles, ligne.id, 'epaisseurCm', v)} unite="cm" />
                  <InputSaisie label="Nombre" value={ligne.nombre !== undefined ? ligne.nombre : 1} onChange={(v) => updateRow(dalles, setDalles, ligne.id, 'nombre', v)} unite="u" />
                </div>

                <div className="bg-amber-50 p-3 rounded border border-amber-200 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-amber-800">Méthode de Coffrage</h4>
                    <div className="w-64">
                      <SelectSaisie
                        label="Calcul du bois"
                        value={ligne.methodeCoffrage || 'globale'}
                        onChange={(v) => updateRow(dalles, setDalles, ligne.id, 'methodeCoffrage', v)}
                        options={[
                          {label: 'Méthode Globale (Ratio)', value: 'globale'},
                          {label: 'Méthode Manuelle (Panneaux)', value: 'panneaux'}
                        ]}
                        styleClass="!bg-white"
                      />
                    </div>
                  </div>

                  {ligne.methodeCoffrage === 'panneaux' && (
                    <div className="bg-white p-3 rounded border border-amber-100">
                      <h5 className="text-xs font-bold text-gray-700 uppercase mb-3">Détail des panneaux (pour chevrons 7/7)</h5>
                      {(ligne.panneaux || []).map((p, pIndex) => (
                        <div key={pIndex} className="flex gap-4 items-end mb-2">
                          <InputSaisie label={`Long. Panneau ${pIndex + 1}`} value={p.longueur} onChange={(v) => {
                            const newP = [...(ligne.panneaux || [])];
                            newP[pIndex] = { ...newP[pIndex], longueur: v };
                            updateRow(dalles, setDalles, ligne.id, 'panneaux', newP);
                          }} unite="m" />
                          <InputSaisie label={`Larg. Panneau ${pIndex + 1}`} value={p.largeur} onChange={(v) => {
                            const newP = [...(ligne.panneaux || [])];
                            newP[pIndex] = { ...newP[pIndex], largeur: v };
                            updateRow(dalles, setDalles, ligne.id, 'panneaux', newP);
                          }} unite="m" />
                          <button 
                            onClick={() => {
                              const newP = [...(ligne.panneaux || [])];
                              newP.splice(pIndex, 1);
                              updateRow(dalles, setDalles, ligne.id, 'panneaux', newP);
                            }}
                            className="text-red-500 hover:text-red-700 px-2 py-1 h-9 rounded text-sm mb-1"
                          >
                            X
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newP = [...(ligne.panneaux || []), { longueur: '', largeur: '' }];
                          updateRow(dalles, setDalles, ligne.id, 'panneaux', newP);
                        }}
                        className="text-devis-saisie hover:underline text-sm font-bold mt-2"
                      >
                        + Ajouter un panneau
                      </button>
                    </div>
                  )}
                </div>
              </LigneOuvrage>
            ))}
            <button 
              onClick={() => addRow(dalles, setDalles, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseurCm: 10, nombre: 1, methodeCoffrage: 'globale', panneaux: [] }, 'D')}
              className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2"
            >
              + Ajouter une dalle
            </button>
          </CarteBloc>
        )}

        {variante === 'hourdis16' && (
          <CarteBloc titre="Plancher Hourdis 16+4 (Livré et Posé)">
            <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-6 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-blue-800 uppercase">Paramètres des armatures</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <h5 className="text-xs font-bold text-gray-700 mb-2">Dalle de compression (Nappe)</h5>
                   <div className="flex gap-4">
                     <SelectSaisie label="Section (mm)" value={parametresProjet.nappeDiametre || 6} onChange={(v) => setParametresProjet({...parametresProjet, nappeDiametre: Number(v)})} options={[{label: 'HA6', value: 6}, {label: 'HA8', value: 8}]} />
                     <SelectSaisie label="Espacement (cm)" value={parametresProjet.nappeEspacement || 20} onChange={(v) => setParametresProjet({...parametresProjet, nappeEspacement: Number(v)})} options={[{label: '15 cm', value: 15}, {label: '20 cm', value: 20}, {label: '25 cm', value: 25}]} />
                   </div>
                </div>
                <div>
                   <h5 className="text-xs font-bold text-gray-700 mb-2">Poutrelles</h5>
                   <div className="flex gap-4">
                     <SelectSaisie label="Nb Barres / Poutrelle" value={parametresProjet.poutrelleNbBarres || 2} onChange={(v) => setParametresProjet({...parametresProjet, poutrelleNbBarres: Number(v)})} options={[{label: '2 barres', value: 2}, {label: '3 barres', value: 3}, {label: '4 barres', value: 4}]} />
                     <SelectSaisie label="Section (mm)" value={parametresProjet.poutrelleDiametre || 8} onChange={(v) => setParametresProjet({...parametresProjet, poutrelleDiametre: Number(v)})} options={[{label: 'HA8', value: 8}, {label: 'HA10', value: 10}, {label: 'HA12', value: 12}]} />
                     <SelectSaisie label="Espacement long. (cm)" value={parametresProjet.poutrelleEspacement || 20} onChange={(v) => setParametresProjet({...parametresProjet, poutrelleEspacement: Number(v)})} options={[{label: '15 cm', value: 15}, {label: '20 cm', value: 20}, {label: '25 cm', value: 25}]} />
                   </div>
                </div>
              </div>
            </div>

            {hourdis16Niveau.map((ligne, i) => (
              <LigneOuvrage
                key={`hourdis16-${ligne.id}`}
                titre={`Surface ${i + 1}`}
                repere={ligne.repere || `PH16-${i + 1}`}
                onRemove={() => removeRow(plancherHourdis16, setPlancherHourdis16, ligne.id)}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InputSaisie label="Longueur L (m)" value={ligne.longueur} onChange={(v) => updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'longueur', v)} unite="m" />
                  <InputSaisie label="Largeur l (m)" value={ligne.largeur} onChange={(v) => updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'largeur', v)} unite="m" />
                  <InputSaisie label="Long. Poutrelle Lp (m)" value={ligne.Lp !== undefined ? ligne.Lp : ligne.largeur} onChange={(v) => updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'Lp', v)} unite="m" />
                  <InputSaisie label="Nombre" value={ligne.nombre !== undefined ? ligne.nombre : 1} onChange={(v) => updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'nombre', v)} unite="u" />
                </div>
                
                <div className="bg-white p-3 rounded border border-gray-200 mt-4">
                  <h5 className="text-xs font-bold text-gray-700 uppercase mb-3">Trémies / Ouvertures</h5>
                  {(ligne.tremies || []).map((t, tIndex) => (
                    <div key={tIndex} className="flex gap-4 items-end mb-2">
                      <InputSaisie label={`Long. Trémie ${tIndex + 1}`} value={t.longueur} onChange={(v) => {
                        const newT = [...(ligne.tremies || [])];
                        newT[tIndex] = { ...newT[tIndex], longueur: v };
                        updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'tremies', newT);
                      }} unite="m" />
                      <InputSaisie label={`Larg. Trémie ${tIndex + 1}`} value={t.largeur} onChange={(v) => {
                        const newT = [...(ligne.tremies || [])];
                        newT[tIndex] = { ...newT[tIndex], largeur: v };
                        updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'tremies', newT);
                      }} unite="m" />
                      <button 
                        onClick={() => {
                          const newT = [...(ligne.tremies || [])];
                          newT.splice(tIndex, 1);
                          updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'tremies', newT);
                        }}
                        className="text-red-500 hover:text-red-700 px-2 py-1 h-9 rounded text-sm mb-1"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newT = [...(ligne.tremies || []), { longueur: '', largeur: '' }];
                      updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, 'tremies', newT);
                    }}
                    className="text-devis-saisie hover:underline text-sm font-bold mt-2"
                  >
                    + Ajouter une trémie
                  </button>
                </div>
              </LigneOuvrage>
            ))}
            <button 
              onClick={() => addRow(plancherHourdis16, setPlancherHourdis16, { niveauId: niveauActifId, longueur: '', largeur: '', Lp: '', nombre: 1, tremies: [] }, 'PH16-')}
              className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2"
            >
              + Ajouter une surface
            </button>
          </CarteBloc>
        )}
      </div>
    </section>
  );
}
