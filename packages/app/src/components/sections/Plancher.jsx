import React, { useState } from 'react';
import { useProjet } from '../../context/ProjetContext';
import CarteBloc from '../ui/CarteBloc';
import LigneOuvrage from '../ui/LigneOuvrage';

export default function Plancher() {
  const { niveauActifId, dalles, setDalles, plancherHourdis12, setPlancherHourdis12, plancherHourdis16, setPlancherHourdis16, addRow, updateRow, removeRow } = useProjet();

  const dallesNiveau = dalles.filter(d => d.niveauId === niveauActifId);
  const hourdis12Niveau = plancherHourdis12.filter(p => p.niveauId === niveauActifId);
  const hourdis16Niveau = plancherHourdis16.filter(p => p.niveauId === niveauActifId);

  const hasHourdis12 = hourdis12Niveau.length > 0;
  const hasHourdis16 = hourdis16Niveau.length > 0;

  const [variante, setVariante] = useState(
    hasHourdis12 ? 'hourdis12' : hasHourdis16 ? 'hourdis16' : 'dalle'
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
            onClick={() => setVariante('hourdis12')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'hourdis12' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Hourdis 12+4
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
            {dallesNiveau.map((ligne, i) => (
              <LigneOuvrage
                key={`dalle-${ligne.id}`}
                titre={`Dalle ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur (m)' },
                  { key: 'largeur', label: 'Largeur (m)' },
                  { key: 'epaisseurCm', label: 'Épaisseur (cm)', overrideDefault: 10 },
                  { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                ]}
                onChange={(cle, val) => updateRow(dalles, setDalles, ligne.id, cle, val)}
                onRemove={() => removeRow(dalles, setDalles, ligne.id)}
              />
            ))}
            <button 
              onClick={() => addRow(dalles, setDalles, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseurCm: 10, nombre: 1 }, 'D')}
              className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2"
            >
              + Ajouter une dalle
            </button>
          </CarteBloc>
        )}

        {variante === 'hourdis12' && (
          <CarteBloc titre="Plancher Hourdis 12+4 (Livré et Posé)">
            {hourdis12Niveau.map((ligne, i) => (
              <LigneOuvrage
                key={`hourdis12-${ligne.id}`}
                titre={`Surface ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur (m)' },
                  { key: 'largeur', label: 'Largeur (m)' },
                  { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                ]}
                onChange={(cle, val) => updateRow(plancherHourdis12, setPlancherHourdis12, ligne.id, cle, val)}
                onRemove={() => removeRow(plancherHourdis12, setPlancherHourdis12, ligne.id)}
              />
            ))}
            <button 
              onClick={() => addRow(plancherHourdis12, setPlancherHourdis12, { niveauId: niveauActifId, longueur: '', largeur: '', nombre: 1 }, 'PH12-')}
              className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2"
            >
              + Ajouter une surface
            </button>
          </CarteBloc>
        )}

        {variante === 'hourdis16' && (
          <CarteBloc titre="Plancher Hourdis 16+4 (Livré et Posé)">
            {hourdis16Niveau.map((ligne, i) => (
              <LigneOuvrage
                key={`hourdis16-${ligne.id}`}
                titre={`Surface ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur (m)' },
                  { key: 'largeur', label: 'Largeur (m)' },
                  { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                ]}
                onChange={(cle, val) => updateRow(plancherHourdis16, setPlancherHourdis16, ligne.id, cle, val)}
                onRemove={() => removeRow(plancherHourdis16, setPlancherHourdis16, ligne.id)}
              />
            ))}
            <button 
              onClick={() => addRow(plancherHourdis16, setPlancherHourdis16, { niveauId: niveauActifId, longueur: '', largeur: '', nombre: 1 }, 'PH16-')}
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
