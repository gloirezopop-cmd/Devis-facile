import React, { useState } from 'react';
import { useProjet } from '../../context/ProjetContext';
import CarteBloc from '../ui/CarteBloc';
import LigneOuvrage from '../ui/LigneOuvrage';

export default function Toiture() {
  const { niveauActifId, charpentes, setCharpentes, couverturesToles, setCouverturesToles, terrasses, setTerrasses, addRow, updateRow, removeRow } = useProjet();

  const charpentesNiveau = charpentes.filter(c => c.niveauId === niveauActifId);
  const couverturesNiveau = couverturesToles.filter(c => c.niveauId === niveauActifId);
  const terrassesNiveau = terrasses.filter(t => t.niveauId === niveauActifId);

  const hasCharpente = charpentesNiveau.length > 0 || couverturesNiveau.length > 0;
  const hasTerrasse = terrassesNiveau.length > 0;

  const [variante, setVariante] = useState(
    hasCharpente ? 'charpente' : hasTerrasse ? 'terrasse' : 'charpente'
  );

  return (
    <section className="mb-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-4 border-b border-devis-border pb-2">
        <h2 className="font-sans text-2xl font-bold text-devis-calcule">Toiture</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setVariante('charpente')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'charpente' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Charpente & Tôles
          </button>
          <button 
            onClick={() => setVariante('terrasse')}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${variante === 'terrasse' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Toiture Terrasse Accessible
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {variante === 'charpente' && (
          <>
            <CarteBloc titre="Charpente en Bois (Méthode Simplifiée)">
              {charpentesNiveau.map((ligne, i) => (
                <LigneOuvrage
                  key={`charpente-${ligne.id}`}
                  titre={`Charpente ${i + 1}`}
                  ligne={ligne}
                  champs={[
                    { key: 'longueur', label: 'Longueur bât. (m)' },
                    { key: 'portee', label: 'Portée (m)' },
                    { key: 'debord', label: 'Débord (m)' },
                    { key: 'faitage', label: 'H. Faîtage (m)' },
                    { key: 'ecartement', label: 'Écartement fermes (m)' },
                    { key: 'section', label: 'Section bois (m)' },
                    { key: 'lignesPannes', label: 'Lignes de pannes' }
                  ]}
                  onChange={(cle, val) => updateRow(charpentes, setCharpentes, ligne.id, cle, val)}
                  onRemove={() => removeRow(charpentes, setCharpentes, ligne.id)}
                />
              ))}
              <button 
                onClick={() => addRow(charpentes, setCharpentes, { niveauId: niveauActifId, longueur: '', portee: '', debord: '', faitage: '', ecartement: '', section: '', lignesPannes: '', nombre: 1 }, 'CH')}
                className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2"
              >
                + Ajouter une charpente
              </button>
            </CarteBloc>

            <CarteBloc titre="Couverture en Tôles">
              {couverturesNiveau.map((ligne, i) => (
                <LigneOuvrage
                  key={`couverture-${ligne.id}`}
                  titre={`Couverture ${i + 1}`}
                  ligne={ligne}
                  champs={[
                    { key: 'longueur', label: 'Longueur (m)' },
                    { key: 'portee', label: 'Portée (m)' },
                    { key: 'debord', label: 'Débord (m)' }
                  ]}
                  onChange={(cle, val) => updateRow(couverturesToles, setCouverturesToles, ligne.id, cle, val)}
                  onRemove={() => removeRow(couverturesToles, setCouverturesToles, ligne.id)}
                />
              ))}
              <button 
                onClick={() => addRow(couverturesToles, setCouverturesToles, { niveauId: niveauActifId, longueur: '', portee: '', debord: '', nombre: 1 }, 'CV')}
                className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2"
              >
                + Ajouter une couverture
              </button>
            </CarteBloc>
          </>
        )}

        {variante === 'terrasse' && (
          <CarteBloc titre="Toiture-Terrasse Accessible (Acrotère & Forme de pente)">
            {terrassesNiveau.map((ligne, i) => (
              <LigneOuvrage
                key={`terrasse-${ligne.id}`}
                titre={`Terrasse ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur (m)' },
                  { key: 'largeur', label: 'Largeur (m)' },
                  { key: 'perimetre', label: 'Périmètre acrotère (m)' },
                  { key: 'largeurChainage', label: 'Larg. Chaînage (m)', overrideDefault: 0.15 },
                  { key: 'hauteurChainage', label: 'Haut. Chaînage (m)', overrideDefault: 0.15 },
                  { key: 'hauteurAcrotere', label: 'Haut. Maçonnerie Acrotère (m)', overrideDefault: 0.60 }
                ]}
                onChange={(cle, val) => updateRow(terrasses, setTerrasses, ligne.id, cle, val)}
                onRemove={() => removeRow(terrasses, setTerrasses, ligne.id)}
              />
            ))}
            <button 
              onClick={() => addRow(terrasses, setTerrasses, { niveauId: niveauActifId, longueur: '', largeur: '', perimetre: '', largeurChainage: 0.15, hauteurChainage: 0.15, hauteurAcrotere: 0.60, nombre: 1 }, 'T')}
              className="mt-4 text-devis-saisie hover:underline text-sm font-bold min-h-[44px] px-2"
            >
              + Ajouter une toiture-terrasse
            </button>
          </CarteBloc>
        )}
      </div>
    </section>
  );
}
