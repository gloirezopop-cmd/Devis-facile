import React, { useState } from 'react';
import { useProjet } from '../../context/ProjetContext';
import CarteBloc from '../ui/CarteBloc';
import { AccordionProvider } from '../ui/Accordion.jsx';
import LigneOuvrage from '../ui/LigneOuvrage';
import ToiturePro from './ToiturePro';

const BLOCS_CHARPENTE = ['Charpente en Bois (Méthode Simplifiée)', 'Couverture en Tôles'];

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
            Toiture Professionnelle
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
          <ToiturePro />
        )}

        {variante === 'terrasse' && (
          <CarteBloc titre="Toiture-Terrasse Accessible (Acrotère & Forme de pente)">
            {terrassesNiveau.map((ligne, i) => (
              <LigneOuvrage
                key={`terrasse-${ligne.id}`}
                titre={`Terrasse ${i + 1}`}
                ligne={ligne}
                champs={[
                  { key: 'longueur', label: 'Longueur' },
                  { key: 'largeur', label: 'Base' },
                  { key: 'perimetre', label: 'Périmètre acrotère' },
                  { key: 'largeurChainage', label: 'Base Chaînage', overrideDefault: 0.15 },
                  { key: 'hauteurChainage', label: 'Haut. Chaînage', overrideDefault: 0.15 },
                  { key: 'hauteurAcrotere', label: 'Haut. Maçonnerie Acrotère', overrideDefault: 0.60 }
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
