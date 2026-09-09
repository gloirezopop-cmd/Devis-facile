// jspdf 4 n'expose plus le constructeur en export par defaut — `import jsPDF
// from 'jspdf'` y rend un objet, et `new jsPDF(...)` levait « jsPDF is not a
// constructor » des le premier clic sur « Exporter en PDF ».
import { jsPDF } from 'jspdf';
// jspdf-autotable 5 n'accroche plus `autoTable` au prototype de jsPDF :
// `doc.autoTable(...)` y est `undefined`, et tout export PDF echouait en
// silence, le clic ne produisant aucun fichier. La forme fonctionnelle
// `autoTable(doc, ...)` est celle que la v5 expose.
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formaterNombre } from '../utils/format.js';

// ─── Utilitaire interne ────────────────────────────────────────────────────────

/**
 * Extrait la liste { lotId, titre, lignes, sousTotal } depuis un devis,
 * quelle que soit sa structure (lots = Particulier, niveaux = Entreprise).
 */
function extraireSections(devis, type) {
  const estEntreprise = type === 'entreprise';
  const groupes = estEntreprise ? (devis?.niveaux || {}) : (devis?.lots || {});
  return Object.entries(groupes)
    .filter(([, lot]) => lot?.lignes?.length > 0)
    .map(([id, lot]) => ({
      id,
      titre: lot.titre || lot.nom || id,
      lignes: lot.lignes,
      sousTotal: lot.sousTotal
    }));
}

// ─── Export PDF ────────────────────────────────────────────────────────────────

/**
 * Exporte un devis au format PDF, mise en page bordereau BTP.
 *
 * En-tete : titre du projet, maitre d ouvrage, localisation, date, reference.
 * Corps    : N° / Designation / Unite / Qte / P.U. / P.T., sous-total par section.
 * Pied     : cascade des taux, total general, montant en toutes lettres, pagination.
 */
export function exporterDevisPDF(devis, type = 'particulier', infoProjet = {}) {
  if (!devis) return;

  const estEntreprise = type === 'entreprise';
  const sections = extraireSections(devis, type);
  if (sections.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const MARGE = 14;
  const LARGEUR = 210 - 2 * MARGE;

  // ── En-tete ──────────────────────────────────────────────────────────────────
  // Le logo, s'il existe, decale le texte du titre pour ne pas le chevaucher.
  let decalageTitre = MARGE;
  if (infoProjet.logo) {
    try {
      const format = /^data:image\/png/i.test(infoProjet.logo) ? 'PNG' : 'JPEG';
      doc.addImage(infoProjet.logo, format, MARGE, 10, 18, 18, undefined, 'FAST');
      decalageTitre = MARGE + 22;
    } catch {
      // Une image corrompue ou d'un format non supporte par jsPDF ne doit pas
      // empecher l'export du devis : on continue simplement sans le logo.
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(infoProjet.nomEntreprise || 'DEVIS FACILE BTP', decalageTitre, 18);

  doc.setFontSize(11);
  doc.text(
    estEntreprise ? 'DEVIS ENTREPRISE (Prix tout compris, TVA comprise)' : 'DEVIS PARTICULIER (Bordereau quantitatif et estimatif)',
    decalageTitre, 26
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const date = new Date().toLocaleDateString('fr-FR');
  const infoLeft  = [
    `Maître d'ouvrage : ${infoProjet.maitreOuvrage  || '—'}`,
    `Localisation : ${infoProjet.localisation || '—'}`,
  ];
  const infoRight = [
    `Référence : ${infoProjet.reference || '—'}`,
    `Date : ${date}`,
  ];
  infoLeft.forEach((line, i)  => doc.text(line, MARGE,          34 + i * 5));
  infoRight.forEach((line, i) => doc.text(line, MARGE + LARGEUR / 2, 34 + i * 5));

  doc.setDrawColor(195, 204, 214);
  doc.line(MARGE, 47, MARGE + LARGEUR, 47);

  // ── Corps ─────────────────────────────────────────────────────────────────────
  const colWidths = [12, 0, 14, 20, 28, 28]; // 0 = auto pour Designation
  const cols = ['N°', 'Désignation des ouvrages', 'U.', 'Quantité', 'P.U. FCFA', 'P.T. FCFA'];

  const rows = [];
  sections.forEach((section, si) => {
    // Ligne de titre de section
    rows.push([
      { content: (si + 1).toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [20, 71, 155] } },
      { content: section.titre.toUpperCase(), colSpan: 5, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [20, 71, 155] } }
    ]);
    section.lignes.forEach((ligne, li) => {
      const sansPrix = !ligne.pu;
      rows.push([
        { content: `${si + 1}.${li + 1}`, styles: { halign: 'center', fontSize: 8 } },
        {
          content: ligne.designation + (sansPrix ? ' (!)' : ''),
          styles: { fontSize: 8, textColor: sansPrix ? [138, 93, 0] : [15, 21, 27] }
        },
        { content: ligne.unite || '', styles: { halign: 'center', fontSize: 8 } },
        { content: formaterNombre(ligne.quantite),   styles: { halign: 'right', fontSize: 8, font: 'courier' } },
        { content: formaterNombre(ligne.pu, true),   styles: { halign: 'right', fontSize: 8, font: 'courier', textColor: estEntreprise ? [20, 71, 155] : [20, 99, 74] } },
        { content: formaterNombre(ligne.pt, true),   styles: { halign: 'right', fontSize: 8, font: 'courier', fontStyle: 'bold' } }
      ]);
    });
    // Sous-total section
    rows.push([
      '',
      { content: `Sous-total — ${section.titre}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [243, 244, 246] } },
      { content: formaterNombre(section.sousTotal, true), styles: { halign: 'right', fontStyle: 'bold', fillColor: [243, 244, 246], font: 'courier' } }
    ]);
  });

  autoTable(doc, {
    head: [cols],
    body: rows,
    startY: 52,
    margin: { left: MARGE, right: MARGE },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 }, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 71, 155], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: colWidths[0], halign: 'center' },
      2: { cellWidth: colWidths[2], halign: 'center' },
      3: { cellWidth: colWidths[3], halign: 'right' },
      4: { cellWidth: colWidths[4], halign: 'right' },
      5: { cellWidth: colWidths[5], halign: 'right' }
    },
    didDrawPage: (data) => {
      // Pied de page : numero de page
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} / ${pageCount} — Devis Facile BTP — ${date}`,
        MARGE,
        doc.internal.pageSize.getHeight() - 8
      );
    }
  });

  // ── Cascade finale ─────────────────────────────────────────────────────────
  if (devis.cascade) {
    let y = doc.lastAutoTable.finalY + 6;
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(240, 245, 255);
    doc.rect(MARGE + LARGEUR / 2, y - 4, LARGEUR / 2, 6, 'F');
    doc.text('RECAPITULATIF', MARGE + LARGEUR / 2 + 2, y);
    y += 6;

    const libelles = {
      totalMateriaux: 'Total fournitures',
      imprevus:       'Imprévus',
      transport:      'Transport',
      mainOeuvre:     "Main d'oeuvre",
      totalTravaux:   'Total travaux',
      honorairesArchi:'Honoraires architecte',
      honorairesInge: 'Honoraires ingénieur',
      totalGrosOeuvre:'Total gros oeuvre',
      totalSecondOeuvre:'Total second oeuvre',
      totalHT:        'Total HT',
      tva:            'TVA',
      netAPayer:      'Net à payer',
      totalGeneral:   'TOTAL GÉNÉRAL'
    };
    const intermeds = ['totalTravaux','totalHT','totalGrosOeuvre','totalSecondOeuvre'];
    const finals    = ['netAPayer','totalGeneral'];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    for (const [cle, valeur] of Object.entries(devis.cascade)) {
      if (typeof valeur !== 'number' || valeur === 0) continue;
      const libelle = libelles[cle] || cle;
      const isFinal = finals.includes(cle);
      const isInter = intermeds.includes(cle);
      doc.setFont('helvetica', isFinal || isInter ? 'bold' : 'normal');
      doc.setFontSize(isFinal ? 9.5 : 8.5);
      doc.text(libelle, MARGE + LARGEUR / 2 + 2, y);
      doc.text(formaterNombre(valeur, true) + ' FCFA', MARGE + LARGEUR - 2, y, { align: 'right' });
      if (isFinal) {
        doc.setDrawColor(15, 21, 27);
        doc.line(MARGE + LARGEUR / 2, y + 1.5, MARGE + LARGEUR, y + 1.5);
      }
      y += isFinal ? 7 : 5;
    }

    // Montant en toutes lettres
    if (devis.enToutesLettres) {
      y += 3;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(devis.enToutesLettres, MARGE, y, { maxWidth: LARGEUR });
    }
  }

  const nomFichier = `Devis_${estEntreprise ? 'Entreprise' : 'Particulier'}_${(infoProjet.reference || 'DF').replace(/\s/g, '_')}.pdf`;
  doc.save(nomFichier);
}

// ─── Export Excel ────────────────────────────────────────────────────────────

/**
 * Exporte le devis en Excel, une feuille par section (lot/niveau).
 * Les formules P.T. = Quantite x P.U. sont generees en syntaxe Excel :
 * le confrere peut verifier et modifier independamment.
 */
export function exporterDevisExcel(devis, type = 'particulier', infoProjet = {}) {
  if (!devis) return;
  const sections = extraireSections(devis, type);
  if (sections.length === 0) return;

  const wb = XLSX.utils.book_new();

  // ── Feuille Synthese ──────────────────────────────────────────────────────
  const rowsSynth = [
    ['DEVIS FACILE BTP'],
    [type === 'entreprise' ? 'Modele Entreprise' : 'Modele Particulier'],
    [],
    ["Maitre d'ouvrage", infoProjet.maitreOuvrage || ''],
    ['Localisation',     infoProjet.localisation   || ''],
    ['Reference',        infoProjet.reference      || ''],
    ['Date',             new Date().toLocaleDateString('fr-FR')],
    [],
    ['Section', 'Sous-total (FCFA)'],
    ...sections.map(s => [s.titre, s.sousTotal]),
    [],
  ];
  if (devis.cascade) {
    const libelles = {
      totalMateriaux: 'Total fournitures', imprevus: 'Imprevus', transport: 'Transport',
      mainOeuvre: "Main d oeuvre", totalTravaux: 'Total travaux',
      honorairesArchi: 'Honoraires architecte', honorairesInge: 'Honoraires ingenieur',
      totalGrosOeuvre: 'Total gros oeuvre', totalSecondOeuvre: 'Total second oeuvre',
      totalHT: 'Total HT', tva: 'TVA', netAPayer: 'Net a payer', totalGeneral: 'TOTAL GENERAL'
    };
    for (const [cle, valeur] of Object.entries(devis.cascade)) {
      if (typeof valeur === 'number') rowsSynth.push([libelles[cle] || cle, valeur]);
    }
    if (devis.enToutesLettres) rowsSynth.push([], [devis.enToutesLettres]);
  }
  const wsSynth = XLSX.utils.aoa_to_sheet(rowsSynth);
  wsSynth['!cols'] = [{ wch: 40 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSynth, 'Synthese');

  // ── Une feuille par section ───────────────────────────────────────────────
  sections.forEach((section, si) => {
    const nomFeuille = `${si + 1}_${section.titre.substring(0, 25).replace(/[:\\/?*\[\]]/g, '_')}`;
    const rows = [
      [section.titre],
      [],
      ['N°', 'Designation', 'Unite', 'Quantite', 'P.U. (FCFA)', 'P.T. (FCFA)', 'Note'],
    ];

    section.lignes.forEach((ligne, li) => {
      // Ligne avec formule =D{row}*E{row} pour que le confrere puisse verifier
      const rowNum = rows.length + 1;
      rows.push([
        `${si + 1}.${li + 1}`,
        ligne.designation,
        ligne.unite || '',
        ligne.quantite !== null && ligne.quantite !== undefined ? ligne.quantite : '',
        ligne.pu || '',
        ligne.pu && ligne.quantite ? { f: `D${rowNum}*E${rowNum}` } : '',
        ligne.avertissements?.length ? ligne.avertissements.join(' | ') : ''
      ]);
    });

    // Sous-total
    const firstDataRow = 4;
    const lastDataRow  = rows.length;
    rows.push([
      '', 'Sous-total', '', '', '',
      { f: `SUM(F${firstDataRow}:F${lastDataRow})` },
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 45 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, nomFeuille);
  });

  const nomFichier = `Devis_${type === 'entreprise' ? 'Entreprise' : 'Particulier'}_${(infoProjet.reference || 'DF').replace(/\s/g, '_')}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
}

// ─── Export JSON (jeu de parametres + devis) ─────────────────────────────────

/**
 * Exporte le jeu de donnees complet : saisie, parametres, regles et les deux devis.
 * Un devis reste reproductible deux ans plus tard, meme si les prix ont change.
 */
export function exporterProjetJSON(projetData) {
  const snapshot = {
    _version: '2026.08',
    _exportDate: new Date().toISOString(),
    _description: 'Instantane reproductible du projet. Reimporter dans Devis Facile BTP pour retrouver les memes chiffres.',
    ...projetData
  };
  const dataStr = JSON.stringify(snapshot, null, 2);
  const blob    = new Blob([dataStr], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `Projet_${(projetData.infoProjet?.reference || 'DF').replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Hook (retrocompatibilite) ────────────────────────────────────────────────
export function useExport() {
  return {
    exportPDF:  exporterDevisPDF,
    exportExcel: exporterDevisExcel,
    exportJSON:  exporterProjetJSON,
  };
}
