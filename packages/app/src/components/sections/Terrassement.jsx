import React, { useMemo } from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import { genererResumeFondation } from '@devis-facile/moteur';
import CarteBloc from '../ui/CarteBloc.jsx';
import { AccordionProvider } from '../ui/Accordion.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

const BLOCS_TERRASSEMENT = [
  'Fouilles en puits', 'Fouilles en rigole', 'Terrassement à grande surface', "Nivellement de l'emprise",
];

export default function Terrassement() {
  const state = useProjet();
  const {
    fouilles, setFouilles, fouilleFilante, setFouilleFilante, nivellement, setNivellement,
    terrassementGrandeSurface, setTerrassementGrandeSurface,
    addRow, removeRow, updateRow, niveauActifId, reglesPersonnalisees,
  } = state;
  const { metreParNiveau } = useMetre();

  const idx = metreParNiveau.findIndex(m => m.niveauId === niveauActifId);
  const currentLevelData = idx >= 0 ? metreParNiveau[idx] : null;
  const currentMetre = currentLevelData ? currentLevelData.metre : { blocs: {}, avertissements: [] };

  const resumeFondation = useMemo(() => {
    if (!currentLevelData || !currentLevelData.saisie) return {};
    return genererResumeFondation(currentLevelData.saisie, reglesPersonnalisees);
  }, [currentLevelData, reglesPersonnalisees]);

  const getBloc = (id) => currentMetre.blocs?.[id] || { total: 0, unite: '', lignes: [] };
  const getAvertissementLocal = (blocCode, ligneIndex) => {
    return currentMetre.avertissements?.find(a => a.bloc === blocCode && a.ligne === ligneIndex);
  };

  const currentFouilles = fouilles.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Terrassement</h2>
      <p className="text-sm text-gray-600 mb-6 italic">Le terrassement concerne les fouilles et les mouvements de terre.</p>

      <AccordionProvider key={niveauActifId} ids={BLOCS_TERRASSEMENT}>
      <CarteBloc
        titre="Fouilles en puits"
        onAdd={() => addRow(fouilles, setFouilles, { niveauId: niveauActifId, longueur: '', largeur: '', profondeur: '', nombre: '1' }, 'FP')}
        addLabel="Ajouter une fouille en puits"
        totalValeur={getBloc('fouilles').total}
        totalUnite={getBloc('fouilles').unite}
        totalLabel="Quantité de déblais"
      >
        {currentFouilles.map((f, index) => (
          <LigneOuvrage
            key={f.id} repere={f.repere} titre="Fouille en puits"
            onRemove={currentFouilles.length > 1 ? () => removeRow(fouilles, setFouilles, f.id) : null}
            avertissement={getAvertissementLocal('fouilles', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Un puits se mesure par ses deux côtés, pas par une longueur
                  et une largeur — celles-ci ne veulent dire quelque chose que
                  pour une fouille en rigole, qui a son propre bloc plus bas.
                  Les clés de données restent `longueur`/`largeur` : les renommer
                  invaliderait les projets déjà enregistrés. */}
              <InputSaisie label="Côté a" value={f.longueur} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Côté b" value={f.largeur} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Profondeur" value={f.profondeur} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'profondeur', v)} unite="m" />
              <InputSaisie label="Nombre" value={f.nombre} onChange={(v) => updateRow(fouilles, setFouilles, f.id, 'nombre', v)} unite="u" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume (m³)"
                value={getBloc('fouilles').lignes[index]?.valeur}
                unite="m³"
                trace={getBloc('fouilles').lignes[index]?.trace}
                libellesEntrees={{ longueur: 'côté a', largeur: 'côté b' }}
                overrideValue={f.override_volume}
                onOverrideChange={(v) => updateRow(fouilles, setFouilles, f.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Fouilles en rigole"
        onAdd={() => addRow(fouilleFilante, setFouilleFilante, { niveauId: niveauActifId, longueur: '', largeur: '', profondeur: '', nombre: '1' }, 'FR')}
        addLabel="Ajouter une fouille en rigole"
        totalValeur={getBloc('fouilleFilante').total}
        totalUnite={getBloc('fouilleFilante').unite}
        totalLabel="Quantité de déblais"
      >
        {fouilleFilante.filter(x => x.niveauId === niveauActifId).map((f, index) => (
          <LigneOuvrage
            key={f.id} repere={f.repere} titre="Fouille en rigole"
            onRemove={fouilleFilante.filter(x => x.niveauId === niveauActifId).length > 1 ? () => removeRow(fouilleFilante, setFouilleFilante, f.id) : null}
            avertissement={getAvertissementLocal('fouilleFilante', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Périmètre" value={f.longueur} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={f.largeur} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Profondeur" value={f.profondeur} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'profondeur', v)} unite="m" />
              <InputSaisie label="Nombre" value={f.nombre} onChange={(v) => updateRow(fouilleFilante, setFouilleFilante, f.id, 'nombre', v)} unite="u" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume (m³)"
                value={getBloc('fouilleFilante').lignes[index]?.valeur}
                unite="m³"
                trace={getBloc('fouilleFilante').lignes[index]?.trace}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      {/* Le déblai en masse, exécuté à l'engin. Même mesure qu'une fouille en
          rigole — longueur × largeur × profondeur — mais sur une emprise bien
          plus vaste, et son volume entre dans les déblais. Bloc distinct des
          fouilles parce que l'engin ne se facture pas comme la pioche. */}
      <CarteBloc
        titre="Terrassement à grande surface"
        onAdd={() => addRow(terrassementGrandeSurface, setTerrassementGrandeSurface, { niveauId: niveauActifId, longueur: '', largeur: '', profondeur: '' }, 'TGS')}
        addLabel="Ajouter un terrassement à grande surface"
        totalValeur={getBloc('terrassementGrandeSurface').total}
        totalUnite={getBloc('terrassementGrandeSurface').unite}
        totalLabel="Quantité de déblais"
      >
        {terrassementGrandeSurface.filter(x => x.niveauId === niveauActifId).map((t, index) => (
          <LigneOuvrage
            key={t.id} repere={t.repere} titre="Terrassement à l'engin"
            onRemove={terrassementGrandeSurface.filter(x => x.niveauId === niveauActifId).length > 1
              ? () => removeRow(terrassementGrandeSurface, setTerrassementGrandeSurface, t.id) : null}
            avertissement={getAvertissementLocal('terrassementGrandeSurface', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InputSaisie label="Longueur" value={t.longueur} onChange={(v) => updateRow(terrassementGrandeSurface, setTerrassementGrandeSurface, t.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={t.largeur} onChange={(v) => updateRow(terrassementGrandeSurface, setTerrassementGrandeSurface, t.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Profondeur" value={t.profondeur} onChange={(v) => updateRow(terrassementGrandeSurface, setTerrassementGrandeSurface, t.id, 'profondeur', v)} unite="m" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume de déblais (m³)"
                value={getBloc('terrassementGrandeSurface').lignes[index]?.valeur}
                unite="m³"
                trace={getBloc('terrassementGrandeSurface').lignes[index]?.trace}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Nivellement de l'emprise"
        onAdd={() => addRow(nivellement, setNivellement, { niveauId: niveauActifId, longueur: '', largeur: '', epaisseur: '', nombre: '1' }, 'NIV')}
        addLabel="Ajouter un nivellement"
        totalValeur={getBloc('nivellement').total}
        totalUnite={getBloc('nivellement').unite}
        totalLabel="Volume total nivellement"
      >
        {nivellement.filter(x => x.niveauId === niveauActifId).map((n, index) => (
          <LigneOuvrage
            key={n.id} repere={n.repere} titre="Nivellement"
            onRemove={nivellement.filter(x => x.niveauId === niveauActifId).length > 1 ? () => removeRow(nivellement, setNivellement, n.id) : null}
            avertissement={getAvertissementLocal('nivellement', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputSaisie label="Longueur" value={n.longueur} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={n.largeur} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Épaisseur" value={n.epaisseur} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'epaisseur', v)} unite="m" />
              <InputSaisie label="Nombre" value={n.nombre} onChange={(v) => updateRow(nivellement, setNivellement, n.id, 'nombre', v)} unite="u" />
            </div>

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume (m³)"
                value={getBloc('nivellement').lignes[index]?.valeur}
                unite="m³"
                trace={getBloc('nivellement').lignes[index]?.trace}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
      </AccordionProvider>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-devis-calcule mb-2">Volume de Remblai Automatique</h3>
        {resumeFondation.volumes?.remblais > 0 || resumeFondation.avertissements?.some(a => a.type === 'remblai-negatif') ? (
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-devis-saisie">
              {resumeFondation.volumes.remblais > 0 ? resumeFondation.volumes.remblais.toFixed(2) : "0.00"}
            </span>
            <span className="text-gray-600 font-bold mb-1">m³</span>
          </div>
        ) : (
          <p className="text-sm text-amber-700 italic">Volume indisponible (complétez les fouilles, semelles, amorces et murs de soubassement).</p>
        )}
        
        {resumeFondation.avertissements?.filter(a => a.type === 'remblai-manquant' || a.type === 'remblai-negatif').map((a, i) => (
          <div key={i} className="mt-3 p-3 bg-amber-100 text-amber-800 text-sm rounded border border-amber-300">
            <strong>Attention :</strong> {a.message}
          </div>
        ))}
      </div>
    </section>
  );
}
