import React, { useState } from 'react';
import { useMetre } from '../../hooks/useMetre';
import CarteBloc from '../ui/CarteBloc';
import LigneOuvrage from '../ui/LigneOuvrage';

export default function Toiture() {
  const { niveauActif, updateLigne, addLigne, removeLigne } = useMetre();

  const hasTerrasse = (niveauActif.acrotere?.length > 0) || (niveauActif.formePente?.length > 0);
  const hasCharpente = (niveauActif.charpenteBois?.length > 0) || (niveauActif.couvertureToles?.length > 0);

  const [variante, setVariante] = useState(
    hasTerrasse ? 'terrasse' : hasCharpente ? 'charpente' : 'charpente'
  );

  const handleVarianteChange = (v) => {
    setVariante(v);
  };

  return (
    <section className="mb-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-4 border-b border-devis-border pb-2">
        <h2 className="font-sans text-2xl font-bold text-devis-calcule">Toiture</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => handleVarianteChange('charpente')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'charpente' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Charpente et Couverture
          </button>
          <button 
            onClick={() => handleVarianteChange('terrasse')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'terrasse' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Toiture-Terrasse Accessible
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {variante === 'charpente' && (
          <>
            <CarteBloc titre="Charpente en Bois (Fermes et Pannes)">
              {(niveauActif.charpenteBois || []).map((ligne, i) => (
                <LigneOuvrage
                  key={`charpente-${i}`}
                  titre={`Ferme ${i + 1}`}
                  ligne={ligne}
                  champs={[
                    { key: 'longueur', label: 'Longueur (m)' },
                    { key: 'portee', label: 'Portée (m)' },
                    { key: 'debord', label: 'Débord (m)' },
                    { key: 'faitage', label: 'Hauteur Faîtage (m)' },
                    { key: 'ecartement', label: 'Écartement fermes (m)', overrideDefault: 2.50 },
                    { key: 'section', label: 'Section panne (m)', overrideDefault: 0.08 },
                    { key: 'lignesPannes', label: 'Lignes pannes', overrideDefault: 5 },
                    { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                  ]}
                  onChange={(cle, val) => updateLigne('charpenteBois', i, cle, val)}
                  onRemove={() => removeLigne('charpenteBois', i)}
                />
              ))}
              <button onClick={() => addLigne('charpenteBois', { longueur: '', portee: '', debord: '', faitage: '', ecartement: 2.50, section: 0.08, lignesPannes: 5, nombre: 1 })} className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2">
                + Ajouter charpente
              </button>
            </CarteBloc>

            <CarteBloc titre="Couverture (Tôles et Faîtières)">
              {(niveauActif.couvertureToles || []).map((ligne, i) => (
                <LigneOuvrage
                  key={`toles-${i}`}
                  titre={`Couverture ${i + 1}`}
                  ligne={ligne}
                  champs={[
                    { key: 'longueur', label: 'Longueur (m)' },
                    { key: 'portee', label: 'Portée (m)' },
                    { key: 'debord', label: 'Débord (m)' },
                    { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                  ]}
                  onChange={(cle, val) => updateLigne('couvertureToles', i, cle, val)}
                  onRemove={() => removeLigne('couvertureToles', i)}
                />
              ))}
              <button onClick={() => addLigne('couvertureToles', { longueur: '', portee: '', debord: '', nombre: 1 })} className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2">
                + Ajouter couverture
              </button>
            </CarteBloc>
          </>
        )}

        {variante === 'terrasse' && (
          <>
            <CarteBloc titre="Acrotère (Béton Armé)">
              {(niveauActif.acrotere || []).map((ligne, i) => (
                <LigneOuvrage
                  key={`acrotere-${i}`}
                  titre={`Mur d'Acrotère ${i + 1}`}
                  ligne={ligne}
                  champs={[
                    { key: 'perimetre', label: 'Périmètre (m)' },
                    { key: 'largeur', label: 'Largeur (m)', overrideDefault: 0.15 },
                    { key: 'hauteur', label: 'Hauteur (m)', overrideDefault: 0.15 },
                    { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                  ]}
                  onChange={(cle, val) => updateLigne('acrotere', i, cle, val)}
                  onRemove={() => removeLigne('acrotere', i)}
                />
              ))}
              <button onClick={() => addLigne('acrotere', { perimetre: '', largeur: 0.15, hauteur: 0.15, nombre: 1 })} className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2">
                + Ajouter un acrotère
              </button>
            </CarteBloc>

            <CarteBloc titre="Forme de Pente (Mortier)">
              {(niveauActif.formePente || []).map((ligne, i) => (
                <LigneOuvrage
                  key={`forme-${i}`}
                  titre={`Surface de Forme de Pente ${i + 1}`}
                  ligne={ligne}
                  champs={[
                    { key: 'longueur', label: 'Longueur (m)' },
                    { key: 'largeur', label: 'Largeur (m)' },
                    { key: 'nombre', label: 'Nombre', overrideDefault: 1 }
                  ]}
                  onChange={(cle, val) => updateLigne('formePente', i, cle, val)}
                  onRemove={() => removeLigne('formePente', i)}
                />
              ))}
              <button onClick={() => addLigne('formePente', { longueur: '', largeur: '', nombre: 1 })} className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2">
                + Ajouter une forme de pente
              </button>
            </CarteBloc>
          </>
        )}
      </div>
    </section>
  );
}
