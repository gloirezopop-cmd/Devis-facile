import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { TITRES_LOTS_PARTICULIER, TITRES_LOTS_ENTREPRISE } from '@devis-facile/moteur';
import { formaterNombre } from '../../utils/format.js';
import { numberToFrenchWords } from '../../utils/nombreEnLettres.js';

const toRoman = (num) => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
  return roman[num - 1] || num;
};

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

  const cellule = 'px-2 py-1.5 border border-black text-black';
  const enteteCellule = 'px-2 py-2 border-2 border-black text-black font-bold uppercase text-center text-[12px] bg-[#ffc000]';

  let globalSousTotalIndex = 0;

  return (
    <div className="bg-white shadow-sm overflow-hidden p-1">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border-2 border-black min-w-[760px] bg-white">
          <thead>
            <tr>
              <th className={`${enteteCellule} w-12`}>N°</th>
              <th className={`${enteteCellule}`}>DESIGNATION</th>
              <th className={`${enteteCellule} w-16`}>Unité</th>
              <th className={`${enteteCellule} w-24`}>Qtté</th>
              <th className={`${enteteCellule} w-32`}>P.U (FCFA)</th>
              <th className={`${enteteCellule} w-36`}>P.T (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {ordre.map((lotId, index) => {
              const lot = groupes[lotId];
              if (!lot?.lignes?.length) return null;
              const titre = titres[lotId] || lot.nom || lotId;
              const lotIndex = index + 1;
              globalSousTotalIndex++;

              return (
                <Fragment key={lotId}>
                  <tr className="bg-white">
                    <td className={`${cellule} text-[12.5px]`}>{lotIndex}</td>
                    <td colSpan="5" className={`${cellule} text-[12.5px] uppercase`}>
                      {titre}
                    </td>
                  </tr>

                  {lot.lignes.map((ligne, i) => {
                    const lineIndex = `${lotIndex}.${i + 1}`;
                    return (
                      <tr key={`${lotId}-${i}`} className="bg-white">
                        <td className={`${cellule} text-[12.5px]`}>{lineIndex}</td>
                        <td className={`${cellule} text-[12.5px]`}>{ligne.designation}</td>
                        <td className={`${cellule} text-[12.5px]`}>{ligne.unite}</td>
                        <td className={`${cellule} text-[12.5px] tabular-nums`}>{formaterNombre(ligne.quantite)}</td>
                        <td className={`${cellule} text-[12.5px] tabular-nums`}>
                          {ligne.pu ? formaterNombre(ligne.pu, true) : ''}
                        </td>
                        <td className={`${cellule} text-[12.5px] tabular-nums`}>
                          {ligne.pt ? formaterNombre(ligne.pt, true) : ''}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-[#e2e2e2]">
                    <td colSpan="5" className={`${cellule} text-[12.5px] font-bold`}>
                      Sous total {globalSousTotalIndex}
                    </td>
                    <td className={`${cellule} text-[13px] font-bold tabular-nums`}>
                      {formaterNombre(lot.sousTotal, true)}
                    </td>
                  </tr>
                </Fragment>
              );
            })}

            {(!estEntreprise && devis?.cascade) && (
              <CascadeRows cascade={devis.cascade} total={devis.total} cellule={cellule} startIndex={ordre.length + 1} />
            )}
            
            {(estEntreprise && devis?.cascade) && (
              <CascadeRowsEntreprise cascade={devis.cascade} total={devis.total} cellule={cellule} />
            )}

            {devis?.total > 0 && (
              <tr>
                <td colSpan="6" className="px-3 py-6 border-2 border-black bg-white">
                  <p className="text-[13.5px] italic text-gray-800">
                    Nous disons en toutes lettres : <strong>{numberToFrenchWords(Math.round(devis.total))} francs CFA.</strong>
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CascadeRows({ cascade, total, cellule, startIndex }) {
  const lignes = [
    { cle: 'imprevus', label: 'Imprévue 5%', bg: 'bg-white' },
    { cle: 'transport', label: 'Transport des matériaux 5%', bg: 'bg-white' },
    { cle: 'mainOeuvre', label: "Main d'œuvre 30%", bg: 'bg-white' },
    { cle: 'honorairesArchi', label: "Honoraire de l'Architecte 8%", bg: 'bg-white' },
    { cle: 'honorairesInge', label: "Honoraire de l'Ingénieur 8%", bg: 'bg-white' },
  ];

  let currentIndex = startIndex;

  return (
    <Fragment>
      <tr className="bg-[#f4b084]">
        <td colSpan="5" className={`${cellule} text-[12.5px] font-bold uppercase`}>TOTAL</td>
        <td className={`${cellule} text-[13px] tabular-nums font-bold`}>
          {formaterNombre(cascade.totalMateriaux || 0, true)}
        </td>
      </tr>
      {lignes.map(({ cle, label, bg }) => {
        const valeur = cascade[cle];
        if (valeur === undefined || valeur === 0) return null;
        const rowNum = currentIndex++;
        return (
          <tr key={cle} className={`${bg}`}>
            <td className={`${cellule} text-[12.5px]`}>{rowNum}</td>
            <td colSpan="4" className={`${cellule} text-[12.5px]`}>{label}</td>
            <td className={`${cellule} text-[13px] tabular-nums`}>
              {formaterNombre(valeur, true)}
            </td>
          </tr>
        );
      })}
      <tr className="bg-[#f4b084]">
        <td colSpan="5" className={`${cellule} text-[13px] font-bold uppercase`}>TOTAL GENERAL</td>
        <td className={`${cellule} text-[14px] tabular-nums font-bold`}>
          {formaterNombre(total, true)}
        </td>
      </tr>
    </Fragment>
  );
}

function CascadeRowsEntreprise({ cascade, total, cellule }) {
  // Adaptation to look like the Image 3
  return (
    <Fragment>
      <tr className="bg-white">
        <td colSpan="5" className={`${cellule} text-[12.5px] font-bold uppercase text-[#00b050]`}>TOTAL</td>
        <td className={`${cellule} text-[13px] tabular-nums font-bold`}>
          {formaterNombre(cascade.totalTravaux || cascade.totalHT, true)}
        </td>
      </tr>
      {cascade.mainOeuvre ? (
        <tr className="bg-white">
          <td colSpan="5" className={`${cellule} text-[12.5px] font-bold uppercase`}>Main d'œuvre 30%</td>
          <td className={`${cellule} text-[13px] tabular-nums font-bold`}>
            {formaterNombre(cascade.mainOeuvre, true)}
          </td>
        </tr>
      ) : null}
      {cascade.honorairesArchi ? (
        <tr className="bg-white">
          <td colSpan="5" className={`${cellule} text-[12.5px] font-bold uppercase text-[#7030a0]`}>HONORAIRE Architecte 8%</td>
          <td className={`${cellule} text-[13px] tabular-nums font-bold`}>
            {formaterNombre(cascade.honorairesArchi, true)}
          </td>
        </tr>
      ) : null}
      {cascade.honorairesInge ? (
        <tr className="bg-white">
          <td colSpan="5" className={`${cellule} text-[12.5px] font-bold uppercase text-[#7030a0]`}>HONORAIRE Ingénieur 8%</td>
          <td className={`${cellule} text-[13px] tabular-nums font-bold`}>
            {formaterNombre(cascade.honorairesInge, true)}
          </td>
        </tr>
      ) : null}
      {cascade.tva ? (
        <tr className="bg-white">
          <td colSpan="5" className={`${cellule} text-[12.5px] font-bold uppercase`}>T.V.A</td>
          <td className={`${cellule} text-[13px] tabular-nums font-bold`}>
            {formaterNombre(cascade.tva, true)}
          </td>
        </tr>
      ) : null}
      <tr className="bg-[#f4b084]">
        <td colSpan="5" className={`${cellule} text-[13px] font-bold uppercase text-[#00b050]`}>TOTAL GENERAL</td>
        <td className={`${cellule} text-[14px] tabular-nums font-bold`}>
          {formaterNombre(total, true)}
        </td>
      </tr>
    </Fragment>
  );
}
