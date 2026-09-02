export const generateUniverData = (projet) => {
  return {
    id: 'workbook-devis',
    sheetOrder: ['sheet-01'],
    appVersion: '3.0.0-alpha',
    sheets: {
      'sheet-01': {
        id: 'sheet-01',
        name: 'Devis',
        cellData: {
          "0": {
            "0": { v: "Désignation", s: "header" },
            "1": { v: "Unité", s: "header" },
            "2": { v: "Quantité", s: "header" },
            "3": { v: "Prix Unitaire", s: "header" },
            "4": { v: "Prix Total", s: "header" }
          },
          "1": {
            "0": { v: "Fondation - Béton", s: "text-normal" },
            "1": { v: "m3", s: "text-normal" },
            "2": { v: "15", s: "calc" },
            "3": { v: "95000", s: "inherited" },
            "4": { v: "1425000", s: "calc" }
          }
        },
        columnData: {
          "0": { w: 200 },
          "1": { w: 80 },
          "2": { w: 100 },
          "3": { w: 120 },
          "4": { w: 150 }
        }
      }
    },
    styles: {
      "header": {
        bl: 1, // bold
        bg: { rgb: "#f3f4f6" },
        ht: 1, // horizontal alignment center
        vt: 2  // vertical alignment middle
      },
      "text-normal": {
        cl: { rgb: "#0F151B" }
      },
      "calc": {
        cl: { rgb: "#0F151B" },
        ff: "JetBrains Mono"
      },
      "inherited": {
        cl: { rgb: "#14634A" },
        ff: "JetBrains Mono"
      },
      "input": {
        cl: { rgb: "#14479B" },
        ff: "JetBrains Mono"
      },
      "verify": {
        cl: { rgb: "#8A5D00" },
        ff: "JetBrains Mono"
      }
    }
  };
};
