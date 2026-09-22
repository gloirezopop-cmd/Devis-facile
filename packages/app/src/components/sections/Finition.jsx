import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import { AccordionProvider } from '../ui/Accordion.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

const BLOCS_FINITION = ['Enduit Ciment', 'Peinture', 'Faïence Murale', 'Carrelage Catégorie 1', 'Carrelage Catégorie 2', 'Plinthes'];

export default function Finition() {
  const {
    carrelagesC1, setCarrelagesC1,
    carrelagesC2, setCarrelagesC2,
    plinthes, setPlinthes,
    enduits, setEnduits,
    peintures, setPeintures,
    faiences, setFaiences,
    labelsPrix, setLabelsPrix,
    bibliothequePrix, setBibliothequePrix,
    addRow, removeRow, updateRow, niveauActifId
  } = useProjet();
  
  const { metreParNiveau } = useMetre();

  const idx = metreParNiveau.findIndex(m => m.niveauId === niveauActifId);
  const currentMetre = idx >= 0 ? metreParNiveau[idx].metre : { blocs: {}, avertissements: [] };

  const getBloc = (id) => currentMetre.blocs?.[id] || { total: 0, unite: '', lignes: [] };
  const getAvertissementLocal = (blocCode, ligneIndex) => {
    return currentMetre.avertissements?.find(a => a.bloc === blocCode && a.ligne === ligneIndex);
  };

  const currentCarrelagesC1 = carrelagesC1.filter(x => x.niveauId === niveauActifId);
  const currentCarrelagesC2 = carrelagesC2.filter(x => x.niveauId === niveauActifId);
  const currentPlinthes = plinthes.filter(x => x.niveauId === niveauActifId);
  const currentEnduits = enduits.filter(x => x.niveauId === niveauActifId);
  const currentPeintures = peintures.filter(x => x.niveauId === niveauActifId);
  const currentFaiences = faiences.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Finition</h2>

      <AccordionProvider key={niveauActifId} ids={BLOCS_FINITION}>
      <CarteBloc
        titre="Enduit Ciment"
        onAdd={() => addRow(enduits, setEnduits, { niveauId: niveauActifId, surface: '', nombre: '1' }, 'END')}
        addLabel="Ajouter un enduit"
        totalValeur={getBloc('enduits').total}
        totalUnite={getBloc('enduits').unite}
        totalLabel="Surface totale à enduire"
      >
        <p className="text-sm text-gray-500 mb-4 px-2">
          Laissez la surface vide : elle reprend automatiquement la maçonnerie
          nette de tous les niveaux, <strong>multipliée par 2</strong> — l'enduit
          couvre l'intérieur et l'extérieur. Saisissez une valeur pour l'imposer.
        </p>
        {currentEnduits.map((e, index) => (
          <LigneOuvrage
            key={e.id} repere={e.repere} titre="Zone"
            onRemove={currentEnduits.length > 1 ? () => removeRow(enduits, setEnduits, e.id) : null}
            avertissement={getAvertissementLocal('enduits', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Surface Libre (m²)" value={e.surface} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'surface', v)} unite="m2" placeholder="Auto" />
              <InputSaisie label="Nombre" value={e.nombre} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'nombre', v)} unite="u" />
            </div>
            <div className="text-xs text-devis-saisie font-bold uppercase tracking-wider mb-2">Paramètres techniques</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
              <InputSaisie label="Épaisseur" value={e.epaisseur} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'epaisseur', v)} unite="m" placeholder="0.02" />
              <InputSaisie label="Dosage Ciment" value={e.dosage} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'dosage', v)} unite="kg/m³" placeholder="350" />
              <InputSaisie label="Sable par sac" value={e.sableParSac} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'sableParSac', v)} unite="kg" placeholder="180" />
              <InputSaisie label="Pertes" value={e.pertePct} onChange={(v) => updateRow(enduits, setEnduits, e.id, 'pertePct', v)} unite="%" placeholder="5" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Surface calculée"
                value={getBloc('enduits').lignes[index]?.valeur || getBloc('enduits').lignes[index]?.surfaceNet}
                unite="m2"
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Peinture"
        onAdd={() => addRow(peintures, setPeintures, { niveauId: niveauActifId, longueur: '', hauteur: '', type: 'latex', nombre: '1' }, 'PNT')}
        addLabel="Ajouter une zone"
        totalValeur={getBloc('peinture').total}
        totalUnite={getBloc('peinture').unite}
        totalLabel="Surface totale à peindre"
      >
        {currentPeintures.map((p, index) => (
          <LigneOuvrage
            key={p.id} repere={p.repere} titre="Mur à peindre"
            onRemove={currentPeintures.length > 1 ? () => removeRow(peintures, setPeintures, p.id) : null}
            avertissement={getAvertissementLocal('peinture', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Type de peinture</label>
                <select
                  value={p.type}
                  onChange={(e) => updateRow(peintures, setPeintures, p.id, 'type', e.target.value)}
                  className="w-full px-2 py-2 border border-devis-border rounded bg-white text-devis-saisie text-sm focus:outline-none focus:border-devis-calcule focus:ring-1 focus:ring-devis-calcule transition-colors"
                >
                  <option value="latex">Latex</option>
                  <option value="classique">Classique</option>
                  <option value="chaux">Chaux</option>
                </select>
              </div>
              <InputSaisie label="Longueur" value={p.longueur} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={p.hauteur} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Surface Libre" value={p.surface} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'surface', v)} unite="m2" placeholder="Auto" />
            </div>
            <div className="text-xs text-devis-saisie font-bold uppercase tracking-wider mb-2">Paramètres techniques</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
              <InputSaisie label="Couches" value={p.couches} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'couches', v)} unite="N" placeholder="2" />
              <InputSaisie label="Rendement" value={p.rendement} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'rendement', v)} unite="U" placeholder="Auto" />
              <InputSaisie label="Pertes" value={p.pertePct} onChange={(v) => updateRow(peintures, setPeintures, p.id, 'pertePct', v)} unite="%" placeholder="5" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Surface"
                value={getBloc('peinture').lignes[index]?.valeur}
                unite="m2"
                trace={getBloc('peinture').lignes[index]?.trace}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Faïence Murale"
        onAdd={() => addRow(faiences, setFaiences, { niveauId: niveauActifId, longueur: '', hauteur: '', nombre: '1' }, 'FM')}
        addLabel="Ajouter un mur"
        totalValeur={getBloc('faience').total}
        totalUnite={getBloc('faience').unite}
        totalLabel="Surface totale"
      >
        <div className="mb-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Type de Faïence</label>
            <input 
              type="text"
              value={labelsPrix.faience || ''}
              onChange={(e) => setLabelsPrix({ ...labelsPrix, faience: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Prix Unitaire (FCFA)</label>
            <input 
              type="number"
              value={bibliothequePrix.faience || ''}
              onChange={(e) => setBibliothequePrix({ ...bibliothequePrix, faience: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
        </div>

        {currentFaiences.map((f, index) => (
          <LigneOuvrage
            key={f.id} repere={f.repere} titre="Mur"
            onRemove={currentFaiences.length > 1 ? () => removeRow(faiences, setFaiences, f.id) : null}
            avertissement={getAvertissementLocal('faience', index)}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <InputSaisie label="Longueur" value={f.longueur} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={f.hauteur} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={f.nombre} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'nombre', v)} unite="u" />
            </div>
            <div className="text-xs text-devis-saisie font-bold uppercase tracking-wider mb-2">Paramètres techniques</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
              <InputSaisie label="Long. Carreau" value={f.longueurCarreau} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'longueurCarreau', v)} unite="m" placeholder="0.25" />
              <InputSaisie label="Larg. Carreau" value={f.largeurCarreau} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'largeurCarreau', v)} unite="m" placeholder="0.40" />
              <InputSaisie label="Pertes" value={f.pertePct} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'pertePct', v)} unite="%" placeholder="5" />
              <InputSaisie label="Conso. Colle" value={f.consoColle} onChange={(v) => updateRow(faiences, setFaiences, f.id, 'consoColle', v)} unite="kg/m²" placeholder="5" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Surface"
                value={getBloc('faience').lignes[index]?.valeur}
                unite="m2"
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Carrelage Catégorie 1"
        onAdd={() => addRow(carrelagesC1, setCarrelagesC1, { niveauId: niveauActifId, longueur: '', largeur: '', nombre: '1' }, 'C1-')}
        addLabel="Ajouter une pièce"
        totalValeur={getBloc('carrelageC1').total}
        totalUnite={getBloc('carrelageC1').unite}
        totalLabel="Surface C1"
      >
        <div className="mb-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Type de Carreau</label>
            <input 
              type="text"
              value={labelsPrix.carreauxC1 || ''}
              onChange={(e) => setLabelsPrix({ ...labelsPrix, carreauxC1: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Prix Unitaire (FCFA)</label>
            <input 
              type="number"
              value={bibliothequePrix.carreauxC1 || ''}
              onChange={(e) => setBibliothequePrix({ ...bibliothequePrix, carreauxC1: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
        </div>

        {currentCarrelagesC1.map((c, index) => (
          <LigneOuvrage
            key={c.id} repere={c.repere} titre="Pièce"
            onRemove={currentCarrelagesC1.length > 1 ? () => removeRow(carrelagesC1, setCarrelagesC1, c.id) : null}
            avertissement={getAvertissementLocal('carrelageC1', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Longueur" value={c.longueur} onChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={c.largeur} onChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Nombre" value={c.nombre} onChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'nombre', v)} unite="u" />
            </div>
            <div className="text-xs text-devis-saisie font-bold uppercase tracking-wider mb-2">Paramètres techniques</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
              <InputSaisie label="Long. Carreau" value={c.longueurCarreau} onChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'longueurCarreau', v)} unite="m" placeholder="0.30" />
              <InputSaisie label="Larg. Carreau" value={c.largeurCarreau} onChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'largeurCarreau', v)} unite="m" placeholder="0.30" />
              <InputSaisie label="Pertes" value={c.pertePct} onChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'pertePct', v)} unite="%" placeholder="5" />
              <InputSaisie label="Conso. Joint" value={c.consoJoint} onChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'consoJoint', v)} unite="kg/m²" placeholder="0.5" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee label="Surface au sol" value={getBloc('carrelageC1').lignes[index]?.surface} unite="m2" trace={getBloc('carrelageC1').lignes[index]?.trace} overrideValue={c.override_surface} onOverrideChange={(v) => updateRow(carrelagesC1, setCarrelagesC1, c.id, 'override_surface', v)} />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Carrelage Catégorie 2"
        onAdd={() => addRow(carrelagesC2, setCarrelagesC2, { niveauId: niveauActifId, longueur: '', largeur: '', nombre: '1' }, 'C2-')}
        addLabel="Ajouter une pièce"
        totalValeur={getBloc('carrelageC2').total}
        totalUnite={getBloc('carrelageC2').unite}
        totalLabel="Surface C2"
      >
        <div className="mb-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Type de Carreau</label>
            <input 
              type="text"
              value={labelsPrix.carreauxC2 || ''}
              onChange={(e) => setLabelsPrix({ ...labelsPrix, carreauxC2: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Prix Unitaire (FCFA)</label>
            <input 
              type="number"
              value={bibliothequePrix.carreauxC2 || ''}
              onChange={(e) => setBibliothequePrix({ ...bibliothequePrix, carreauxC2: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
        </div>

        {currentCarrelagesC2.map((c, index) => (
          <LigneOuvrage
            key={c.id} repere={c.repere} titre="Pièce"
            onRemove={currentCarrelagesC2.length > 1 ? () => removeRow(carrelagesC2, setCarrelagesC2, c.id) : null}
            avertissement={getAvertissementLocal('carrelageC2', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Longueur" value={c.longueur} onChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Largeur" value={c.largeur} onChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'largeur', v)} unite="m" />
              <InputSaisie label="Nombre" value={c.nombre} onChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'nombre', v)} unite="u" />
            </div>
            <div className="text-xs text-devis-saisie font-bold uppercase tracking-wider mb-2">Paramètres techniques</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
              <InputSaisie label="Long. Carreau" value={c.longueurCarreau} onChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'longueurCarreau', v)} unite="m" placeholder="0.30" />
              <InputSaisie label="Larg. Carreau" value={c.largeurCarreau} onChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'largeurCarreau', v)} unite="m" placeholder="0.30" />
              <InputSaisie label="Pertes" value={c.pertePct} onChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'pertePct', v)} unite="%" placeholder="5" />
              <InputSaisie label="Conso. Joint" value={c.consoJoint} onChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'consoJoint', v)} unite="kg/m²" placeholder="0.5" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee label="Surface au sol" value={getBloc('carrelageC2').lignes[index]?.surface} unite="m2" trace={getBloc('carrelageC2').lignes[index]?.trace} overrideValue={c.override_surface} onOverrideChange={(v) => updateRow(carrelagesC2, setCarrelagesC2, c.id, 'override_surface', v)} />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Plinthes"
        onAdd={() => addRow(plinthes, setPlinthes, { niveauId: niveauActifId, perimetre: '', hauteur: '' }, 'PL-')}
        addLabel="Ajouter une zone"
        totalValeur={getBloc('plinthes').total}
        totalUnite={getBloc('plinthes').unite}
        totalLabel="Surface totale"
      >
        <div className="mb-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Nom (Optionnel)</label>
            <input 
              type="text"
              value={labelsPrix.plinthe || ''}
              onChange={(e) => setLabelsPrix({ ...labelsPrix, plinthe: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Prix Unitaire (FCFA)</label>
            <input 
              type="number"
              value={bibliothequePrix.plinthe || ''}
              onChange={(e) => setBibliothequePrix({ ...bibliothequePrix, plinthe: e.target.value })}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-[#0F151B] text-sm focus:outline-none focus:border-[#14479B] focus:ring-1 focus:ring-[#14479B] transition-colors"
            />
          </div>
        </div>

        {currentPlinthes.map((p, index) => (
          <LigneOuvrage
            key={p.id} repere={p.repere} titre="Plinthe"
            onRemove={currentPlinthes.length > 1 ? () => removeRow(plinthes, setPlinthes, p.id) : null}
            avertissement={getAvertissementLocal('plinthes', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Périmètre (ml)" value={p.perimetre} onChange={(v) => updateRow(plinthes, setPlinthes, p.id, 'perimetre', v)} unite="ml" />
              <InputSaisie label="Hauteur Plinthe" value={p.hauteur} onChange={(v) => updateRow(plinthes, setPlinthes, p.id, 'hauteur', v)} unite="m" placeholder="0.10" />
            </div>
            <div className="text-xs text-devis-saisie font-bold uppercase tracking-wider mb-2">Paramètres techniques</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
              <InputSaisie label="Pertes" value={p.pertePct} onChange={(v) => updateRow(plinthes, setPlinthes, p.id, 'pertePct', v)} unite="%" placeholder="5" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee label="Surface" value={getBloc('plinthes').lignes[index]?.valeur} unite="m2" trace={getBloc('plinthes').lignes[index]?.trace} />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      </AccordionProvider>
    </section>
  );
}
