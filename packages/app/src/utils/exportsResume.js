import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const formatNum = (val, maxDec = 3) => {
  if (val === undefined || val === null) return '-';
  const v = Number(val);
  if (isNaN(v)) return val;
  // Affiche un entier si c'est entier, ou garde jusqu'à maxDec décimales
  return v % 1 === 0 ? String(v) : v.toFixed(maxDec).replace(/\.?0+$/, '');
};

/**
 * Exporte le Résumé du Métré en PDF.
 */
export function exporterResumePDF(summaryData, parametresProjet = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  let y = 15;

  // --- ENTÊTE DU PROJET ---
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titreDocument = 'RÉSUMÉ DU MÉTRÉ';
  const tWidth = doc.getTextWidth(titreDocument);
  doc.text(titreDocument, (pageWidth - tWidth) / 2, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Projet : ${parametresProjet.reference || 'Nouveau Projet'}`, 14, y);
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 40, y);
  y += 6;
  if (parametresProjet.maitreOuvrage) {
    doc.text(`Maître d'Ouvrage : ${parametresProjet.maitreOuvrage}`, 14, y);
    y += 6;
  }
  if (parametresProjet.localisation) {
    doc.text(`Localisation : ${parametresProjet.localisation}`, 14, y);
    y += 6;
  }
  y += 10;

  // --- PARCOURS DES NIVEAUX ---
  let sectionIndex = 1;

  summaryData.levels.forEach(level => {
    // Titre de niveau
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionIndex}. ${level.name.toUpperCase()}`, 14, y);
    y += 6;

    // Tableau des Postes (Catégories) du niveau
    const headPostes = [['Poste', 'Quantité', 'Détail Matériaux']];
    const bodyPostes = level.categories.map(cat => {
      const qte = `${formatNum(cat.quantite)} ${cat.unite}`;
      const matText = cat.materials.map(m => `- ${m.nom} : ${formatNum(m.valeur_arrondie)} ${m.unite}`).join('\n');
      return [cat.name, qte, matText];
    });

    if (bodyPostes.length > 0) {
      doc.autoTable({
        startY: y,
        head: headPostes,
        body: bodyPostes,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
        headStyles: { fillColor: [243, 244, 246], textColor: 20, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Tableau des Totaux du niveau
    const totaux = Object.values(level.totals.materials).filter(m => m.quantite > 0);
    if (totaux.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Totaux - ${level.name} :`, 14, y);
      y += 4;
      
      const headTotaux = [totaux.map(t => t.nom)];
      const bodyTotaux = [totaux.map(t => `${formatNum(t.quantite)} ${t.unite}`)];
      
      doc.autoTable({
        startY: y,
        head: headTotaux,
        body: bodyTotaux,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
        headStyles: { fillColor: [20, 71, 155], textColor: 255, fontStyle: 'bold' }, // Bleu Devis Facile
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 15;
    }
    
    sectionIndex++;
  });

  // --- GRAND TOTAL DU PROJET ---
  doc.addPage();
  y = 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉCAPITULATIF GLOBAL DES MATÉRIAUX', 14, y);
  y += 10;

  const grandTotaux = Object.values(summaryData.totals.materials).filter(m => m.quantite > 0);
  if (grandTotaux.length > 0) {
    const headGlobal = [['Matériau', 'Quantité Globale', 'Unité']];
    const bodyGlobal = grandTotaux.map(t => [t.nom, formatNum(t.quantite), t.unite]);

    doc.autoTable({
      startY: y,
      head: headGlobal,
      body: bodyGlobal,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
      headStyles: { fillColor: [20, 99, 74], textColor: 255, fontStyle: 'bold' }, // Vert Devis Facile
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'center' }
      },
      margin: { left: 14, right: 14 },
    });
  }

  // --- PAGINATION (Pied de page) ---
  const pages = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  for (let j = 1; j <= pages; j++) {
    doc.setPage(j);
    doc.text(`Page ${j} sur ${pages} - Généré par Devis Facile BTP`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`Resume_Metre_${parametresProjet.reference || 'Projet'}.pdf`);
}

/**
 * Exporte le Résumé du Métré en Word (.doc) en utilisant une conversion HTML vers Blob.
 * C'est la méthode la plus légère sans librairie externe lourde.
 */
export function exporterResumeWord(summaryData, parametresProjet = {}) {
  const titre = parametresProjet.reference || 'Nouveau_Projet';
  
  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Résumé du Métré</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11pt; }
      h1 { text-align: center; font-size: 18pt; color: #14479B; }
      h2 { font-size: 14pt; color: #0F151B; margin-top: 24pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      h3 { font-size: 12pt; font-style: italic; color: #333; margin-top: 12pt; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 16pt; }
      th, td { border: 1pt solid #000; padding: 6pt; text-align: left; vertical-align: middle; }
      th { background-color: #f3f4f6; font-weight: bold; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .header-info { margin-bottom: 24pt; }
    </style>
    </head>
    <body>
  `;

  // Entête
  html += `<h1>RÉSUMÉ DU MÉTRÉ</h1>`;
  html += `<div class="header-info">`;
  html += `<p><strong>Projet :</strong> ${parametresProjet.reference || '-'}<br>`;
  if (parametresProjet.maitreOuvrage) html += `<strong>Maître d'Ouvrage :</strong> ${parametresProjet.maitreOuvrage}<br>`;
  if (parametresProjet.localisation) html += `<strong>Localisation :</strong> ${parametresProjet.localisation}<br>`;
  html += `<strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>`;
  html += `</div>`;

  // Niveaux
  let sectionIndex = 1;
  summaryData.levels.forEach(level => {
    html += `<h2>${sectionIndex}. ${level.name.toUpperCase()}</h2>`;
    
    // Table des postes
    if (level.categories.length > 0) {
      html += `<table>
        <thead>
          <tr>
            <th width="30%">Poste</th>
            <th width="20%">Quantité</th>
            <th width="50%">Détail Matériaux</th>
          </tr>
        </thead>
        <tbody>`;
      
      level.categories.forEach(cat => {
        const matHtml = cat.materials.map(m => `&bull; ${m.nom} : ${formatNum(m.valeur_arrondie)} ${m.unite}`).join('<br>');
        html += `<tr>
          <td><strong>${cat.name}</strong></td>
          <td class="text-center">${formatNum(cat.quantite)} ${cat.unite}</td>
          <td>${matHtml || '-'}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }

    // Totaux du niveau
    const totaux = Object.values(level.totals.materials).filter(m => m.quantite > 0);
    if (totaux.length > 0) {
      html += `<h3>Totaux - ${level.name} :</h3>`;
      html += `<table>
        <thead>
          <tr>`;
      totaux.forEach(t => { html += `<th class="text-center">${t.nom}</th>`; });
      html += `</tr>
        </thead>
        <tbody>
          <tr>`;
      totaux.forEach(t => { html += `<td class="text-center">${formatNum(t.quantite)} ${t.unite}</td>`; });
      html += `</tr>
        </tbody>
      </table>`;
    }

    sectionIndex++;
  });

  // Grand Total
  html += `<br style="page-break-before: always; clear: both;" />`; // Saut de page
  html += `<h2>RÉCAPITULATIF GLOBAL DES MATÉRIAUX</h2>`;
  const grandTotaux = Object.values(summaryData.totals.materials).filter(m => m.quantite > 0);
  if (grandTotaux.length > 0) {
    html += `<table>
      <thead>
        <tr>
          <th>Matériau</th>
          <th class="text-right">Quantité Globale</th>
          <th class="text-center">Unité</th>
        </tr>
      </thead>
      <tbody>`;
    grandTotaux.forEach(t => {
      html += `<tr>
        <td><strong>${t.nom}</strong></td>
        <td class="text-right">${formatNum(t.quantite)}</td>
        <td class="text-center">${t.unite}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  html += `</body></html>`;

  // Création du fichier et téléchargement
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resume_Metre_${parametresProjet.reference || 'Projet'}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
