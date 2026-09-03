import React, { useRef } from 'react';
import { useExport } from '../../hooks/useExport.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ApercuDevis({ univerData }) {
  const { exportJSON } = useExport(); 
  
  const handleExportPDF = (sheetId) => {
    if (!univerData || !univerData.sheets[sheetId]) return;
    const sheet = univerData.sheets[sheetId];
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(sheet.name, 14, 22);

    const tableRows = [];
    const cellData = sheet.cellData || {};
    
    let maxRow = 0;
    let maxCol = 4; 
    Object.keys(cellData).forEach(r => {
      const rNum = parseInt(r);
      if (rNum > maxRow) maxRow = rNum;
      Object.keys(cellData[r]).forEach(c => {
        const cNum = parseInt(c);
        if (cNum > maxCol) maxCol = cNum;
      });
    });

    for (let i = 0; i <= maxRow; i++) {
      const row = [];
      const rowData = cellData[i] || {};
      for (let j = 0; j <= maxCol; j++) {
        const cell = rowData[j];
        let val = cell ? (cell.v !== undefined ? cell.v : (cell.f ? 'CALCUL' : '')) : '';
        row.push(val.toString());
      }
      tableRows.push(row);
    }

    doc.autoTable({
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 }
    });

    doc.save(`${sheet.name}.pdf`);
  };

  const handleExportExcel = () => {
    if (!univerData) return;
    
    const wb = XLSX.utils.book_new();
    
    Object.keys(univerData.sheets).forEach(sheetId => {
      const sheet = univerData.sheets[sheetId];
      const cellData = sheet.cellData || {};
      
      let maxRow = 0;
      let maxCol = 0;
      Object.keys(cellData).forEach(r => {
        const rNum = parseInt(r);
        if (rNum > maxRow) maxRow = rNum;
        Object.keys(cellData[r]).forEach(c => {
          const cNum = parseInt(c);
          if (cNum > maxCol) maxCol = cNum;
        });
      });

      const rows = [];
      for (let i = 0; i <= maxRow; i++) {
        const row = [];
        const rowData = cellData[i] || {};
        for (let j = 0; j <= maxCol; j++) {
          const cell = rowData[j];
          let val = cell ? (cell.v !== undefined ? cell.v : (cell.f ? 'CALCUL' : '')) : '';
          row.push(val);
        }
        rows.push(row);
      }
      
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });

    XLSX.writeFile(wb, `Devis_Facile_Export.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-devis-border p-6">
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => handleExportPDF('particulier')}
          className="bg-devis-saisie text-white px-4 py-2 rounded font-bold"
        >
          Export PDF (Particulier)
        </button>
        <button 
          onClick={() => handleExportPDF('entreprise')}
          className="bg-devis-saisie text-white px-4 py-2 rounded font-bold"
        >
          Export PDF (Entreprise)
        </button>
        <button 
          onClick={handleExportExcel}
          className="bg-green-600 text-white px-4 py-2 rounded font-bold"
        >
          Export Excel Complet
        </button>
      </div>

      <div className="text-center py-10 bg-gray-50 rounded border border-dashed border-gray-300">
        <p className="text-gray-500 mb-2">L'aperçu HTML arrivera dans une prochaine version.</p>
        <p className="text-gray-500">Utilisez les boutons ci-dessus pour générer les documents à partir de l'état actuel du tableur.</p>
      </div>
    </div>
  );
}
