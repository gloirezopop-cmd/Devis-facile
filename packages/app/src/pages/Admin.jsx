import React, { useEffect, useState } from 'react';
import Icone from '../components/ui/Icone.jsx';
import HistogrammeInscriptions from '../components/admin/HistogrammeInscriptions.jsx';
import ListeComptes from '../components/admin/ListeComptes.jsx';
import GestionInvestisseurs from '../components/admin/GestionInvestisseurs.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchStatistiquesAdmin, fetchComptesAdmin, fetchMesRevenus } from '../lib/estimationApi.js';

/**
 * Le tableau de bord du fondateur.
 *
 * Tous les chiffres viennent de deux fonctions de la base
 * (`statistiques_admin`, `comptes_admin`), qui refusent de répondre à un
 * compte ordinaire. Rien n'est calculé ici : le navigateur n'a le droit de
 * lire ni `auth.users`, ni les paiements des autres comptes, et cette page ne
 * cherche pas à contourner cela.
 *
 * Ce qui n'est pas mesuré n'est pas affiché. En particulier le nombre de
 * visiteurs non connectés : rien dans l'application n'enregistre aujourd'hui
 * leur passage, et un zéro laisserait croire que personne ne vient.
 */
export default function Admin() {
  // L'adresse du compte connecté. Elle ne sert qu'à une chose, mais elle est
  // décisive : quand la base ne reconnaît pas le fondateur, la première
  // question est « sur quel compte suis-je, au juste ? ». Un tableau de bord
  // qui salue par le prénom ne suffit pas à y répondre — plusieurs comptes de
  // test peuvent porter le même.
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [comptes, setComptes] = useState([]);
  // Ce qu'un investisseur voit de son placement. `null` pour le fondateur et
  // pour tout compte sans part : la base ne renvoie rien dans ces cas-la.
  const [mesRevenus, setMesRevenus] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  // Les chiffres sont relus à chaque ouverture de la page : une inscription
  // qui arrive maintenant apparaît au prochain affichage. Ce compteur permet
  // de redemander sans recharger toute l'application.
  const [rafraichissement, setRafraichissement] = useState(0);

  useEffect(() => {
    let annule = false;
    Promise.all([fetchStatistiquesAdmin(), fetchComptesAdmin(), fetchMesRevenus()])
      .then(([s, c, r]) => {
        if (annule) return;
        setStats(s);
        setComptes(Array.isArray(c) ? c : []);
        setMesRevenus(r);
        setChargement(false);
      })
      .catch((e) => { if (!annule) { setErreur(e); setChargement(false); } });
    return () => { annule = true; };
  }, [rafraichissement]);

  if (chargement) {
    return <p className="py-20 text-center text-[13px] text-brand-text/40">Chargement du tableau de bord…</p>;
  }

  if (erreur || stats === null) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-devis-averifier/30 bg-amber-50 p-5 text-[13px] leading-relaxed text-brand-text/75">
        <p className="font-bold text-brand-text">Tableau de bord indisponible.</p>
        <p className="mt-1">
          Ce compte n'est pas reconnu comme administrateur, ou les scripts
          <code className="mx-1 rounded bg-black/5 px-1">maj_admin.sql</code> et
          <code className="mx-1 rounded bg-black/5 px-1">maj_admin_tableau_de_bord.sql</code>
          n'ont pas encore été exécutés dans Supabase.
        </p>
      </div>
    );
  }

  const formules = stats.abonnements_par_formule || {};
  const maxFormule = Math.max(1, ...Object.values(formules).map(Number));
  // Le fondateur est désigné par la base, jamais par cet écran : `est_fondateur`
  // arrive dans la réponse, et les clés d'argent n'y figurent que pour lui.
  const estFondateur = Boolean(stats.est_fondateur);

  return (
    <section className="mx-auto max-w-6xl py-2">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-brand-accent">
            Administration
          </p>
          <h1 className="mt-1 font-sans text-[28px] font-extrabold leading-tight tracking-tight text-brand-text">
            {stats.mon_prenom ? `Bonjour ${stats.mon_prenom}` : 'Tableau de bord'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[12.5px] text-brand-text/45">
            Arrêté au {dateLongue(stats.genere_le)}
          </p>
          <button
            type="button"
            onClick={() => { setChargement(true); setRafraichissement((n) => n + 1); }}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg border-2 border-brand-primary/15 px-3 text-[13px] font-bold text-brand-text/75 transition-colors hover:bg-black/5"
          >
            <Icone nom="refresh" size={15} /> Actualiser
          </button>
        </div>
      </header>

      {/* ── Les quatre chiffres qui comptent, en tête ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tuile
          valeur={stats.comptes_total} libelle="comptes au total"
          detail={`+${nombre(stats.comptes_7j)} cette semaine`} icone="users"
        />
        <Tuile
          valeur={stats.actifs_30j} libelle="comptes actifs sur 30 jours"
          detail={`${nombre(stats.actifs_7j)} sur 7 jours`} icone="bar-chart"
        />
        <Tuile
          valeur={stats.projets_total} libelle="projets créés"
          detail={`+${nombre(stats.projets_7j)} cette semaine`} icone="folder"
        />
        {estFondateur ? (
          <Tuile
            valeur={stats.recettes_totales} libelle="FCFA encaissés" monetaire
            detail={`${nombre(stats.recettes_30j)} F sur 30 jours`} icone="credit-card"
          />
        ) : mesRevenus ? (
          <Tuile
            valeur={mesRevenus.montant_total} libelle={`FCFA — votre part de ${mesRevenus.part} %`} monetaire
            detail={`${nombre(mesRevenus.montant_30j)} F sur 30 jours`} icone="credit-card"
          />
        ) : null}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-brand-primary/10 bg-white p-5 lg:col-span-2">
          <HistogrammeInscriptions donnees={stats.inscriptions_par_jour} />
        </div>

        <div className="rounded-xl border border-brand-primary/10 bg-white p-5">
          <h3 className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
            Abonnés par formule
          </h3>
          {Object.keys(formules).length === 0 ? (
            <p className="text-[13px] italic text-brand-text/40">
              Aucun abonnement actif pour l'instant.
            </p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(formules).map(([formule, valeur]) => (
                <li key={formule}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]">
                    <span className="text-brand-text/75">{formule}</span>
                    <span className="font-bold text-brand-text">{nombre(valeur)}</span>
                  </div>
                  {/* Une seule teinte : l'identité est portée par le libellé
                      juste au-dessus, pas par la couleur. */}
                  <div className="h-2 rounded-full bg-black/5">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(Number(valeur) / maxFormule) * 100}%`, backgroundColor: '#2F6FDE' }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-6 space-y-2 border-t border-brand-primary/10 pt-4 text-[13px]">
            <Ligne terme="Abonnés actifs" valeur={nombre(stats.abonnes_actifs)} />
            {estFondateur && <Ligne terme="Paiements encaissés" valeur={nombre(stats.paiements_reussis)} />}
            <Ligne terme="Actions enregistrées (7 j)" valeur={nombre(stats.evenements_7j)} />
          </dl>
        </div>
      </div>

      {stats.intentions_en_attente > 0 && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-devis-averifier/30 bg-amber-50 p-5">
          <Icone nom="alert-circle" size={20} className="mt-0.5 shrink-0 text-devis-averifier" />
          <div className="text-[13px] leading-relaxed text-brand-text/75">
            <p className="font-bold text-brand-text">
              {stats.intentions_en_attente} paiement{stats.intentions_en_attente > 1 ? 's' : ''} commencé
              {stats.intentions_en_attente > 1 ? 's' : ''} sans confirmation.
            </p>
            <p className="mt-1">
              Normal si quelqu'un a quitté la page de paiement. Si ce nombre grimpe sans
              qu'aucune recette n'arrive, c'est que le webhook Chariow ne reçoit plus rien.
            </p>
          </div>
        </div>
      )}

      {estFondateur && (
        <div className="mb-8">
          <GestionInvestisseurs partsAttribuees={stats.parts_attribuees} />
        </div>
      )}

      {/* Un écran qui masque une section sans rien dire laisse chercher pour
          rien. Ce compte est administrateur — il voit ce tableau de bord —
          mais la base ne le reconnaît pas comme fondateur : on le dit. */}
      {!estFondateur && !mesRevenus && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-devis-averifier/30 bg-amber-50 p-5">
          <Icone nom="alert-circle" size={20} className="mt-0.5 shrink-0 text-devis-averifier" />
          <div className="text-[13px] leading-relaxed text-brand-text/75">
            <p className="font-bold text-brand-text">
              Ce compte est administrateur, mais pas reconnu comme fondateur.
            </p>
            <p className="mt-2">
              Compte connecté :{' '}
              <strong className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-brand-text">
                {user?.email || 'adresse inconnue'}
              </strong>
            </p>
            <p className="mt-2">
              La section <strong>Investisseurs</strong>, le chiffre d'affaires et la liste des
              comptes lui sont donc masqués.{' '}
              <code className="rounded bg-black/5 px-1">maj_investisseurs.sql</code> ne marque
              qu'<strong>une seule adresse</strong> : si celle ci-dessus n'est pas celle du
              fondateur, déconnectez-vous et revenez avec le bon compte. Si c'est bien elle,
              ouvrez le script, remplacez l'adresse en tête, relancez-le dans Supabase — son
              rapport dit étape par étape ce qui est passé — puis <strong>Actualiser</strong>
              {' '}en haut de cette page.
            </p>
          </div>
        </div>
      )}

      {/* Sa part, en clair, pour l'investisseur — jamais le total dont elle sort. */}
      {!estFondateur && mesRevenus && (
        <div className="mb-8 rounded-xl border border-brand-primary/15 bg-brand-primary/[0.04] p-5">
          <h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
            Votre participation
          </h3>
          <p className="text-[13.5px] leading-relaxed text-brand-text/75">
            Vous détenez <strong className="text-brand-text">{mesRevenus.part} %</strong> du chiffre
            d'affaires de Devis Facile BTP, ce qui représente à ce jour{' '}
            <strong className="font-mono text-brand-text">{nombre(mesRevenus.montant_total)} FCFA</strong>,
            dont <strong className="font-mono text-brand-text">{nombre(mesRevenus.montant_30j)} FCFA</strong> sur
            les trente derniers jours.
          </p>
          <p className="mt-2 text-[12.5px] text-brand-text/45">
            L'application vous est ouverte sans abonnement. Les montants sont calculés sur les
            paiements réellement encaissés.
          </p>
        </div>
      )}

      {estFondateur && (
        <div className="mb-8">
          <ListeComptes comptes={comptes} />
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

function Tuile({ valeur, libelle, detail, icone, monetaire = false }) {
  return (
    <div className="rounded-xl border border-brand-primary/10 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-brand-text/35">
        <Icone nom={icone} size={15} className="shrink-0" />
      </div>
      <p className="font-sans text-[27px] font-extrabold leading-none tracking-tight text-brand-text">
        {nombre(valeur)}
        {monetaire && <span className="ml-1 text-[13px] font-bold text-brand-text/40">F</span>}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-snug text-brand-text/55">{libelle}</p>
      {detail && <p className="mt-1 text-[12px] font-bold text-devis-herite">{detail}</p>}
    </div>
  );
}

function Ligne({ terme, valeur }) {
  return (
    <div className="flex justify-between">
      <dt className="text-brand-text/60">{terme}</dt>
      <dd className="font-bold text-brand-text">{valeur}</dd>
    </div>
  );
}

function nombre(valeur) {
  return Number(valeur ?? 0).toLocaleString('fr-FR');
}

function dateLongue(valeur) {
  if (!valeur) return '—';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
