import { jsPDF } from 'jspdf';
// jspdf-autotable 5 n'accroche plus `autoTable` au prototype de jsPDF :
// `doc.autoTable(...)` y valait `undefined`, l'export levait une exception
// dans le gestionnaire de clic et aucun fichier n'était produit — le bouton
// paraissait mort. La forme fonctionnelle est celle que la v5 expose.
import autoTable from 'jspdf-autotable';

/**
 * Le Résumé exporté dans la forme exacte de l'écran : une seule table
 * N° / Nature des travaux / Unités / Qte, l'ouvrage puis ses matériaux.
 *
 * Les deux sorties consomment `construireTableauResume()`, la même liste que
 * l'écran affiche. Elles ne peuvent donc pas montrer autre chose que lui.
 */

const formatNum = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const v = Number(val);
  if (Number.isNaN(v)) return String(val);
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
};

const ENCRE = [15, 21, 27];
const FOND_BANDEAU = [228, 233, 239];
const FOND_OUVRAGE = [242, 244, 247];
const FOND_ENTETE = [20, 48, 77];

function enTeteDocument(doc, parametres, largeurPage) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RÉSUMÉ DU MÉTRÉ', largeurPage / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let y = 24;
  const gauche = [
    parametres.reference ? `Projet : ${parametres.reference}` : null,
    parametres.maitreOuvrage ? `Maître d'ouvrage : ${parametres.maitreOuvrage}` : null,
    parametres.localisation ? `Localisation : ${parametres.localisation}` : null,
  ].filter(Boolean);
  gauche.forEach((ligne, i) => doc.text(ligne, 14, y + i * 5));
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, largeurPage - 14, y, { align: 'right' });

  return y + Math.max(gauche.length, 1) * 5 + 4;
}

/** Une ligne du tableau devient une ligne autoTable, habillée selon son type. */
function rangPDF(ligne) {
  if (ligne.type === 'bandeau') {
    return [{
      content: ligne.libelle,
      colSpan: 4,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: FOND_BANDEAU, textColor: ENCRE },
    }];
  }

  if (ligne.type === 'ouvrage') {
    const style = { fontStyle: 'bold', fillColor: FOND_OUVRAGE, textColor: ENCRE };
    return [
      { content: ligne.numero, styles: { ...style, halign: 'center' } },
      { content: ligne.libelle, styles: style },
      { content: ligne.unite || '', styles: { ...style, halign: 'center' } },
      { content: formatNum(ligne.quantite), styles: { ...style, halign: 'right' } },
    ];
  }

  const nom = ligne.precision ? `${ligne.libelle}  (${ligne.precision})` : ligne.libelle;
  return [
    { content: String(ligne.numero ?? ''), styles: { halign: 'center', textColor: [120, 128, 138] } },
    { content: `    ${nom}` },
    { content: ligne.unite || '', styles: { halign: 'center' } },
    { content: formatNum(ligne.quantite), styles: { halign: 'right' } },
  ];
}

/**
 * @param {Array} lignes  sortie de construireTableauResume()
 * @param {object} parametresProjet
 * @param {Array} recapitulatif  [{ nom, quantite, unite }] — le total par matériau
 */
export function exporterResumePDF(lignes, parametresProjet = {}, recapitulatif = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const largeurPage = doc.internal.pageSize.width;

  const debut = enTeteDocument(doc, parametresProjet, largeurPage);

  autoTable(doc, {
    startY: debut,
    head: [['N°', 'Nature des travaux', 'Unités', 'Qte']],
    body: lignes.map(rangPDF),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.6, textColor: ENCRE, overflow: 'linebreak' },
    headStyles: { fillColor: FOND_ENTETE, textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const utiles = recapitulatif.filter((m) => m.quantite > 0);
  if (utiles.length > 0) {
    let y = doc.lastAutoTable.finalY + 10;
    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RÉCAPITULATIF GLOBAL DES MATÉRIAUX', 14, y);

    autoTable(doc, {
      startY: y + 3,
      head: [['Matériau', 'Quantité globale', 'Unité']],
      body: utiles.map((m) => [m.nom, formatNum(m.quantite), m.unite]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.4, textColor: ENCRE },
      headStyles: { fillColor: [20, 99, 74], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
  }

  const pages = doc.internal.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.text(
      `Page ${p} sur ${pages} — Devis Facile BTP`,
      largeurPage / 2,
      doc.internal.pageSize.height - 9,
      { align: 'center' },
    );
  }

  doc.save(`Resume_Metre_${(parametresProjet.reference || 'Projet').replace(/\s/g, '_')}.pdf`);
  // Rendu pour que l'appelant puisse relire le document produit — c'est ce qui
  // permet de vérifier l'export sans navigateur.
  return doc;
}

/** Word n'accepte pas les caractères réservés d'HTML dans un libellé libre. */
const echapper = (texte) =>
  String(texte ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function rangWord(ligne) {
  if (ligne.type === 'bandeau') {
    return `<tr><td colspan="4" class="bandeau">${echapper(ligne.libelle)}</td></tr>`;
  }
  if (ligne.type === 'ouvrage') {
    return `<tr class="ouvrage">
      <td class="c">${echapper(ligne.numero)}</td>
      <td>${echapper(ligne.libelle)}</td>
      <td class="c">${echapper(ligne.unite)}</td>
      <td class="d">${formatNum(ligne.quantite)}</td>
    </tr>`;
  }
  const precision = ligne.precision ? ` <span class="gris">(${echapper(ligne.precision)})</span>` : '';
  return `<tr>
    <td class="c gris">${echapper(ligne.numero)}</td>
    <td class="retrait">${echapper(ligne.libelle)}${precision}</td>
    <td class="c">${echapper(ligne.unite)}</td>
    <td class="d">${formatNum(ligne.quantite)}</td>
  </tr>`;
}

/**
 * Export Word (.doc) : un document HTML que Word ouvre comme un document
 * natif — sans dépendance lourde, et le tableau reste éditable.
 */
export function exporterResumeWord(lignes, parametresProjet = {}, recapitulatif = []) {
  const infos = [
    parametresProjet.reference ? `<strong>Projet :</strong> ${echapper(parametresProjet.reference)}` : null,
    parametresProjet.maitreOuvrage ? `<strong>Maître d'ouvrage :</strong> ${echapper(parametresProjet.maitreOuvrage)}` : null,
    parametresProjet.localisation ? `<strong>Localisation :</strong> ${echapper(parametresProjet.localisation)}` : null,
    `<strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}`,
  ].filter(Boolean).join('<br>');

  const utiles = recapitulatif.filter((m) => m.quantite > 0);

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Résumé du Métré</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #0F151B; }
  h1 { text-align: center; font-size: 16pt; }
  h2 { font-size: 12pt; margin-top: 18pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1pt solid #000; padding: 3pt 5pt; }
  th { background: #14304D; color: #fff; text-align: center; }
  .bandeau { background: #E4E9EF; text-align: center; font-weight: bold; text-transform: uppercase; }
  .ouvrage td { background: #F2F4F7; font-weight: bold; }
  .c { text-align: center; }
  .d { text-align: right; }
  .gris { color: #78808A; }
  .retrait { padding-left: 18pt; }
  .infos { margin-bottom: 14pt; }
</style>
</head>
<body>
<h1>RÉSUMÉ DU MÉTRÉ</h1>
<p class="infos">${infos}</p>
<table>
  <thead><tr><th style="width:8%">N°</th><th>Nature des travaux</th><th style="width:14%">Unités</th><th style="width:16%">Qte</th></tr></thead>
  <tbody>${lignes.map(rangWord).join('')}</tbody>
</table>
${utiles.length === 0 ? '' : `
<h2>RÉCAPITULATIF GLOBAL DES MATÉRIAUX</h2>
<table>
  <thead><tr><th>Matériau</th><th style="width:22%">Quantité globale</th><th style="width:16%">Unité</th></tr></thead>
  <tbody>${utiles.map((m) => `<tr><td><strong>${echapper(m.nom)}</strong></td><td class="d">${formatNum(m.quantite)}</td><td class="c">${echapper(m.unite)}</td></tr>`).join('')}</tbody>
</table>`}
</body></html>`;

  const blob = new Blob(["\ufeff", html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `Resume_Metre_${(parametresProjet.reference || 'Projet').replace(/\s/g, '_')}.doc`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
  return html;
}
