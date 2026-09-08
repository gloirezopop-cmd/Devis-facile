import React, { useEffect, useState } from 'react';
import Icone from '../components/ui/Icone.jsx';
import { fetchStatistiquesAdmin } from '../lib/estimationApi.js';

/**
 * Le tableau de bord du fondateur.
 *
 * Tous les chiffres viennent d'une seule fonction de la base
 * (`statistiques_admin`), qui refuse de répondre à un compte ordinaire. Rien
 * n'est calculé ici : le navigateur n'a le droit de lire ni `auth.users`, ni
 * les paiements des autres comptes, et cette page ne cherche pas à contourner
 * cela.
 *
 * Ce qui n'est pas mesuré n'est pas affiché. En particulier le nombre de
 * visiteurs non connectés : rien dans l'application n'enregistre aujourd'hui
 * leur passage, et afficher un zéro laisserait croire que personne ne vient.
 */
export default function Admin() {
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;
    fetchStatistiquesAdmin()
      .then((data) => { if (!annule) { setStats(data); setChargement(false); } })
      .catch((e) => { if (!annule) { setErreur(e); setChargement(false); } });
    return () => { annule = true; };
  }, []);

  if (chargement) {
    return <p className="py-20 text-center text-[13px] text-brand-text/40">Chargement des statistiques…</p>;
  }

  if (erreur || stats === null) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-devis-averifier/30 bg-amber-50 p-5 text-[13px] leading-relaxed text-brand-text/75">
        <p className="font-bold text-brand-text">Statistiques indisponibles.</p>
        <p className="mt-1">
          Ce compte n'est pas reconnu comme administrateur, ou le script
          <code className="mx-1 rounded bg-black/5 px-1">maj_admin.sql</code>
          n'a pas encore été exécuté dans Supabase.
        </p>
      </div>
    );
  }

  const formules = stats.abonnements_par_formule || {};

  return (
    <section className="mx-auto max-w-5xl py-2">
      <header className="mb-8">
        <h1 className="font-sans text-[26px] font-extrabold leading-tight tracking-tight text-brand-text">
          Tableau de bord
        </h1>
        <p className="mt-2 text-[13.5px] text-brand-text/60">
          Ce que la base sait réellement, arrêté au {formaterDate(stats.genere_le)}.
        </p>
      </header>

      <Groupe titre="Comptes" icone="users">
        <Chiffre valeur={stats.comptes_total} libelle="comptes au total" />
        <Chiffre valeur={stats.comptes_7j} libelle="créés ces 7 derniers jours" />
        <Chiffre valeur={stats.comptes_30j} libelle="créés ces 30 derniers jours" />
      </Groupe>

      <Groupe titre="Activité" icone="bar-chart">
        <Chiffre valeur={stats.actifs_7j} libelle="comptes actifs sur 7 jours" />
        <Chiffre valeur={stats.actifs_30j} libelle="comptes actifs sur 30 jours" />
        <Chiffre valeur={stats.evenements_7j} libelle="actions enregistrées sur 7 jours" />
      </Groupe>

      <Groupe titre="Travail produit" icone="folder">
        <Chiffre valeur={stats.projets_total} libelle="projets créés" />
        <Chiffre valeur={stats.projets_7j} libelle="projets ces 7 derniers jours" />
      </Groupe>

      <Groupe titre="Abonnements et recettes" icone="credit-card">
        <Chiffre valeur={stats.abonnes_actifs} libelle="abonnés actifs" />
        <Chiffre valeur={stats.paiements_reussis} libelle="paiements encaissés" />
        <Chiffre valeur={stats.recettes_totales} libelle="FCFA encaissés au total" monetaire />
        <Chiffre valeur={stats.recettes_30j} libelle="FCFA sur 30 jours" monetaire />
      </Groupe>

      {Object.keys(formules).length > 0 && (
        <div className="mb-8 rounded-xl border border-brand-primary/10 bg-white p-5">
          <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
            Abonnés par formule
          </h3>
          <ul className="space-y-1.5 text-[13.5px] text-brand-text/80">
            {Object.entries(formules).map(([formule, nombre]) => (
              <li key={formule} className="flex justify-between border-b border-brand-primary/5 pb-1.5 last:border-0">
                <span>{formule}</span>
                <span className="font-bold text-brand-text">{nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.intentions_en_attente > 0 && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-devis-averifier/30 bg-amber-50 p-5">
          <Icone nom="alert-circle" size={20} className="mt-0.5 shrink-0 text-devis-averifier" />
          <div className="text-[13px] leading-relaxed text-brand-text/75">
            <p className="font-bold text-brand-text">
              {stats.intentions_en_attente} paiement{stats.intentions_en_attente > 1 ? 's' : ''} commencé
              {stats.intentions_en_attente > 1 ? 's' : ''} sans confirmation.
            </p>
            <p className="mt-1">
              Normal si quelqu'un a quitté la page de paiement. Si le nombre grimpe sans
              qu'aucune recette n'arrive, c'est que le webhook Chariow ne reçoit plus rien.
            </p>
          </div>
        </div>
      )}

      {Array.isArray(stats.derniers_comptes) && stats.derniers_comptes.length > 0 && (
        <div className="mb-8 rounded-xl border border-brand-primary/10 bg-white p-5">
          <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
            Dix derniers comptes créés
          </h3>
          <ul className="space-y-1.5 text-[13px] text-brand-text/80">
            {stats.derniers_comptes.map((compte) => (
              <li key={compte.email} className="flex flex-wrap justify-between gap-x-4 border-b border-brand-primary/5 pb-1.5 last:border-0">
                <span className="break-all">{compte.email}</span>
                <span className="text-brand-text/45">{formaterDate(compte.cree_le)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[12.5px] leading-relaxed text-brand-text/45">
        Le nombre de <strong>visiteurs</strong> n'apparaît pas ici : l'application n'enregistre
        aujourd'hui aucune visite anonyme, et un chiffre inventé ne vaut rien. Pour l'obtenir,
        activez « Web Analytics » sur votre projet Vercel — c'est un simple interrupteur.
      </p>
    </section>
  );
}

function Groupe({ titre, icone, children }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
        <Icone nom={icone} size={15} className="shrink-0" /> {titre}
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </div>
  );
}

function Chiffre({ valeur, libelle, monetaire = false }) {
  const nombre = Number(valeur ?? 0);
  return (
    <div className="rounded-xl border border-brand-primary/10 bg-white p-4">
      <p className="font-sans text-[26px] font-extrabold leading-none tracking-tight text-brand-text">
        {nombre.toLocaleString('fr-FR')}
        {monetaire && <span className="ml-1 text-[13px] font-bold text-brand-text/40">F</span>}
      </p>
      <p className="mt-2 text-[12.5px] leading-snug text-brand-text/55">{libelle}</p>
    </div>
  );
}

function formaterDate(valeur) {
  if (!valeur) return '—';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
