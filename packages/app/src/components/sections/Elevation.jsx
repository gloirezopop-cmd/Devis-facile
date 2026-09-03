import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import ValeurCalculee from '../ui/ValeurCalculee.jsx';

export default function Elevation() {
  const {
    colonnes, setColonnes,
    maconneries, setMaconneries,
    escaliers, setEscaliers,
    addRow, removeRow, updateRow, niveauActifId
  } = useProjet();
  
  const { metreParNiveau } = useMetre();

  const idx = metreParNiveau.findIndex(m => m.niveauId === niveauActifId);
  const currentMetre = idx >= 0 ? metreParNiveau[idx].metre : { blocs: {}, avertissements: [] };

  const getBloc = (id) => currentMetre.blocs?.[id] || { total: 0, unite: '', lignes: [] };
  const getAvertissementLocal = (blocCode, ligneIndex) => {
    return currentMetre.avertissements?.find(a => a.bloc === blocCode && a.ligne === ligneIndex);
  };

  const currentColonnes = colonnes.filter(x => x.niveauId === niveauActifId);
  const currentMaconneries = maconneries.filter(x => x.niveauId === niveauActifId);
  const currentEscaliers = escaliers.filter(x => x.niveauId === niveauActifId);

  return (
    <section>
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">Élévation</h2>

      <CarteBloc
        titre="Colonnes (Poteaux)"
        onAdd={() => addRow(colonnes, setColonnes, { niveauId: niveauActifId, forme: 'rectangulaire', longueur: '', largeur: '', diametre: '', hauteur: '', nombre: '1', diametrePrin: 12, diametreCadre: 8, nbreBarresPrin: 4, espacementCadre: 0.15 }, 'C')}
        addLabel="Ajouter type de colonne"
        totalValeur={getBloc('colonnes').total}
        totalUnite={getBloc('colonnes').unite}
        totalLabel="Volume total colonnes"
      >
        {currentColonnes.map((c, index) => {
          const circulaire = c.forme === 'circulaire';
          return (
          <LigneOuvrage
            key={c.id} repere={c.repere} titre="Colonne"
            onRemove={currentColonnes.length > 1 ? () => removeRow(colonnes, setColonnes, c.id) : null}
            avertissement={getAvertissementLocal('colonnes', index)}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Forme</label>
                <select
                  value={c.forme || 'rectangulaire'}
                  onChange={(v) => {
                    // On efface les champs de l'autre forme au changement,
                    // sans quoi une valeur oubliee (ex. l'ancien "longueur"
                    // d'une colonne redevenue rectangulaire) restait en
                    // memoire et ressortait comme « saisie inutilisee ».
                    const nouvelleForme = v.target.value;
                    setColonnes(colonnes.map((x) => x.id !== c.id ? x : (
                      nouvelleForme === 'circulaire'
                        ? { ...x, forme: nouvelleForme, longueur: '', largeur: '' }
                        : { ...x, forme: nouvelleForme, diametre: '' }
                    )));
                  }}
                  className="border border-devis-saisie rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-sans text-sm"
                >
                  <option value="rectangulaire">Rectangulaire</option>
                  <option value="circulaire">Circulaire</option>
                </select>
              </div>
              <InputSaisie label="Nombre" value={c.nombre} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'nombre', v)} unite="u" />
              {circulaire ? (
                <InputSaisie label="Diamètre" value={c.diametre} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'diametre', v)} unite="m" />
              ) : (
                <>
                  <InputSaisie label="Longueur (section)" value={c.longueur} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'longueur', v)} unite="m" />
                  <InputSaisie label="Largeur (section)" value={c.largeur} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'largeur', v)} unite="m" />
                </>
              )}
              <InputSaisie label="Hauteur" value={c.hauteur} onChange={(v) => updateRow(colonnes, setColonnes, c.id, 'hauteur', v)} unite="m" />
            </div>
            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('colonnes').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('colonnes').lignes[index]?.trace}
                overrideValue={c.override_volume}
                onOverrideChange={(v) => updateRow(colonnes, setColonnes, c.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
          );
        })}
      </CarteBloc>

      <CarteBloc
        titre="Maçonnerie en Agglos"
        onAdd={() => addRow(maconneries, setMaconneries, { niveauId: niveauActifId, longueur: '', hauteur: '', nombre: '1', ouvertures: [] }, 'M')}
        addLabel="Ajouter section de mur"
        totalValeur={getBloc('maconnerie').total}
        totalUnite={getBloc('maconnerie').unite}
        totalLabel="Surface nette totale"
      >
        {currentMaconneries.map((m, index) => (
          <LigneOuvrage
            key={m.id} repere={m.repere} titre="Mur"
            onRemove={currentMaconneries.length > 1 ? () => removeRow(maconneries, setMaconneries, m.id) : null}
            avertissement={getAvertissementLocal('maconnerie', index)}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputSaisie label="Longueur" value={m.longueur} onChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'longueur', v)} unite="m" />
              <InputSaisie label="Hauteur" value={m.hauteur} onChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'hauteur', v)} unite="m" />
              <InputSaisie label="Nombre" value={m.nombre} onChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'nombre', v)} unite="u" />
            </div>

            <div className="border-t border-devis-border pt-4 mt-2 bg-gray-50 -mx-3 px-3 pb-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-devis-calcule uppercase">Déductions</h4>
                <button
                  onClick={() => updateRow(maconneries, setMaconneries, m.id, 'ouvertures', [...m.ouvertures, { id: Date.now(), repere: 'O', type: 'Porte', largeur: '', hauteur: '', nombre: '1' }])}
                  className="text-xs text-devis-saisie font-bold hover:underline min-h-[44px]"
                >
                  + Ouverture
                </button>
              </div>

              {m.ouvertures.map((ouv, oIdx) => (
                <div key={ouv.id} className="grid grid-cols-2 gap-4 relative mb-3 last:mb-0 border border-gray-200 bg-white p-2 rounded">
                  <button
                    onClick={() => updateRow(maconneries, setMaconneries, m.id, 'ouvertures', m.ouvertures.filter(o => o.id !== ouv.id))}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                  <InputSaisie label="Largeur" value={ouv.largeur} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].largeur = v; updateRow(maconneries, setMaconneries, m.id, 'ouvertures', newOuvs);
                  }} unite="m" />
                  <InputSaisie label="Hauteur" value={ouv.hauteur} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].hauteur = v; updateRow(maconneries, setMaconneries, m.id, 'ouvertures', newOuvs);
                  }} unite="m" />
                  <InputSaisie label="Nombre" value={ouv.nombre} onChange={(v) => {
                    const newOuvs = [...m.ouvertures]; newOuvs[oIdx].nombre = v; updateRow(maconneries, setMaconneries, m.id, 'ouvertures', newOuvs);
                  }} unite="u" />
                </div>
              ))}
              {m.ouvertures.length === 0 && <span className="text-xs text-gray-500 italic">Aucune déduction</span>}
            </div>

            <div className="mt-4">
              <ValeurCalculee
                label="Surface nette"
                value={getBloc('maconnerie').lignes[index]?.valeur}
                unite="m2"
                trace={getBloc('maconnerie').lignes[index]?.trace}
                overrideValue={m.override_surface}
                onOverrideChange={(v) => updateRow(maconneries, setMaconneries, m.id, 'override_surface', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>

      <CarteBloc
        titre="Escaliers"
        onAdd={() => addRow(escaliers, setEscaliers, { 
          niveauId: niveauActifId, mode: 'geometrie', nombre: '1', volume: '',
          volees: [{
            id: Date.now(), hauteurAMonter: '', nombreContremarches: '', giron: '', largeur: '',
            epaisseurPaillasse: '', typeEpaisseur: 'perpendiculaire', convention: 'arrivee_palier'
          }],
          paliers: [] 
        }, 'ESC')}
        addLabel="Ajouter un escalier"
        totalValeur={getBloc('escalier').total}
        totalUnite={getBloc('escalier').unite}
        totalLabel="Volume total escaliers"
      >
        {currentEscaliers.map((e, index) => (
          <LigneOuvrage
            key={e.id} repere={e.repere} titre="Escalier"
            onRemove={currentEscaliers.length > 1 ? () => removeRow(escaliers, setEscaliers, e.id) : null}
            avertissement={getAvertissementLocal('escalier', index)}
          >
            <div className="flex space-x-2 mb-4">
              <button 
                onClick={() => updateRow(escaliers, setEscaliers, e.id, 'mode', 'geometrie')}
                className={`px-3 py-1 rounded text-xs font-bold ${e.mode === 'geometrie' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600'}`}
              >Géométrie</button>
              <button 
                onClick={() => updateRow(escaliers, setEscaliers, e.id, 'mode', 'volume')}
                className={`px-3 py-1 rounded text-xs font-bold ${e.mode === 'volume' ? 'bg-devis-calcule text-white' : 'bg-gray-100 text-gray-600'}`}
              >Volume simple (Ancien)</button>
            </div>

            {e.mode === 'volume' ? (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <InputSaisie label="Volume (m³)" value={e.volume} onChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'volume', v)} unite="m³" />
                <InputSaisie label="Nombre" value={e.nombre} onChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'nombre', v)} unite="u" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputSaisie label="Nombre" value={e.nombre} onChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'nombre', v)} unite="u" />
                </div>
                
                {/* VOLEES */}
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-devis-calcule">Volées</h4>
                    <button
                      onClick={() => updateRow(escaliers, setEscaliers, e.id, 'volees', [...(e.volees || []), {
                        id: Date.now(), hauteurAMonter: '', nombreContremarches: '', giron: '', largeur: '',
                        epaisseurPaillasse: '', typeEpaisseur: 'perpendiculaire', convention: 'arrivee_palier'
                      }])}
                      className="text-xs text-devis-saisie font-bold hover:underline"
                    >+ Ajouter une volée</button>
                  </div>
                  {(e.volees || []).map((v, vIdx) => (
                    <div key={v.id} className="relative bg-white border border-gray-200 p-3 mb-2 rounded last:mb-0">
                      <button
                        onClick={() => updateRow(escaliers, setEscaliers, e.id, 'volees', e.volees.filter(x => x.id !== v.id))}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >×</button>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <InputSaisie label="H. à monter" value={v.hauteurAMonter} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].hauteurAMonter = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <InputSaisie label="Nb Contremarches" value={v.nombreContremarches} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].nombreContremarches = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="u" />
                        <InputSaisie label="Giron" value={v.giron} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].giron = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <InputSaisie label="Largeur" value={v.largeur} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].largeur = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <InputSaisie label="Ep. Paillasse" value={v.epaisseurPaillasse} onChange={(val) => {
                          const arr = [...e.volees]; arr[vIdx].epaisseurPaillasse = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                        }} unite="m" />
                        <div>
                          <label className="text-xs text-devis-saisie font-bold uppercase block mb-1">Type Ep.</label>
                          <select className="border border-devis-border rounded p-1 w-full text-xs" value={v.typeEpaisseur} onChange={(ev) => {
                            const arr = [...e.volees]; arr[vIdx].typeEpaisseur = ev.target.value; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }}>
                            <option value="perpendiculaire">Perpendiculaire</option>
                            <option value="verticale">Verticale</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-devis-saisie font-bold uppercase block mb-1">Convention</label>
                          <select className="border border-devis-border rounded p-1 w-full text-xs" value={v.convention} onChange={(ev) => {
                            const arr = [...e.volees]; arr[vIdx].convention = ev.target.value; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }}>
                            <option value="arrivee_palier">Arrivée palier</option>
                            <option value="marche_terminale">Marche terminale</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <h5 className="text-xs font-bold text-gray-500 mb-1">Ferraillage Volée</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <InputSaisie label="Ø Principale" value={v.ferraillage?.principales?.diametre || 12} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.principales) arr[vIdx].ferraillage.principales = {}; arr[vIdx].ferraillage.principales.diametre = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="mm" />
                          <InputSaisie label="Esp. Princ." value={v.ferraillage?.principales?.espacement || 0.15} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.principales) arr[vIdx].ferraillage.principales = {}; arr[vIdx].ferraillage.principales.espacement = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="m" />
                          <InputSaisie label="Ø Répartition" value={v.ferraillage?.repartition?.diametre || 8} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.repartition) arr[vIdx].ferraillage.repartition = {}; arr[vIdx].ferraillage.repartition.diametre = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="mm" />
                          <InputSaisie label="Esp. Rép." value={v.ferraillage?.repartition?.espacement || 0.20} onChange={(val) => {
                            const arr = [...e.volees]; if(!arr[vIdx].ferraillage) arr[vIdx].ferraillage = {}; if(!arr[vIdx].ferraillage.repartition) arr[vIdx].ferraillage.repartition = {}; arr[vIdx].ferraillage.repartition.espacement = val; updateRow(escaliers, setEscaliers, e.id, 'volees', arr);
                          }} unite="m" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PALIERS */}
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-devis-calcule">Paliers</h4>
                    <button
                      onClick={() => updateRow(escaliers, setEscaliers, e.id, 'paliers', [...(e.paliers || []), {
                        id: Date.now(), longueur: '', largeur: '', epaisseur: ''
                      }])}
                      className="text-xs text-devis-saisie font-bold hover:underline"
                    >+ Ajouter un palier</button>
                  </div>
                  {(e.paliers || []).map((p, pIdx) => (
                    <div key={p.id} className="relative bg-white border border-gray-200 p-2 mb-2 rounded last:mb-0">
                      <button
                        onClick={() => updateRow(escaliers, setEscaliers, e.id, 'paliers', e.paliers.filter(x => x.id !== p.id))}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >×</button>
                      <div className="grid grid-cols-3 gap-2">
                        <InputSaisie label="Longueur" value={p.longueur} onChange={(val) => {
                          const arr = [...e.paliers]; arr[pIdx].longueur = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                        }} unite="m" />
                        <InputSaisie label="Largeur" value={p.largeur} onChange={(val) => {
                          const arr = [...e.paliers]; arr[pIdx].largeur = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                        }} unite="m" />
                        <InputSaisie label="Épaisseur" value={p.epaisseur} onChange={(val) => {
                          const arr = [...e.paliers]; arr[pIdx].epaisseur = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                        }} unite="m" />
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <h5 className="text-xs font-bold text-gray-500 mb-1">Ferraillage Palier (Nappes)</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <InputSaisie label="Ø Barres" value={p.ferraillage?.diametre || 10} onChange={(val) => {
                            const arr = [...e.paliers]; if(!arr[pIdx].ferraillage) arr[pIdx].ferraillage = {}; arr[pIdx].ferraillage.diametre = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                          }} unite="mm" />
                          <InputSaisie label="Espacement" value={p.ferraillage?.espacement || 0.15} onChange={(val) => {
                            const arr = [...e.paliers]; if(!arr[pIdx].ferraillage) arr[pIdx].ferraillage = {}; arr[pIdx].ferraillage.espacement = val; updateRow(escaliers, setEscaliers, e.id, 'paliers', arr);
                          }} unite="m" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            <div className="mt-4 pt-4 border-t border-devis-border grid grid-cols-2 gap-4">
              <ValeurCalculee
                label="Volume ligne"
                value={getBloc('escalier').lignes[index]?.valeur}
                unite="m3"
                trace={getBloc('escalier').lignes[index]?.trace}
                overrideValue={e.override_volume}
                onOverrideChange={(v) => updateRow(escaliers, setEscaliers, e.id, 'override_volume', v)}
              />
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
    </section>
  );
}
