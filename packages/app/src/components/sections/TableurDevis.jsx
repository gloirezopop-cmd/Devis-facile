import React, { useEffect, useRef } from 'react';
import { Univer, LocaleType, LogLevel } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverSheetsNumfmtPlugin } from '@univerjs/sheets-numfmt';

import { UniverDrawingPlugin } from '@univerjs/drawing';
import { UniverDrawingUIPlugin } from '@univerjs/drawing-ui';
import { UniverSheetsDrawingPlugin } from '@univerjs/sheets-drawing';
import { UniverSheetsDrawingUIPlugin } from '@univerjs/sheets-drawing-ui';

import frFRDesign from '@univerjs/design/lib/es/locale/fr-FR.js';
import frFRUI from '@univerjs/ui/lib/es/locale/fr-FR.js';
import frFRDocsUI from '@univerjs/docs-ui/lib/es/locale/fr-FR.js';

const frFR = {
  ...frFRDesign.default,
  ...frFRUI.default,
  ...frFRDocsUI.default,
};

import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';
import '@univerjs/sheets-formula-ui/lib/index.css';

export default function TableurDevis({ initialData, onSave }) {
  const univerRef = useRef(null);
  const containerRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;

    const univer = new Univer({
      theme: defaultTheme,
      locale: LocaleType.FR_FR,
      locales: {
        [LocaleType.FR_FR]: frFR,
      },
      logLevel: LogLevel.VERBOSE,
    });

    univerRef.current = univer;

    // Register core UI plugins first
    univer.registerPlugin(UniverRenderEnginePlugin);
    univer.registerPlugin(UniverUIPlugin, {
      container: containerRef.current,
      header: true,
      toolbar: true,
      footer: true,
    });
    
    // Docs plugins
    univer.registerPlugin(UniverDocsPlugin, { hasScroll: false });
    univer.registerPlugin(UniverDocsUIPlugin);
    
    // Sheets plugins
    univer.registerPlugin(UniverSheetsPlugin);
    univer.registerPlugin(UniverSheetsUIPlugin);
    univer.registerPlugin(UniverSheetsFormulaPlugin);
    univer.registerPlugin(UniverSheetsFormulaUIPlugin, {}); // Config vide pour éviter le crash
    univer.registerPlugin(UniverSheetsNumfmtPlugin);
    
    // Drawing plugins (Images)
    univer.registerPlugin(UniverDrawingPlugin);
    univer.registerPlugin(UniverDrawingUIPlugin);
    univer.registerPlugin(UniverSheetsDrawingPlugin);
    univer.registerPlugin(UniverSheetsDrawingUIPlugin);

    // Create workbook
    try {
      if (initialData) {
        univer.createUniverSheet(initialData);
      } else {
        univer.createUniverSheet({});
      }
    } catch (e) {
      console.error('Error creating univer sheet:', e);
    }

    return () => {
      if (univerRef.current) {
        univerRef.current.dispose();
        univerRef.current = null;
      }
      isInitialized.current = false;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: 'calc(100vh - 100px)' }} 
      className="univer-container"
    ></div>
  );
}
