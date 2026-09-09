import React, { useMemo } from 'react';
import { preparerRendu } from '../../utils/apercuFeuille.js';

/**
 * La feuille du classeur, affichée telle qu'elle a été mise en forme.
 *
 * L'onglet Devis relisait bien les quantités et les prix de la feuille, mais
 * les réaffichait dans son propre tableau : couleurs, fusions, largeurs de
 * colonnes et gras posés dans l'éditeur disparaissaient au retour. On rend
 * donc la feuille elle-même, en HTML — pas un second tableur.
 *
 * En HTML plutôt qu'en rouvrant Univer : un canvas démonté puis remonté
 * n'affichait plus rien (l'aperçu restait blanc), il ne s'imprime pas, et il
 * pèse plusieurs mégaoctets pour un document qu'on ne fait que regarder.
 *
 * Tout le travail est dans `preparerRendu()` — ici il ne reste que la pose.
 */
export default function ApercuFeuilleExcel({ classeur, feuille }) {
  const rendu = useMemo(() => preparerRendu(classeur, feuille), [classeur, feuille]);

  if (!rendu) {
    return (
      <div className="rounded-lg border border-dashed border-devis-border bg-white p-8 text-center text-[13px] text-brand-text/50">
        Cette feuille est vide.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
      <table
        className="border-collapse text-[13px]"
        style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}
      >
        <colgroup>
          {rendu.largeurs.map((largeur, i) => (
            <col key={i} style={{ width: `${largeur}px` }} />
          ))}
        </colgroup>
        <tbody>
          {rendu.lignes.map((ligne) => (
            <tr key={ligne.cle} style={ligne.hauteur ? { height: `${ligne.hauteur}px` } : undefined}>
              {ligne.cases.map((c) => (
                <td
                  key={c.cle}
                  rowSpan={c.fusion?.rowSpan}
                  colSpan={c.fusion?.colSpan}
                  style={{ padding: '3px 6px', ...c.css }}
                >
                  {c.texte}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
