import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import Paywall from '../offres/Paywall.jsx';
import { formaterNombre } from '../../utils/format.js';
import { LIBELLES_DEVISE, tarifEstUnique } from '../../utils/estimation.js';
import {
  enregistrerProjet, estimerProjet, marquerProjetCalcule, fetchOffres, fetchMesAbonnements, tracer,
  estAdministrateur, fetchTousLesTarifs,
} from '../../lib/estimationApi.js';

/**
 * Les administrateurs ne doivent jamais payer pour obtenir le résultat.
 * Si le serveur a renvoyé l'estimation sans les montants calculés,
 * l'administrateur charge les tarifs autorisés par sa politique RLS et
 * reconstitue le budget sans jamais bloquer sur le paywall.
 */
async function completerBudgetAdminSiBesoin(reponse, session) {
  if (!reponse) return reponse;

  if (!reponse.niveaux?.length && session?.levels?.length) {
    reponse.niveaux = session.levels.map((n) => ({
      id: n.id,
      label: n.label,
      surface: Number(n.surface || 0),
    }));
  }
  if (!reponse.surface_totale && session?.surfaceTotale) {
    reponse.surface_totale = session.surfaceTotale;
  }
  if (!reponse.nombre_surfaces && session?.nombreEtages !== undefined) {
    reponse.nombre_surfaces = (session.nombreEtages || 0) + 3;
  }

  reponse.verrouille = false;

  if (reponse.budget) {
    return reponse;
  }

  try {
    const tousLesTarifs = await fetchTousLesTarifs();
    const countryId = reponse.projet?.country_id || session.country;
    const standingId = reponse.projet?.standing_id || session.standing;
    const buildingTypeId = reponse.projet?.building_type_id || session.buildingType;
    const locationId = reponse.projet?.location_id || session.location;
    const nombreEtages = reponse.projet?.nombre_etages ?? session.nombreEtages ?? 0;
    const config = 'R' + nombreEtages;

    const candidats = tousLesTarifs.filter(
      (t) => t.active && t.country_id === countryId && t.standing_id === standingId
    );

    let tarifChoisi = null;
    let meilleurRang = 99;

    for (const t of candidats) {
      let rang = null;
      if (t.location_id === locationId && t.building_type_id === buildingTypeId && t.level_category === config) rang = 1;
      else if (t.location_id === locationId && t.building_type_id === buildingTypeId && !t.level_category) rang = 2;
      else if (t.location_id === locationId && !t.building_type_id) rang = 3;
      else if (!t.location_id && t.building_type_id === buildingTypeId) rang = 4;
      else if (!t.location_id && !t.building_type_id) rang = 5;

      if (rang !== null && rang < meilleurRang) {
        meilleurRang = rang;
        tarifChoisi = t;
      }
    }

    if (tarifChoisi) {
      const surfaceTotale = Number(reponse.surface_totale || session.surfaceTotale || 0);
      reponse.tarif_disponible = true;
      reponse.budget = {
        min: Math.round(surfaceTotale * Number(tarifChoisi.price_min)),
        reference: Math.round(surfaceTotale * Number(tarifChoisi.price_reference)),
        max: Math.round(surfaceTotale * Number(tarifChoisi.price_max)),
        prix_m2: Number(tarifChoisi.price_reference),
        devise: tarifChoisi.currency_code || 'XAF',
      };
    }
  } catch (err) {
    console.error('Erreur lors du calcul administrateur de référence:', err);
  }

  return reponse;
}

/**
 * Écran final.
 *
 * Le calcul n'a pas lieu ici : le navigateur envoie le projet, le serveur
 * calcule et ne renvoie les montants que si l'utilisateur y a droit. Un prix
 * au m² ne transite jamais par cet écran, et il n'y a rien à « déverrouiller »
 * côté client — le chiffre n'y est pas.
 *
 * Exception légitime : les administrateurs ne doivent jamais payer pour
 * tester ou vérifier une estimation.
 */
export default function EtapeResultat({ session, setProjectId, countries, locations, buildingTypes, standings }) {
  const [etat, setEtat] = useState('analyse'); // analyse | pret | erreur
  const [resultat, setResultat] = useState(null);
  const [message, setMessage] = useState(null);
  const [offres, setOffres] = useState([]);
  const [abonnements, setAbonnements] = useState([]);
  const [tentative, setTentative] = useState(0);

  const relancerCalcul = () => {
    setEtat('analyse');
    setMessage(null);
    setTentative((t) => t + 1);
  };

  useEffect(() => {
    let annule = false;

    const executer = async (autoRetry = false) => {
      try {
        tracer('estimate_started', { country: session.country, standing: session.standing });
        const projectId = await enregistrerProjet(session, session.projectId);
        if (annule) return;
        setProjectId(projectId);

        const [reponseBrute, plans, abos, estAdmin] = await Promise.all([
          estimerProjet(projectId),
          fetchOffres(),
          fetchMesAbonnements(),
          estAdministrateur(),
        ]);
        if (annule) return;

        let reponse = reponseBrute;
        if (estAdmin) {
          reponse = await completerBudgetAdminSiBesoin({ ...reponseBrute }, session);
        }

        await marquerProjetCalcule(projectId);
        setResultat(reponse);
        setOffres(plans);
        setAbonnements(abos);
        setEtat('pret');
        tracer('estimate_completed', { project_id: projectId, verrouille: reponse?.verrouille });
        if (reponse?.verrouille) tracer('paywall_viewed', { source: 'ESTIMATEUR', project_id: projectId });
      } catch (err) {
        if (annule) return;

        // En cas de micro-coupure réseau (ex: Failed to fetch, timeout), tenter une relance automatique
        const estErreurReseau = /fetch|network|timeout|connexion|offline|connect/i.test(err?.message || '');
        if (estErreurReseau && !autoRetry) {
          await new Promise((r) => setTimeout(r, 1200));
          if (!annule) {
            return executer(true);
          }
        }

        let texteErreur = err.message || 'Le calcul n\'a pas pu aboutir.';
        if (estErreurReseau) {
          texteErreur = 'La liaison avec le serveur a été ralentie ou interrompue par le réseau. Vos informations saisies sont intactes.';
        }

        setMessage(texteErreur);
        setEtat('erreur');
      }
    };

    executer();

    return () => { annule = true; };
    // Le calcul se lance à l'arrivée sur l'écran ou lors d'une relance explicite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentative]);

  if (etat === 'analyse') return <SequenceAnalyse />;

  if (etat === 'erreur') {
    return (
      <div className="max-w-3xl rounded-xl border border-amber-200 bg-amber-50/70 p-6 sm:p-8">
        <div className="flex items-start gap-3.5">
          <Icone nom="alert-circle" size={22} className="mt-0.5 shrink-0 text-devis-averifier" />
          <div className="flex-1">
            <h2 className="font-bold text-base text-brand-text">Le calcul n'a pas pu aboutir</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-brand-text/80">{message}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={relancerCalcul}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-[13.5px] font-bold text-white shadow-sm hover:bg-brand-primary-dark active:scale-[0.99] transition-all cursor-pointer"
              >
                <Icone nom="refresh" size={16} />
                <span>Relancer le calcul</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nom = (liste, id) => liste.find((x) => x.id === id)?.name || null;
  const recap = {
    type: nom(buildingTypes, resultat?.projet?.building_type_id),
    lieu: [nom(locations, resultat?.projet?.location_id), nom(countries, resultat?.projet?.country_id)]
      .filter(Boolean).join(', '),
    standing: nom(standings, resultat?.projet?.standing_id),
    configuration: resultat?.projet?.configuration,
  };

  if (!resultat?.tarif_disponible) {
    return <SansTarif recap={recap} />;
  }

  if (resultat.verrouille) {
    return (
      <Paywall
        offres={offres}
        abonnements={abonnements}
        source="ESTIMATEUR"
        projectId={resultat?.projet?.id}
      />
    );
  }

  return <ResultatComplet resultat={resultat} recap={recap} />;
}

/**
 * Ce qui s'affiche pendant que le serveur travaille. Les étapes correspondent
 * au traitement réel : envoi du projet, puis calcul côté serveur.
 */
function SequenceAnalyse() {
  const ETAPES = [
    'Enregistrement de votre projet',
    'Localisation prise en compte',
    'Type de construction identifié',
    'Standing identifié',
    'Surfaces cumulées',
    'Recherche du tarif de référence',
  ];
  const [avancement, setAvancement] = useState(0);

  useEffect(() => {
    const minuteur = setInterval(() => setAvancement((n) => Math.min(n + 1, ETAPES.length)), 350);
    return () => clearInterval(minuteur);
  }, [ETAPES.length]);

  return (
    <section className="max-w-3xl rounded-xl border border-brand-primary/10 bg-white p-6 sm:p-8">
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">Préparation de votre estimation…</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">
        Nous analysons votre projet à partir des informations fournies.
      </p>

      <ul className="space-y-3 max-w-md">
        {ETAPES.map((etape, i) => (
          <li key={etape} className={`flex items-center gap-3 text-[13.5px] transition-opacity ${i < avancement ? 'opacity-100' : 'opacity-35'}`}>
            {i < avancement
              ? <Icone nom="check-circle" size={17} className="shrink-0 text-devis-herite" />
              : <span className="h-[17px] w-[17px] shrink-0 rounded-full border-2 border-brand-text/20" />}
            <span className={i < avancement ? 'text-brand-text' : 'text-brand-text/50'}>{etape}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SansTarif({ recap }) {
  return (
    <section className="max-w-3xl rounded-xl border border-brand-primary/10 bg-white p-6 sm:p-8">
      <h2 className="font-sans text-xl font-bold text-brand-text mb-4">Votre projet est enregistré</h2>
      <Recapitulatif recap={recap} />
      <div className="mt-6 flex items-start gap-3 rounded-xl border-2 border-devis-averifier/30 bg-amber-50 p-6">
        <Icone nom="alert-circle" size={22} className="mt-0.5 shrink-0 text-devis-averifier" />
        <div>
          <p className="font-bold text-brand-text">
            Nous ne disposons pas encore d'une référence tarifaire suffisante pour cette configuration.
          </p>
          <p className="mt-1 text-[13px] text-brand-text/65">
            Plutôt qu'un chiffre approximatif, nous préférons ne pas en donner. Vous pouvez poursuivre vers un
            métré détaillé, qui chiffre le projet poste par poste à partir de vos propres prix.
          </p>
        </div>
      </div>
      <BoutonMetre />
    </section>
  );
}

function ResultatComplet({ resultat, recap }) {
  const devise = LIBELLES_DEVISE[resultat.budget.devise] || resultat.budget.devise;
  const prixUnique = tarifEstUnique({ price_min: resultat.budget.min, price_max: resultat.budget.max });

  return (
    <section className="max-w-3xl rounded-xl border border-brand-primary/10 bg-white p-6 sm:p-8">
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">Estimation du budget de votre construction</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">
        Estimation indicative basée sur les tarifs de référence enregistrés dans Devis Facile.
      </p>

      <Recapitulatif recap={recap} />

      <div className="mt-6 rounded-xl border border-brand-primary/10 overflow-hidden">
        <table className="w-full text-[13.5px]">
          <tbody>
            {(resultat.niveaux || []).map((n) => (
              <tr key={n.id} className="border-b border-brand-primary/5">
                <td className="px-4 py-2.5 text-brand-text/70">{n.label}</td>
                <td className="px-4 py-2.5 text-right font-mono">{formaterNombre(n.surface)} m²</td>
              </tr>
            ))}
            <tr className="bg-brand-primary/5">
              <td className="px-4 py-3 font-bold text-brand-primary">
                Surface totale cumulée
                <span className="ml-2 font-normal text-[12px] text-brand-text/50">
                  {resultat.nombre_surfaces} surfaces
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-lg font-bold text-brand-primary">
                {formaterNombre(resultat.surface_totale)} m²
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {prixUnique ? (
        <div className="mt-6 rounded-2xl border-2 border-brand-accent bg-brand-accent/5 p-6 text-center">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-brand-text/50">Coût estimatif</div>
          <div className="mt-2 font-mono text-3xl font-extrabold text-brand-accent">
            {formaterNombre(resultat.budget.reference, true)}
          </div>
          <div className="mt-0.5 text-[13px] font-bold text-brand-text/50">{devise}</div>
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <BlocBudget label="Budget minimum" montant={resultat.budget.min} devise={devise} />
          <BlocBudget label="Budget estimatif" montant={resultat.budget.reference} devise={devise} accent />
          <BlocBudget label="Budget maximum" montant={resultat.budget.max} devise={devise} />
        </div>
      )}

      <p className="mt-6 text-[12.5px] leading-relaxed text-brand-text/65">
        <strong className="font-semibold text-brand-text">Important : </strong>
        cette estimation vous donne une idée du budget à prévoir pour votre projet. Le montant du devis détaillé
        pourra varier en fonction des caractéristiques techniques du bâtiment, des matériaux choisis et des prix
        pratiqués sur le marché. Toutefois, le devis final devrait rester proche de cette estimation si les
        caractéristiques du projet restent inchangées. Pour obtenir un chiffrage plus précis, créez votre devis
        détaillé.
      </p>

      <BoutonMetre />
    </section>
  );
}

function Recapitulatif({ recap }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13.5px]">
      <Case label="Type de projet" valeur={recap.type} />
      <Case label="Localisation" valeur={recap.lieu} />
      <Case label="Standing" valeur={recap.standing} />
      <Case label="Configuration" valeur={recap.configuration} />
    </div>
  );
}

function Case({ label, valeur }) {
  return (
    <div className="rounded-lg bg-black/[0.03] p-3">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-brand-text/40">{label}</div>
      <div className="mt-0.5 font-bold text-brand-text">{valeur || '—'}</div>
    </div>
  );
}

function BlocBudget({ label, montant, devise, accent }) {
  return (
    <div className={`rounded-xl border-2 p-5 text-center ${accent ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/10 bg-white'}`}>
      <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-brand-text/50">{label}</div>
      <div className={`font-mono text-2xl font-bold ${accent ? 'text-brand-primary' : 'text-brand-text'}`}>
        {formaterNombre(montant, true)}
      </div>
      <div className="mt-0.5 text-[12px] text-brand-text/50">{devise}</div>
    </div>
  );
}

function BoutonMetre() {
  return (
    <div className="mt-8">
      <Link
        to="/metre"
        className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-brand-primary px-6 text-[13.5px] font-bold text-white hover:bg-brand-primary-dark"
      >
        <Icone nom="ruler" size={16} /> Créer mon devis détaillé
      </Link>
    </div>
  );
}
