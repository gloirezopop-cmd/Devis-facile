import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { TITRES_LOTS_PARTICULIER, TITRES_LOTS_ENTREPRISE } from '@devis-facile/moteur';

import { formaterNombre } from '../../utils/format.js';

/**
 * Devis quantitatif et estimatif.
 *
 * L'ordre des lots vient des titres du moteur, pas d'une liste recopiee ici :
 * c'est lui qui porte l'ordre chronologique du classeur (terrassement,
 * fondation, elevation, plancher, charpente, couverture, finition), et une
 * seconde liste finirait par diverger de la premiere.
 */
export default function TableauDevis({ devis, type = 'particulier' }) {
  const navigate = useNavigate();
  const estEntreprise = type === 'entreprise';
  const groupes = (estEntreprise ? devis?.niveaux : devis?.lots) || {};
  const titres = estEntreprise ? TITRES_LOTS_ENTREPRISE : TITRES_LOTS_PARTICULIER;

  const voirCalcul = (idTarget) => {
    if (!idTarget) return;
    navigate('/metre?etape=3');
    setTimeout(() => {
      const el = document.getElementById(`calc_${idTarget}`) || document.getElementById(`mat_${idTarget}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Le devis porte l'ordre du Résumé : on le suit tel quel. À défaut (version
  // Excel relue, projet enregistré avant), on retombe sur les lots connus
  // d'abord, puis ceux que l'utilisateur a ajoutés, dans leur ordre de création.
  const ordre = Array.isArray(devis?.ordreLots) && devis.ordreLots.length > 0
    ? devis.ordreLots.filter((id) => groupes[id])
    : [
        ...Object.keys(titres).filter((id) => groupes[id]),
        ...Object.keys(groupes).filter((id) => !(id in titres)),
      ];

  const lignesTotales = ordre.reduce((n, id) => n + (groupes[id]?.lignes?.length || 0), 0);

  if (lignesTotales === 0) {
    return (
      <div className="bg-white rounded-lg border border-dashed border-devis-border p-8 text-center">
        <p className="text-gray-500">
          Le devis se remplit tout seul au fur et à mesure du métré.
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Saisissez un premier ouvrage pour voir apparaître sa ligne ici.
        </p>
      </div>
    );
  }

  const cellule = 'p-2 border border-devis-border';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-devis-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-gray-100 text-black border-b-2 border-black">
              <th className={`${cellule} text-xs font-bold uppercase w-12 text-center`}>N°</th>
              <th className={`${cellule} text-xs font-bold uppercase`}>Désignation des ouvrages</th>
              <th className={`${cellule} text-xs font-bold uppercase w-20 text-center`}>U</th>
              <th className={`${cellule} text-xs font-bold uppercase w-24 text-right`}>Qté</th>
              <th className={`${cellule} text-xs font-bold uppercase w-32 text-right`}>P.U.</th>
              <th className={`${cellule} text-xs font-bold uppercase w-36 text-right`}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {ordre.map((lotId, index) => {
              const lot = groupes[lotId];
              if (!lot?.lignes?.length) return null;
              const titre = titres[lotId] || lot.nom || lotId;

              return (
                <Fragment key={lotId}>
                  <tr className="bg-blue-50 border-y border-black">
                    <td className={`${cellule} font-bold text-center`}>{index + 1}</td>
                    <td colSpan="5" className={`${cellule} font-bold uppercase text-blue-900 tracking-wide`}>
                      {titre}
                    </td>
                  </tr>

                  {lot.lignes.map((ligne, i) => {
                    const sansPrix = !ligne.pu;
                    const idTarget = ligne.id || lotId;
                    return (
                      <tr key={`${lotId}-${i}`} className={sansPrix ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className={`${cellule} text-xs text-center text-gray-500`}>{index + 1}.{i + 1}</td>
                        <td className={`${cellule} text-sm`}>
                          <span>
                            {ligne.designation}
                            {sansPrix && (
                              <span className="ml-2 text-xs font-bold text-amber-700" title="Prix unitaire absent de la bibliothèque">
                                prix à saisir
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`${cellule} text-xs text-center text-gray-600`}>{ligne.unite}</td>
                        <td className={`${cellule} text-sm text-right tabular-nums`}>{formaterNombre(ligne.quantite)}</td>
                        <td className={`${cellule} text-sm text-right tabular-nums ${estEntreprise ? 'text-devis-calcule' : 'text-devis-herite'}`}>
                          {formaterNombre(ligne.pu, true)}
                        </td>
                        <td className={`${cellule} text-sm text-right font-bold tabular-nums text-devis-calcule`}>
                          {formaterNombre(ligne.pt, true)}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-gray-100 border-b-2 border-black">
                    <td colSpan="5" className={`${cellule} text-xs font-bold text-right uppercase`}>
                      Sous-total — {titre}
                    </td>
                    <td className={`${cellule} text-sm text-right font-bold tabular-nums`}>
                      {formaterNombre(lot.sousTotal, true)}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {devis?.cascade && <Cascade cascade={devis.cascade} total={devis.total} />}
    </div>
  );
}

/** Le pied de devis : la suite des majorations jusqu'au total a payer. */
function Cascade({ cascade, total }) {
  const libelles = {
    totalMateriaux: 'Total fournitures',
    imprevus: 'Imprévus',
    transport: 'Transport',
    mainOeuvre: "Main d'œuvre",
    totalTravaux: 'Total travaux',
    honorairesArchi: 'Honoraires architecte',
    honorairesInge: 'Honoraires ingénieur',
    totalGrosOeuvre: 'Total gros œuvre',
    totalSecondOeuvre: 'Total second œuvre',
    totalHT: 'Total HT',
    tva: 'TVA',
    netAPayer: 'Net à payer',
  };
  const intermediaires = ['totalTravaux', 'totalHT', 'totalGrosOeuvre', 'totalSecondOeuvre'];

  return (
    <div className="border-t-2 border-black bg-gray-50 p-4">
      <table className="w-full max-w-md ml-auto text-sm">
        <tbody>
          {Object.entries(cascade)
            .filter(([cle]) => cle !== 'totalGeneral' && cle !== 'netAPayer')
            .map(([cle, valeur]) => (
              <tr key={cle} className={intermediaires.includes(cle) ? 'font-bold border-t border-devis-border' : ''}>
                <td className="py-1 pr-4">{libelles[cle] || cle}</td>
                <td className="py-1 text-right tabular-nums">{formaterNombre(valeur, true)}</td>
              </tr>
            ))}
          <tr className="border-t-2 border-black text-base font-bold">
            <td className="pt-2 pr-4">TOTAL (FCFA)</td>
            <td className="pt-2 text-right tabular-nums text-devis-calcule">{formaterNombre(total, true)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
