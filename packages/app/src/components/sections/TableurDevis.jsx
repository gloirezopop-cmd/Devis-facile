import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
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
import { FUniver } from '@univerjs/facade';

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

/** En dessous, le tableur ne sert plus à rien : on ne descend jamais plus bas. */
const HAUTEUR_MINIMALE = 240;
/** Ce qu'on laisse respirer sous le tableur, pour ne pas le coller au bord. */
const MARGE_BASSE = 12;

const TableurDevis = forwardRef(({ initialData, readOnly = false }, ref) => {
  const univerRef = useRef(null);
  const containerRef = useRef(null);
  const isInitialized = useRef(false);
  // Hauteur réellement disponible, mesurée. `100vh` ment sur téléphone : il
  // ignore la barre d'adresse ET le clavier, si bien que la moitié basse du
  // tableur — y compris la cellule en cours de saisie — se retrouve derrière
  // le clavier, hors d'atteinte.
  const [hauteurDisponible, setHauteurDisponible] = useState(null);

  useEffect(() => {
    if (readOnly) return undefined;

    const vue = window.visualViewport;

    const mesurer = () => {
      const boite = containerRef.current?.getBoundingClientRect();
      if (!boite) return;
      // `visualViewport` est la seule mesure qui rétrécit à l'ouverture du
      // clavier. `offsetTop` corrige le décalage quand le navigateur a fait
      // défiler la page pour dégager le champ actif.
      const hauteurVue = vue ? vue.height : window.innerHeight;
      const decalage = vue ? vue.offsetTop : 0;
      const hautDuTableur = boite.top - decalage;
      const voulue = Math.max(HAUTEUR_MINIMALE, Math.round(hauteurVue - hautDuTableur - MARGE_BASSE));
      // Redessiner le tableur coûte cher : on ne réagit qu'à un vrai
      // changement, pas au tremblement d'un pixel pendant le défilement.
      setHauteurDisponible((precedente) => (Math.abs((precedente ?? 0) - voulue) >= 4 ? voulue : precedente));
    };

    mesurer();

    vue?.addEventListener('resize', mesurer);
    vue?.addEventListener('scroll', mesurer);
    window.addEventListener('resize', mesurer);
    window.addEventListener('orientationchange', mesurer);
    window.addEventListener('scroll', mesurer, { passive: true });

    return () => {
      vue?.removeEventListener('resize', mesurer);
      vue?.removeEventListener('scroll', mesurer);
      window.removeEventListener('resize', mesurer);
      window.removeEventListener('orientationchange', mesurer);
      window.removeEventListener('scroll', mesurer);
    };
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (univerRef.current) {
        try {
          const univerAPI = FUniver.newAPI(univerRef.current);
          const workbook = univerAPI.getActiveWorkbook();
          if (workbook) {
             return workbook.save();
          }
        } catch (e) {
          console.error("Error saving univer snapshot:", e);
        }
      }
      return null;
    }
  }));

  const [errorMsg, setErrorMsg] = React.useState(null);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;

    try {
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
      if (initialData) {
        univer.createUniverSheet(JSON.parse(JSON.stringify(initialData)));
      } else {
        univer.createUniverSheet({});
      }
    } catch (e) {
      console.error('Error creating univer sheet:', e);
      setErrorMsg(e.message || e.toString());
    }

    return () => {
      if (univerRef.current) {
        try {
          univerRef.current.dispose();
        } catch(e) {}
        univerRef.current = null;
      }
      isInitialized.current = false;
    };
  }, [initialData, readOnly]);

  if (errorMsg) {
    return <div className="p-4 text-red-500 font-bold border border-red-500 rounded bg-red-50">Erreur Univer: {errorMsg}</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: readOnly
          ? '100%'
          : (hauteurDisponible ? `${hauteurDisponible}px` : 'calc(100vh - 100px)'),
        minHeight: readOnly ? '600px' : 'auto',
      }}
      className={`univer-container ${readOnly ? 'univer-readonly' : ''}`}
    >
      {readOnly && (
        <style dangerouslySetInnerHTML={{__html: `
          .univer-readonly .univer-toolbar { display: none !important; }
          .univer-readonly .univer-sheet-bar { display: none !important; }
          .univer-readonly .univer-formula-bar { display: none !important; }
          .univer-readonly .univer-header { display: none !important; }
          .univer-readonly .univer-workbench { top: 0 !important; }
          /* Bloquer l'interaction si on veut juste un affichage */
          .univer-readonly .univer-render-canvas { pointer-events: none !important; }
        `}} />
      )}
    </div>
  );
});

export default TableurDevis;
