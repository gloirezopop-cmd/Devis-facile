import React from 'react';

export default function AffichageFormule({ resultat, modePro }) {
  if (!resultat) return null;

  return (
    <div className="mb-4 bg-gray-50 p-4 rounded-md border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-devis-calcule">{resultat.designation}</h4>
        <span className="bg-devis-calcule text-white px-3 py-1 rounded-full text-sm font-bold">
          {resultat.quantite_finale} {resultat.unite}
        </span>
      </div>

      {modePro && (
        <div className="mt-4 p-3 bg-white border border-gray-100 rounded text-sm font-mono text-gray-700">
          <div className="mb-1 text-gray-500">/* Formule */</div>
          <div className="mb-2">{resultat.formule}</div>
          
          <div className="mb-1 text-gray-500">/* Valeurs */</div>
          <div className="mb-2">{resultat.valeurs}</div>
          
          <div className="mb-1 text-gray-500">/* Résultat exact */</div>
          <div className="mb-2 font-bold text-devis-saisie">{resultat.resultat_brut}</div>
          
          <div className="mb-1 text-gray-500">/* Quantité retenue */</div>
          <div className="font-bold text-green-700">{resultat.quantite_finale} {resultat.unite}</div>
        </div>
      )}
    </div>
  );
}
