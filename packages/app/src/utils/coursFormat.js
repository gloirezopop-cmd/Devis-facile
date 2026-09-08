/**
 * Met en forme le texte brut d'un chapitre du cours (extrait tel quel du
 * .docx source) en blocs typés, pour un rendu pédagogique — titres de
 * sous-section, données/formules mises en évidence, légendes de schéma,
 * notes de correction — plutôt qu'un mur de texte brut.
 *
 * Le texte source n'est jamais réécrit ici : on ne fait que reconnaître sa
 * structure existante (numérotation I.1/II.1.1/a) déjà présente dans le
 * document) pour la mettre en valeur.
 */

// Un vrai titre porte une numérotation à point : "I.1.", "1.3.1.", "III.2." —
// jamais un nombre nu suivi d'un mot ("50 Kg poids d'un sac...").
const RE_TITRE = /^((?:[IVXLC]+|\d+)(?:\.\d+)+\.?|(?:[IVXLC]+|\d+)\.)\s+(.{2,90})$/;
const RE_LETTRE = /^([a-z]\))\s+(.+)$/;
const RE_NOTE = /^>>\s?(.+)$/; // marqueur editorial : correction Devis Facile BTP
const RE_FIGURE = /^\(.*\)$/;
const RE_LEAD = /^([A-Za-zÀ-ÿ' ]{2,40}) ?:$/; // "Avec :", "Sachant que :", "NB :"
const RE_DONNEE = /^[A-Za-zÀ-ÿ.²³%\s]{1,18}\s?[:=]\s?.*\d/; // "LA : 185,25 m", "L=1,00 m"
const RE_FORMULE = /=.*\d|^=>/; // contient un signe = suivi (ou précédé) d'un chiffre, ou commence par =>

function typerLigne(ligne) {
  const l = ligne.trim();
  if (!l) return null;
  if (RE_NOTE.test(l)) return { type: 'note', texte: l.match(RE_NOTE)[1] };
  if (RE_FIGURE.test(l)) return { type: 'figure', texte: l };
  if (RE_TITRE.test(l) && l.length < 95 && !/[.]\s\w.*[.]\s\w/.test(l)) {
    // Évite de confondre une phrase normale ("Ex : ...") avec un titre :
    // un vrai titre n'a pas de point final suivi d'une autre phrase.
    return { type: 'titre', texte: l };
  }
  if (RE_LETTRE.test(l)) return { type: 'liste', texte: l };
  if (l.endsWith(';') || l.endsWith(' ;')) return { type: 'liste', texte: l };
  if (RE_LEAD.test(l)) return { type: 'lead', texte: l };
  if (RE_DONNEE.test(l) || RE_FORMULE.test(l)) return { type: 'formule', texte: l };
  return { type: 'paragraphe', texte: l };
}

/**
 * @param {string} contenu - le champ `content`/`contenu` brut d'un chapitre.
 * @returns {{type: string, texte?: string, lignes?: string[]}[]} blocs groupés
 *   (les lignes 'formule' et 'liste' consécutives sont regroupées en un seul
 *   bloc pour un rendu en carte/liste cohérent plutôt qu'une ligne par ligne).
 */
export function analyserContenuCours(contenu) {
  const lignes = (contenu || '').split('\n').map(typerLigne).filter(Boolean);

  const blocs = [];
  for (const l of lignes) {
    const precedent = blocs[blocs.length - 1];
    if ((l.type === 'formule' || l.type === 'liste') && precedent && precedent.type === l.type) {
      precedent.lignes.push(l.texte);
    } else if (l.type === 'formule' || l.type === 'liste') {
      blocs.push({ type: l.type, lignes: [l.texte] });
    } else {
      blocs.push(l);
    }
  }
  return blocs;
}
