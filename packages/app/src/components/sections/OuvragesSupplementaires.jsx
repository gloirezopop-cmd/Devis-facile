import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';

export default function OuvragesSupplementaires() {
  const {
    autresOuvrages, setAutresOuvrages,
    bibliothequePrix, labelsPrix,
    addRow, removeRow, updateRow, niveauActifId
  } = useProjet();
  
  const currentAutres = autresOuvrages.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Ouvrages Supplémentaires</h2>

      <CarteBloc
        titre="Tâches Libres / Autres Éléments"
        onAdd={() => addRow(autresOuvrages, setAutresOuvrages, { niveauId: niveauActifId, materiauKey: Object.keys(bibliothequePrix)[0] || '', unite: 'u', quantite: '1' }, '')}
        addLabel="Ajouter une tâche libre"
      >
        {currentAutres.map((o, index) => (
          <LigneOuvrage
            key={o.id} repere={`Ligne ${index + 1}`} titre="Élément Libre"
            onRemove={currentAutres.length > 1 ? () => removeRow(autresOuvrages, setAutresOuvrages, o.id) : null}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
              <div className="md:col-span-2">
                <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider mb-1 block">Sélectionnez un élément</label>
                <select
                  value={o.materiauKey}
                  onChange={(e) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'materiauKey', e.target.value)}
                  className="border border-devis-border rounded p-2 text-devis-calcule w-full h-[44px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-sans text-sm"
                >
                  {Object.keys(bibliothequePrix).map(cle => (
                    <option key={cle} value={cle}>{labelsPrix[cle] || cle}</option>
                  ))}
                </select>
              </div>
              <InputSaisie label="Unité" value={o.unite} onChange={(v) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'unite', v)} type="text" placeholder="u, ml, forfait..." />
              <InputSaisie label="Quantité" value={o.quantite} onChange={(v) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'quantite', v)} unite="" />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
    </section>
  );
}
