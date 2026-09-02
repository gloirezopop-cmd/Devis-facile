import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formaterNombre } from '../utils/format.js';

const titresLots = {
  installation: "1. Installation de chantier",
  terrassement: "2. Terrassements",
  fondation: "3. Fondations",
  elevation: "4. Élévations",
  plancher: "5. Planchers",
  toiture: "6. Toiture et Charpente",
  finition: "7. Finitions"
};

export function useExport() {
  
  const exportPDF = (devis, type = 'entreprise') => {
    if (!devis || !devis.blocs) return;
    
    const doc = new jsPDF();
    const isEntreprise = type === 'entreprise';
    
    // Titre
    doc.setFontSize(18);
    doc.text(`Devis - Modèle ${isEntreprise ? 'Entreprise' : 'Particulier'}`, 14, 22);
    
    // Total
    doc.setFontSize(12);
    doc.text(`Total : ${formaterNombre(devis.total, true)} FCFA`, 14, 32);

    // Préparation des données pour autoTable
    const tableColumn = isEntreprise 
      ? ["N°", "Ouvrage", "Unité", "Quantité", "PU (FCFA)", "Total (FCFA)"]
      : ["N°", "Matériau", "Unité", "Quantité", "PU (FCFA)", "Total (FCFA)"];
      
    const tableRows = [];

    Object.keys(devis.blocs).forEach((lotId, index) => {
      const lotData = devis.blocs[lotId];
      if (!lotData.lignes || lotData.lignes.length === 0) return;

      // Header du lot
      tableRows.push([
        { content: (index + 1).toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 245, 255] } },
        { content: titresLots[lotId] || lotId, colSpan: 5, styles: { fontStyle: 'bold', textColor: [20, 71, 155], fillColor: [240, 245, 255] } }
      ]);

      lotData.lignes.forEach((ligne, i) => {
        tableRows.push([
          `${index + 1}.${i + 1}`,
          ligne.designation,
          ligne.unite,
          formaterNombre(ligne.quantite),
          formaterNombre(ligne.pu, true),
          formaterNombre(ligne.pt, true)
        ]);
      });

      // Sous-total du lot
      tableRows.push([
        { content: `Sous-total ${titresLots[lotId] || lotId}`, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right', fillColor: [243, 244, 246] } },
        { content: formaterNombre(lotData.sousTotal, true), styles: { fontStyle: 'bold', halign: 'right', fillColor: [243, 244, 246] } }
      ]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [20, 71, 155] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      }
    });

    doc.save(`Devis_${isEntreprise ? 'Entreprise' : 'Particulier'}.pdf`);
  };

  const exportExcel = (devis, type = 'entreprise') => {
    if (!devis || !devis.blocs) return;
    const isEntreprise = type === 'entreprise';
    const wb = XLSX.utils.book_new();
    const rows = [];

    rows.push([`Devis - Modèle ${isEntreprise ? 'Entreprise' : 'Particulier'}`]);
    rows.push([`Total Général`, '', '', '', '', formaterNombre(devis.total, true)]);
    rows.push([]);
    
    rows.push(isEntreprise 
      ? ["N°", "Ouvrage", "Unité", "Quantité", "PU (FCFA)", "Total (FCFA)"]
      : ["N°", "Matériau", "Unité", "Quantité", "PU (FCFA)", "Total (FCFA)"]
    );

    Object.keys(devis.blocs).forEach((lotId, index) => {
      const lotData = devis.blocs[lotId];
      if (!lotData.lignes || lotData.lignes.length === 0) return;

      rows.push([index + 1, titresLots[lotId] || lotId]);

      lotData.lignes.forEach((ligne, i) => {
        rows.push([
          `${index + 1}.${i + 1}`,
          ligne.designation,
          ligne.unite,
          ligne.quantite,
          ligne.pu,
          ligne.pt
        ]);
      });

      rows.push(['', `Sous-total ${titresLots[lotId] || lotId}`, '', '', '', lotData.sousTotal]);
      rows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Devis");
    XLSX.writeFile(wb, `Devis_${isEntreprise ? 'Entreprise' : 'Particulier'}.xlsx`);
  };

  const exportJSON = (projetData) => {
    const dataStr = JSON.stringify(projetData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'projet_export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return {
    exportPDF,
    exportExcel,
    exportJSON
  };
}
