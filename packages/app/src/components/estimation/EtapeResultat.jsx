import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import Paywall from '../offres/Paywall.jsx';
import { formaterNombre } from '../../utils/format.js';
import { LIBELLES_DEVISE, tarifEstUnique } from '../../utils/estimation.js';
import {
  enregistrerProjet, estimerProjet, marquerProjetCalcule, fetchOffres, fetchMesAbonnements, tracer,
} from '../../lib/estimationApi.js';

/**
 * Écran final.
 *
 * Le calcul n'a pas lieu ici : le navigateur envoie le projet, le serveur
 * calcule et ne renvoie les montants que si l'utilisateur y a droit. Un prix
 * au m² ne transite jamais par cet écran, et il n'y a rien à « déverrouiller »
 * côté client — le chiffre n'y est pas.
 *
 * La séquence d'analyse affichée pendant l'attente ne simule rien : chaque
 * ligne cochée correspond à une information que le serveur a effectivement
 * prise en compte et renvoyée dans sa réponse.
 */
export default function EtapeResultat({ session, setProjectId, countries, locations, buildingTypes, standings }) {
  const [etat, setEtat] = useState('analyse'); // analyse | pret | erreur
  const [resultat, setResultat] = useState(null);
  const [message, setMessage] = useState(null);
  const [offres, setOffres] = useState([]);
  const [abonnements, setAbonnements] = useState([]);

  useEffect(() => {
    let annule = false;

    (async () => {
      try {
        tracer('estimate_started', { country: session.country, standing: session.standing });
        const projectId = await enregistrerProjet(session, session.projectId);
        if (annule) return;
        setProjectId(projectId);

        const [reponse, plans, abos] = await Promise.all([
          estimerProjet(projectId),
          fetchOffres(),
          fetchMesAbonnements(),
        ]);
        if (annule) return;

        await marquerProjetCalcule(projectId);
        setResultat(reponse);
        setOffres(plans);
        setAbonnements(abos);
        setEtat('pret');
        tracer('estimate_completed', { project_id: projectId, verrouille: reponse?.verrouille });
        if (reponse?.verrouille) tracer('paywall_viewed', { source: 'ESTIMATEUR', project_id: projectId });
      } catch (err) {
        if (annule) return;
        setMessage(err.message || 'Le calcul n\'a pas pu aboutir.');
        setEtat('erreur');
      }
    })();

    return () => { annule = true; };
    // Le calcul se lance une fois, à l'arrivée sur l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (etat === 'analyse') return <SequenceAnalyse />;

  if (etat === 'erreur') {
    return (
      <div className="flex max-w-3xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
        <Icone nom="alert-circle" size={20} className="mt-0.5 shrink-0 text-red-500" />
        <div>
          <p className="font-bold text-brand-text">Le calcul n'a pas pu aboutir.</p>
          <p className="mt-1 text-[13px] text-brand-text/70">{message}</p>
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

      <p className="mt-6 text-[12px] leading-relaxed text-brand-text/50">
        Cette estimation est indicative et ne constitue pas un devis définitif. Le coût réel dépend des
        caractéristiques techniques du projet, des plans, du terrain, de la nature du sol, du type de fondation,
        de la structure, des menuiseries, des installations électriques et sanitaires, des finitions, de la
        main-d'œuvre et du prix local des matériaux. Le terrain, les études techniques, les frais administratifs,
        les raccordements, les clôtures et les aménagements extérieurs ne sont pas compris.
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
