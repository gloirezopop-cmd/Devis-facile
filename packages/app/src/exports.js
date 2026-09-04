import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const titresLots = {
  fondation: 'Fondation & Soubassement',
  plancherEtRdc: 'Élévation & Plancher',
  finition: 'Finitions & Revêtements',
  autres: 'Autres Ouvrages'
};

export function exportPDF(devisData, type) {
  if (!devisData || !devisData.lots) return;

  const doc = new jsPDF();
  
  doc.setFont('times', 'normal');
  doc.setFontSize(18);
  doc.text(`Devis ${type === 'particulier' ? 'Détaillé (Particulier)' : 'Global (Entreprise)'}`, 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Montant Total: ${devisData.totalGeneral.toLocaleString('fr-FR')} FCFA`, 14, 30);

  let startY = 40;

  Object.entries(devisData.lots).forEach(([lotId, lotData]) => {
    if (lotData.lignes.length === 0) return;

    const titre = titresLots[lotId] || lotId;

    const head = [['Désignation', 'Uté', 'Qté', 'P.U.', 'P.T.']];
    const body = [];

    lotData.lignes.forEach((ligne) => {
      body.push([
        ligne.designation,
        ligne.unite,
        ligne.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
        ligne.pu.toLocaleString('fr-FR'),
        ligne.pt.toLocaleString('fr-FR')
      ]);
    });

    body.push([
      { content: `Sous-total ${titre.toUpperCase()}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: lotData.sousTotal.toLocaleString('fr-FR'), styles: { fontStyle: 'bold' } }
    ]);

    doc.autoTable({
      startY: startY,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [20, 71, 155], font: 'times', fontSize: 10 },
      bodyStyles: { font: 'times', fontSize: 10 },
      margin: { top: 10, left: 14, right: 14 },
      didDrawPage: (data) => {
        // Ajouter un titre de lot avant le tableau
        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text(titre.toUpperCase(), data.settings.margin.left, data.settings.startY - 3);
      }
    });

    startY = doc.lastAutoTable.finalY + 15;
  });

  doc.save(`Devis_${type}.pdf`);
}

export function exportExcel(devisData, type) {
  if (!devisData || !devisData.lots) return;

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push([`Devis ${type === 'particulier' ? 'Détaillé' : 'Global'}`]);
  wsData.push(['Total Général:', devisData.totalGeneral]);
  wsData.push([]); // Ligne vide

  Object.entries(devisData.lots).forEach(([lotId, lotData]) => {
    if (lotData.lignes.length === 0) return;

    const titre = titresLots[lotId] || lotId;
    wsData.push([titre.toUpperCase()]);
    wsData.push(['Désignation', 'Uté', 'Qté', 'P.U.', 'P.T.']);

    lotData.lignes.forEach((ligne) => {
      wsData.push([
        ligne.designation,
        ligne.unite,
        ligne.quantite,
        ligne.pu,
        ligne.pt
      ]);
    });

    wsData.push(['', '', '', `Sous-total ${titre}`, lotData.sousTotal]);
    wsData.push([]); // Ligne vide
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Devis');
  XLSX.writeFile(wb, `Devis_${type}.xlsx`);
}

export function exportNoteDeCalculPDF(noteDeCalcul, infoProjet = {}) {
  if (!noteDeCalcul || !noteDeCalcul.lots) return;

  const doc = new jsPDF();
  const title = `NOTE DE CALCUL — SOURCE DE VÉRITÉ`;
  const reference = infoProjet.reference || 'DF-2026';
  const client = infoProjet.maitreOuvrage || '—';

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`Projet / Réf : ${reference} | Client : ${client} | Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 27);

  let startY = 35;

  noteDeCalcul.lots.forEach((lot) => {
    if (!lot.ouvrages || lot.ouvrages.length === 0) return;

    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(lot.nom.toUpperCase(), 14, startY);
    startY += 6;

    lot.ouvrages.forEach((ov) => {
      const head = [['Repère', 'Données', 'Formule', 'Calcul', `Résultat (${ov.unite})`]];
      const body = ov.lignes.map((l) => [
        l.repere,
        Object.entries(l.donnees).map(([k, v]) => `${k}=${v}`).join(', '),
        l.formule,
        l.application,
        String(l.valeur_arrondie),
      ]);

      doc.autoTable({
        startY: startY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [20, 71, 155], font: 'times', fontSize: 9 },
        bodyStyles: { font: 'times', fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      startY = doc.lastAutoTable.finalY + 8;
    });

    startY += 5;
  });

  doc.save(`Note_De_Calcul_${reference}.pdf`);
}

