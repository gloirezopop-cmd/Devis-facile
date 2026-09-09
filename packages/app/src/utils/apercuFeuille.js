/**
 * La feuille du classeur transformee en lignes et cases pretes a poser dans un
 * tableau HTML : couleurs, fusions, largeurs et bordures resolues une fois.
 *
 * Separee du composant pour etre verifiable sans navigateur — le rendu d une
 * feuille mise en forme est exactement le genre de chose qui casse en silence.
 */

/**
 * La feuille du classeur, rendue telle qu'elle a été mise en forme.
 *
 * L'onglet Devis relisait bien les quantités et les prix de la feuille, mais
 * les réaffichait dans son propre tableau : couleurs, fusions, largeurs de
 * colonnes et gras posés dans l'éditeur disparaissaient au retour. On rend
 * donc la feuille elle-même, en HTML — pas un second tableur.
 *
 * En HTML plutôt qu'en rouvrant Univer : un canvas démonté puis remonté
 * n'affichait plus rien (l'aperçu restait blanc), il ne s'imprime pas, et il
 * pèse plusieurs mégaoctets pour un document qu'on ne fait que regarder.
 */

/** Univer range les styles soit en clair dans la cellule, soit dans une table du classeur. */
function styleDeCellule(classeur, cellule) {
  if (!cellule || cellule.s === undefined || cellule.s === null) return {};
  if (typeof cellule.s === 'object') return cellule.s;
  return classeur?.styles?.[cellule.s] || {};
}

const ALIGNEMENTS = { 1: 'left', 2: 'center', 3: 'right' };
const ALIGNEMENTS_VERTICAUX = { 1: 'top', 2: 'middle', 3: 'bottom' };

/** `s` porte l'épaisseur du trait ; au-delà du trait fin, on double. */
function bord(cote) {
  if (!cote) return undefined;
  const couleur = cote.cl?.rgb || '#C3CCD6';
  const epaisseur = cote.s >= 2 ? 2 : 1;
  return `${epaisseur}px solid ${couleur}`;
}

/**
 * Le motif de nombre d'Univer, appliqué au plus près : séparateur de milliers
 * et nombre de décimales. Inutile d'aller plus loin — la feuille du devis
 * n'utilise que `#,##0` et `#,##0.00`.
 */
function formaterValeur(cellule, style) {
  const brut = texteCellule(cellule);
  if (brut === '') return '';
  const motif = style?.n?.pattern;
  if (!motif || cellule?.t !== 2) return brut;

  const valeur = Number(brut);
  if (!Number.isFinite(valeur)) return brut;

  const decimales = (motif.split('.')[1] || '').replace(/[^0#]/g, '').length;
  return valeur.toLocaleString('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: motif.includes(','),
  });
}

function texteCellule(cellule) {
  if (!cellule) return '';
  if (cellule.v !== undefined && cellule.v !== null) return String(cellule.v);
  const flux = cellule.p?.body?.dataStream;
  if (typeof flux === 'string') return flux.replace(/[\r\n\0]/g, '');
  return '';
}

function cssDeStyle(style) {
  const css = {};
  if (style.bg?.rgb) css.backgroundColor = style.bg.rgb;
  if (style.cl?.rgb) css.color = style.cl.rgb;
  if (style.bl) css.fontWeight = 700;
  if (style.it) css.fontStyle = 'italic';
  if (style.fs) css.fontSize = `${style.fs}px`;
  if (style.ff) css.fontFamily = `${style.ff}, sans-serif`;
  if (style.ht !== undefined && ALIGNEMENTS[style.ht]) css.textAlign = ALIGNEMENTS[style.ht];
  if (style.vt !== undefined && ALIGNEMENTS_VERTICAUX[style.vt]) css.verticalAlign = ALIGNEMENTS_VERTICAUX[style.vt];

  const decorations = [];
  if (style.ul?.s) decorations.push('underline');
  if (style.st?.s) decorations.push('line-through');
  if (decorations.length > 0) css.textDecoration = decorations.join(' ');

  if (style.bd) {
    const haut = bord(style.bd.t);
    const bas = bord(style.bd.b);
    const gauche = bord(style.bd.l);
    const droite = bord(style.bd.r);
    if (haut) css.borderTop = haut;
    if (bas) css.borderBottom = bas;
    if (gauche) css.borderLeft = gauche;
    if (droite) css.borderRight = droite;
  }

  return css;
}

function trouverFeuille(classeur, cle) {
  const feuilles = classeur?.sheets;
  if (!feuilles) return null;
  if (feuilles[cle]) return feuilles[cle];
    const normaliser = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const parNom = Object.values(feuilles).find((f) => normaliser(f?.name || '').includes(normaliser(cle)));
  if (parNom) return parNom;
  const ordre = Array.isArray(classeur.sheetOrder) ? classeur.sheetOrder : Object.keys(feuilles);
  return feuilles[ordre[cle === 'entreprise' ? 1 : 0]] || null;
}

export function preparerRendu(classeur, cleFeuille) {
  const feuille = trouverFeuille(classeur, cleFeuille);
  const cellules = feuille?.cellData;
  if (!cellules) return null;

  // L'étendue réellement occupée : une feuille déclare 150 lignes et 10
  // colonnes, dont l'immense majorité est vide.
  let dernierRang = -1;
  let derniereColonne = -1;
  for (const [rangTexte, ligne] of Object.entries(cellules)) {
    const rang = Number(rangTexte);
    if (!Number.isInteger(rang) || !ligne) continue;
    let ligneUtile = false;
    for (const [colTexte, cellule] of Object.entries(ligne)) {
      const col = Number(colTexte);
      if (!Number.isInteger(col)) continue;
      const styleCellule = styleDeCellule(classeur, cellule);
      // Une cellule vide mais peinte fait partie du tableau : elle compte.
      if (texteCellule(cellule) !== '' || styleCellule.bg || styleCellule.bd) {
        ligneUtile = true;
        if (col > derniereColonne) derniereColonne = col;
      }
    }
    if (ligneUtile && rang > dernierRang) dernierRang = rang;
  }
  if (dernierRang < 0) return null;

  // Les fusions : la cellule d'ancrage porte le rowspan/colspan, les autres
  // ne sont pas rendues du tout.
  const ancres = new Map();
  const couvertes = new Set();
  for (const m of feuille.mergeData || []) {
    ancres.set(`${m.startRow}:${m.startColumn}`, {
      rowSpan: m.endRow - m.startRow + 1,
      colSpan: m.endColumn - m.startColumn + 1,
    });
    for (let r = m.startRow; r <= m.endRow; r += 1) {
      for (let c = m.startColumn; c <= m.endColumn; c += 1) {
        if (r !== m.startRow || c !== m.startColumn) couvertes.add(`${r}:${c}`);
      }
    }
  }

  const largeurs = [];
  for (let c = 0; c <= derniereColonne; c += 1) largeurs.push(feuille.columnData?.[c]?.w || 90);

  const lignes = [];
  for (let r = 0; r <= dernierRang; r += 1) {
    const source = cellules[r] || {};
    const cases = [];
    for (let c = 0; c <= derniereColonne; c += 1) {
      if (couvertes.has(`${r}:${c}`)) continue;
      const cellule = source[c];
      const style = styleDeCellule(classeur, cellule);
      cases.push({
        cle: `${r}:${c}`,
        texte: formaterValeur(cellule, style),
        css: cssDeStyle(style),
        fusion: ancres.get(`${r}:${c}`),
      });
    }
    lignes.push({ cle: r, hauteur: feuille.rowData?.[r]?.h, cases });
  }

  return { largeurs, lignes };
}
