import React from 'react';

export default function ResumeToiture({ resultats, onAjouterDevis }) {
  if (!resultats || !resultats.charpente) return null;

  const renderLot = (titre, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3 pb-2 border-b-2 border-devis-calcule text-devis-calcule uppercase">{titre}</h3>
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Désignation</th>
              <th className="px-4 py-3 text-right">Quantité</th>
              <th className="px-4 py-3 text-center">Unité</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{item.designation}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-devis-calcule">{item.quantite_finale}</td>
                <td className="px-4 py-3 text-center text-gray-500">{item.unite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">RÉSUMÉ DES MATÉRIAUX</h2>
      
      {renderLot('Lot Charpente', resultats.charpente)}
      {renderLot('Lot Couverture', resultats.couverture)}
      {renderLot('Lot Plafond', resultats.plafond)}

      <div className="mt-8 text-center">
        <button 
          onClick={onAjouterDevis}
          className="bg-devis-calcule text-white px-8 py-3 rounded-md font-bold text-lg hover:bg-blue-800 transition-colors shadow-md flex items-center justify-center mx-auto"
        >
          <span className="mr-2">➕</span> AJOUTER AU DEVIS
        </button>
      </div>
    </div>
  );
}
