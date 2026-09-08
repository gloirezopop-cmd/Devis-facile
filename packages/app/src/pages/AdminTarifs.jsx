import React, { useEffect, useMemo, useState } from 'react';
import Icone from '../components/ui/Icone.jsx';
import SelectSaisie from '../components/ui/SelectSaisie.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  fetchCountries, fetchBuildingTypes, fetchStandings, fetchRoofTypes, fetchToutesLesLocalisations,
  fetchTousLesTarifs, creerTarif, modifierTarif, supprimerTarif,
} from '../lib/estimationApi.js';
import { formaterNombre } from '../utils/format.js';

const CONFIGURATIONS = [
  { value: '', label: 'Toutes configurations' },
  ...Array.from({ length: 8 }, (_, i) => ({ value: `R${i}`, label: `R+${i}` })),
];
const CONFIANCES = [
  { value: 'estimation', label: 'Estimation' },
  { value: 'enquete_terrain', label: 'Enquête terrain' },
  { value: 'officiel', label: 'Officiel' },
];

const FORMULAIRE_VIDE = {
  country_id: '', location_id: '', building_type_id: '', standing_id: '', roof_type_id: '',
  level_category: '', scope: 'complete', price_min: '', price_reference: '', price_max: '',
  currency_code: 'XAF', year: new Date().getFullYear(), source: '', source_url: '', confidence: 'estimation',
};

/**
 * Administration des tarifs de construction.
 *
 * ⚠️ Cette page n'est protégée que par la connexion (comme tout le reste de
 * l'application) — pas par un rôle « administrateur ». L'application n'a
 * aujourd'hui aucune notion de rôle : n'importe quel compte connecté qui
 * atteint cette URL peut modifier les tarifs de tous les pays. La politique
 * RLS de schema_estimation.sql applique la même règle côté base de données.
 * Un vrai contrôle d'accès nécessite une colonne de rôle (par exemple sur une
 * table `profiles`) vérifiée à la fois ici et dans les politiques RLS.
 */
export default function AdminTarifs() {
  const toast = useToast();
  const [chargement, setChargement] = useState(true);
  const [countries, setCountries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [buildingTypes, setBuildingTypes] = useState([]);
  const [standings, setStandings] = useState([]);
  const [roofTypes, setRoofTypes] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [enregistrement, setEnregistrement] = useState(false);

  const recharger = () => fetchTousLesTarifs().then(setTarifs);

  useEffect(() => {
    Promise.all([
      fetchCountries(), fetchToutesLesLocalisations(), fetchBuildingTypes(), fetchStandings(), fetchRoofTypes(), fetchTousLesTarifs(),
    ]).then(([c, l, bt, st, rt, t]) => {
      setCountries(c); setLocations(l); setBuildingTypes(bt); setStandings(st); setRoofTypes(rt); setTarifs(t);
      setChargement(false);
    });
  }, []);

  const nom = (liste, id) => liste.find((x) => x.id === id)?.name || (id ? id : 'Toutes / Tous');

  const locationsDuPaysChoisi = useMemo(
    () => locations.filter((l) => l.country_id === formulaire.country_id),
    [locations, formulaire.country_id],
  );

  const champ = (cle) => (valeur) => setFormulaire((f) => ({ ...f, [cle]: valeur, ...(cle === 'country_id' ? { location_id: '' } : {}) }));

  const soumettre = async (e) => {
    e.preventDefault();
    if (!formulaire.country_id || !formulaire.standing_id || !formulaire.price_min || !formulaire.price_reference || !formulaire.price_max) {
      toast('Pays, standing et les trois prix sont obligatoires.', 'erreur');
      return;
    }
    setEnregistrement(true);
    try {
      await creerTarif({
        country_id: formulaire.country_id,
        location_id: formulaire.location_id || null,
        building_type_id: formulaire.building_type_id || null,
        standing_id: formulaire.standing_id,
        roof_type_id: formulaire.roof_type_id || null,
        level_category: formulaire.level_category || null,
        scope: formulaire.scope || 'complete',
        price_min: Number(formulaire.price_min),
        price_reference: Number(formulaire.price_reference),
        price_max: Number(formulaire.price_max),
        currency_code: formulaire.currency_code || 'XAF',
        year: Number(formulaire.year) || new Date().getFullYear(),
        source: formulaire.source || null,
        source_url: formulaire.source_url || null,
        confidence: formulaire.confidence,
      });
      toast('Tarif enregistré.');
      setFormulaire({ ...FORMULAIRE_VIDE, country_id: formulaire.country_id, currency_code: formulaire.currency_code });
      recharger();
    } catch (err) {
      toast(`Erreur : ${err.message}`, 'erreur');
    } finally {
      setEnregistrement(false);
    }
  };

  const basculerActif = async (t) => {
    try {
      await modifierTarif(t.id, { active: !t.active });
      recharger();
    } catch (err) {
      toast(`Erreur : ${err.message}`, 'erreur');
    }
  };

  const supprimer = async (t) => {
    if (!window.confirm('Supprimer définitivement ce tarif ?')) return;
    try {
      await supprimerTarif(t.id);
      toast('Tarif supprimé.');
      recharger();
    } catch (err) {
      toast(`Erreur : ${err.message}`, 'erreur');
    }
  };

  if (chargement) return <p className="text-sm text-brand-text/50">Chargement…</p>;

  return (
    <div className="pb-20">
      <div className="mb-2 flex items-center gap-2">
        <Icone nom="calculator" size={20} className="text-brand-primary" />
        <h1 className="font-sans text-xl font-bold text-brand-text">Administration des tarifs de construction</h1>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-md border border-devis-averifier/30 bg-amber-50 px-3 py-2.5 text-[12.5px] text-brand-text/70">
        <Icone nom="alert-circle" size={15} className="mt-0.5 shrink-0 text-devis-averifier" />
        <span>
          Cette page n'est pas réservée à un administrateur : tout compte connecté peut la modifier, faute d'un
          système de rôles dans l'application. Ne la partagez pas comme si elle était protégée.
        </span>
      </div>

      <form onSubmit={soumettre} className="bg-white rounded-xl border border-brand-primary/10 p-5 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <SelectSaisie label="Pays" value={formulaire.country_id} onChange={champ('country_id')}
          options={[{ value: '', label: 'Choisir…' }, ...countries.map((c) => ({ value: c.id, label: c.name }))]} />
        <SelectSaisie label="Localisation" value={formulaire.location_id} onChange={champ('location_id')}
          options={[{ value: '', label: 'Toutes (national)' }, ...locationsDuPaysChoisi.map((l) => ({ value: l.id, label: l.name }))]} />
        <SelectSaisie label="Type de bâtiment" value={formulaire.building_type_id} onChange={champ('building_type_id')}
          options={[{ value: '', label: 'Tous types' }, ...buildingTypes.map((b) => ({ value: b.id, label: b.name }))]} />
        <SelectSaisie label="Standing" value={formulaire.standing_id} onChange={champ('standing_id')}
          options={[{ value: '', label: 'Choisir…' }, ...standings.map((s) => ({ value: s.id, label: s.name }))]} />
        <SelectSaisie label="Toiture" value={formulaire.roof_type_id} onChange={champ('roof_type_id')}
          options={[{ value: '', label: 'Toutes toitures' }, ...roofTypes.map((r) => ({ value: r.id, label: r.name }))]} />
        <SelectSaisie label="Configuration" value={formulaire.level_category} onChange={champ('level_category')} options={CONFIGURATIONS} />
        <SelectSaisie label="Fiabilité" value={formulaire.confidence} onChange={champ('confidence')} options={CONFIANCES} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Année</label>
          <input type="number" value={formulaire.year} onChange={(e) => champ('year')(e.target.value)}
            className="border border-devis-border rounded p-2 text-devis-saisie w-full min-h-[44px] font-mono focus:outline-none focus:ring-2 focus:ring-devis-saisie" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Prix minimum (/m²)</label>
          <input type="number" min="0" value={formulaire.price_min} onChange={(e) => champ('price_min')(e.target.value)}
            className="border border-devis-border rounded p-2 text-devis-saisie w-full min-h-[44px] font-mono focus:outline-none focus:ring-2 focus:ring-devis-saisie" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Prix de référence (/m²)</label>
          <input type="number" min="0" value={formulaire.price_reference} onChange={(e) => champ('price_reference')(e.target.value)}
            className="border border-devis-border rounded p-2 text-devis-saisie w-full min-h-[44px] font-mono focus:outline-none focus:ring-2 focus:ring-devis-saisie" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Prix maximum (/m²)</label>
          <input type="number" min="0" value={formulaire.price_max} onChange={(e) => champ('price_max')(e.target.value)}
            className="border border-devis-border rounded p-2 text-devis-saisie w-full min-h-[44px] font-mono focus:outline-none focus:ring-2 focus:ring-devis-saisie" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Devise</label>
          <input value={formulaire.currency_code} onChange={(e) => champ('currency_code')(e.target.value)}
            className="border border-devis-border rounded p-2 text-devis-saisie w-full min-h-[44px] font-mono focus:outline-none focus:ring-2 focus:ring-devis-saisie" />
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Source</label>
          <input value={formulaire.source} onChange={(e) => champ('source')(e.target.value)} placeholder="Ex. : enquête agences Bafoussam, sept. 2026"
            className="border border-devis-border rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie" />
        </div>

        <div className="col-span-2 md:col-span-4 flex justify-end">
          <button type="submit" disabled={enregistrement}
            className="min-h-[44px] rounded-md bg-brand-primary px-6 text-[13.5px] font-bold text-white hover:bg-brand-primary-dark disabled:opacity-50">
            {enregistrement ? 'Enregistrement…' : '+ Ajouter ce tarif'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-brand-primary/10 bg-white">
        <table className="w-full text-[12.5px]">
          <thead className="bg-black/[0.03] text-left text-brand-text/50 uppercase text-[10.5px] tracking-wider">
            <tr>
              <th className="p-3">Pays</th>
              <th className="p-3">Localisation</th>
              <th className="p-3">Type</th>
              <th className="p-3">Standing</th>
              <th className="p-3">Toiture</th>
              <th className="p-3">Config.</th>
              <th className="p-3 text-right">Min</th>
              <th className="p-3 text-right">Référence</th>
              <th className="p-3 text-right">Max</th>
              <th className="p-3">Année</th>
              <th className="p-3">Statut</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {tarifs.map((t) => (
              <tr key={t.id} className={`border-t border-brand-primary/5 ${!t.active ? 'opacity-40' : ''}`}>
                <td className="p-3 font-bold">{nom(countries, t.country_id)}</td>
                <td className="p-3">{nom(locations, t.location_id)}</td>
                <td className="p-3">{nom(buildingTypes, t.building_type_id)}</td>
                <td className="p-3">{nom(standings, t.standing_id)}</td>
                <td className="p-3">{nom(roofTypes, t.roof_type_id)}</td>
                <td className="p-3 font-mono">{t.level_category || 'Toutes'}</td>
                <td className="p-3 text-right font-mono">{formaterNombre(t.price_min, true)}</td>
                <td className="p-3 text-right font-mono font-bold">{formaterNombre(t.price_reference, true)}</td>
                <td className="p-3 text-right font-mono">{formaterNombre(t.price_max, true)}</td>
                <td className="p-3 font-mono">{t.year}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase ${t.active ? 'bg-devis-herite/10 text-devis-herite' : 'bg-black/5 text-brand-text/40'}`}>
                    {t.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <button onClick={() => basculerActif(t)} className="text-brand-interactive font-bold hover:underline mr-3">
                    {t.active ? 'Désactiver' : 'Réactiver'}
                  </button>
                  <button onClick={() => supprimer(t)} className="text-red-500 font-bold hover:underline">Supprimer</button>
                </td>
              </tr>
            ))}
            {tarifs.length === 0 && (
              <tr><td colSpan={12} className="p-6 text-center text-brand-text/40 italic">Aucun tarif enregistré pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
