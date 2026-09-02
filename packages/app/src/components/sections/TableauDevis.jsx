import React, { Fragment } from 'react';
import { formaterNombre } from '../../utils/format.js';

export default function TableauDevis({ devis, type }) {
  if (!devis || !devis.blocs) return <div className="p-4 text-gray-500">Aucune donnée disponible.</div>;

  const titresLots = {
    installation: "1. Installation de chantier",
    terrassement: "2. Terrassements",
    fondation: "3. Fondations",
    elevation: "4. Élévations",
    plancher: "5. Planchers",
    toiture: "6. Toiture et Charpente",
    finition: "7. Finitions"
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-black overflow-hidden mb-8">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-100 text-black border-b-2 border-black">
              <th className="p-3 text-sm font-bold uppercase tracking-wider w-12 text-center border-r border-black">N°</th>
              <th className="p-3 text-sm font-bold uppercase tracking-wider border-r border-black">Désignation des ouvrages</th>
              <th className="p-3 text-sm font-bold uppercase tracking-wider w-20 text-center border-r border-black">U</th>
              <th className="p-3 text-sm font-bold uppercase tracking-wider w-32 text-right border-r border-black">Qte</th>
              <th className="p-3 text-sm font-bold uppercase tracking-wider w-40 text-right border-r border-black">P.U. (FCFA)</th>
              <th className="p-3 text-sm font-bold uppercase tracking-wider w-48 text-right">Montant (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(devis.blocs).map((lotId, index) => {
              const lotData = devis.blocs[lotId];
              if (!lotData.lignes || lotData.lignes.length === 0) return null;

              return (
                <Fragment key={lotId}>
                  <tr className="bg-blue-50 border-y border-black">
                    <td className="p-3 font-bold text-center border-r border-black">{index + 1}</td>
                    <td colSpan="5" className="p-3 font-bold uppercase text-blue-900 tracking-wider">
                      {titresLots[lotId] || lotId}
                    </td>
                  </tr>
                  {lotData.lignes.map((ligne, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-3 text-sm text-center text-gray-500 border border-black border-t-0 border-l-0">{index + 1}.{i + 1}</td>
                      <td className="p-3 text-sm border border-black border-t-0 font-sans">{ligne.designation}</td>
                      <td className="p-3 text-sm text-center text-gray-600 border border-black border-t-0">{ligne.unite}</td>
                      <td className="p-3 text-sm text-right tabular-nums border border-black border-t-0">
                        {formaterNombre(ligne.quantite)}
                      </td>
                      <td className="p-3 text-sm text-right tabular-nums border border-black border-t-0">
                        {/* P.U. est Hérité dans certains cas, Calculé dans d'autres. 
                            Le devis Entreprise contient un P.U. calculé (avec marge), on le met en noir.
                            Le devis Particulier contient un P.U. issu de la bibliothèque, on peut le mettre en vert. */}
                        <span className={type === 'particulier' ? 'text-devis-herite' : 'text-devis-calcule'}>
                          {formaterNombre(ligne.pu, true)}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-right font-bold tabular-nums text-devis-calcule border border-black border-t-0 border-r-0">
                        {formaterNombre(ligne.pt, true)}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-gray-100 border-b-2 border-black">
                    <td colSpan="5" className="p-3 text-sm font-bold text-right uppercase text-black border border-black border-l-0">
                      Sous-total {titresLots[lotId] || lotId}
                    </td>
                    <td className="p-3 text-sm text-right font-bold tabular-nums text-black border-b border-black">
                      {formaterNombre(lotData.sousTotal, true)}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
