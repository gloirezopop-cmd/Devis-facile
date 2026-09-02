import React, { useState } from 'react';
import { useMetre } from '../../hooks/useMetre';
import CarteBloc from '../ui/CarteBloc';
import LigneOuvrage from '../ui/LigneOuvrage';

export default function Plancher() {
  const { niveauActif, updateLigne, addLigne, removeLigne } = useMetre();

  if (!niveauActif) {
    return null;
  }

  // On stocke le choix de la variante dans l'état local ou dans les paramètres du niveau.
  // Pour simplifier, on lit depuis le premier élément existant pour déterminer le type actif.
  const hasHourdis12 = niveauActif.plancherHourdis12?.length > 0;
  const hasHourdis16 = niveauActif.plancherHourdis16?.length > 0;
  
  const [variante, setVariante] = useState(
    hasHourdis12 ? 'hourdis12' : hasHourdis16 ? 'hourdis16' : 'dalle'
  );

  const handleVarianteChange = (v) => {
    setVariante(v);
    // Optionnel : on pourrait vider les autres tableaux, mais on les garde en mémoire au cas où.
  };

  return (
    <section className="mb-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-4 border-b border-devis-border pb-2">
        <h2 className="font-sans text-2xl font-bold text-devis-calcule">Plancher</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => handleVarianteChange('dalle')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'dalle' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Dalle Pleine (BA)
          </button>
          <button 
            onClick={() => handleVarianteChange('hourdis12')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'hourdis12' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Hourdis 12+4
          </button>
          <button 
            onClick={() => handleVarianteChange('hourdis16')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'hourdis16' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Hourdis 16+4
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {variante === 'dalle' && (
          <CarteBloc titre="Dalle Pleine (Dosage 350 kg/m³)">
            {(niveauActif.dalles || []).map((ligne, i) => (
              <LigneOuvrage
                key={`dalle-${i}`}
                titre={`Dalle ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur (m)' },
                  { key: 'largeur', label: 'Largeur (m)' },
                  { key: 'epaisseurCm', label: 'Épaisseur (cm)', overrideDefault: 10 },
                  { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                ]}
                onChange={(cle, val) => updateLigne('dalles', i, cle, val)}
                onRemove={() => removeLigne('dalles', i)}
              />
            ))}
            <button onClick={() => addLigne('dalles', { longueur: '', largeur: '', epaisseurCm: 10, nombre: 1 })} className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2">
              + Ajouter une dalle
            </button>
          </CarteBloc>
        )}

        {variante === 'hourdis12' && (
          <CarteBloc titre="Plancher Hourdis 12+4 (Livré et Posé)">
            {(niveauActif.plancherHourdis12 || []).map((ligne, i) => (
              <LigneOuvrage
                key={`hourdis12-${i}`}
                titre={`Surface ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur (m)' },
                  { key: 'largeur', label: 'Largeur (m)' },
                  { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                ]}
                onChange={(cle, val) => updateLigne('plancherHourdis12', i, cle, val)}
                onRemove={() => removeLigne('plancherHourdis12', i)}
              />
            ))}
            <button onClick={() => addLigne('plancherHourdis12', { longueur: '', largeur: '', nombre: 1 })} className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2">
              + Ajouter une surface
            </button>
          </CarteBloc>
        )}

        {variante === 'hourdis16' && (
          <CarteBloc titre="Plancher Hourdis 16+4 (Livré et Posé)">
            {(niveauActif.plancherHourdis16 || []).map((ligne, i) => (
              <LigneOuvrage
                key={`hourdis16-${i}`}
                titre={`Surface ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur (m)' },
                  { key: 'largeur', label: 'Largeur (m)' },
                  { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                ]}
                onChange={(cle, val) => updateLigne('plancherHourdis16', i, cle, val)}
                onRemove={() => removeLigne('plancherHourdis16', i)}
              />
            ))}
            <button onClick={() => addLigne('plancherHourdis16', { longueur: '', largeur: '', nombre: 1 })} className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2">
              + Ajouter une surface
            </button>
          </CarteBloc>
        )}
      </div>
    </section>
  );
}
