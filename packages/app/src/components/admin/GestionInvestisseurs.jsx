import React, { useEffect, useState } from 'react';
import Icone from '../ui/Icone.jsx';
import {
  fetchInvestisseurs, fetchInvitations,
  nommerInvestisseur, retirerInvestisseur,
  inviterInvestisseur, annulerInvitation,
} from '../../lib/estimationApi.js';

/**
 * Les investisseurs : qui est associé au produit, pour quelle part.
 *
 * Cet écran n'accorde aucun droit par lui-même. Chaque bouton appelle une
 * fonction de la base qui vérifie, elle, que l'appelant est bien le fondateur.
 * Cacher le formulaire à quelqu'un d'autre ne protégerait rien — il suffirait
 * d'appeler l'API avec son propre jeton.
 *
 * Un investisseur nommé devient administrateur : il se sert de l'application
 * sans abonnement, et voit sa part en francs. Il ne voit ni le chiffre
 * d'affaires, ni la liste des clients.
 */
export default function GestionInvestisseurs({ partsAttribuees = 0 }) {
  const [investisseurs, setInvestisseurs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [email, setEmail] = useState('');
  const [part, setPart] = useState('');
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [rechargement, setRechargement] = useState(0);

  useEffect(() => {
    let annule = false;
    Promise.all([fetchInvestisseurs(), fetchInvitations()])
      .then(([i, v]) => {
        if (annule) return;
        setInvestisseurs(Array.isArray(i) ? i : []);
        setInvitations(Array.isArray(v) ? v : []);
      })
      .catch(() => { if (!annule) setMessage({ type: 'erreur', texte: 'Liste des investisseurs indisponible.' }); });
    return () => { annule = true; };
  }, [rechargement]);

  const recharger = () => setRechargement((n) => n + 1);

  const restant = Math.max(0, 100 - Number(partsAttribuees || 0));

  const agir = async (action, succes) => {
    setEnCours(true);
    setMessage(null);
    try {
      const resultat = await action();
      setMessage({ type: 'succes', texte: succes(resultat) });
      setEmail('');
      setPart('');
      recharger();
    } catch (e) {
      // Le message vient de la base : « Aucun compte avec cette adresse »,
      // « Total des parts impossible »… Il est plus juste que tout ce qu'on
      // pourrait deviner ici.
      setMessage({ type: 'erreur', texte: e?.message || "L'opération a échoué." });
    } finally {
      setEnCours(false);
    }
  };

  const soumettre = (e) => {
    e.preventDefault();
    const adresse = email.trim();
    const pourcentage = Number(String(part).replace(',', '.'));
    if (!adresse) return setMessage({ type: 'erreur', texte: 'Indiquez une adresse e-mail.' });
    if (!(pourcentage > 0 && pourcentage <= 100)) {
      return setMessage({ type: 'erreur', texte: 'La part doit être comprise entre 0 et 100 %.' });
    }
    // `inviter_investisseur` nomme directement si le compte existe déjà, et
    // retient l'adresse sinon : un seul bouton couvre les deux cas.
    return agir(
      () => inviterInvestisseur(adresse, pourcentage),
      (r) => (r?.en_attente
        ? `Invitation retenue pour ${r.email} — ${r.part} %. Elle s'appliquera dès la création du compte.`
        : `${r.email} est désormais investisseur pour ${r.part} %.`),
    );
  };

  const messageInvitation = (adresse, pourcentage) =>
    `Bonjour,\n\nJe vous associe à Devis Facile BTP à hauteur de ${pourcentage} % du chiffre d'affaires.\n\n` +
    `Créez votre compte avec cette adresse (${adresse}) sur ${window.location.origin} : ` +
    `votre part s'appliquera automatiquement, et l'application vous sera ouverte sans abonnement.\n\n` +
    `À bientôt.`;

  return (
    <section className="rounded-xl border border-brand-primary/10 bg-white p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
          Investisseurs
        </h3>
        <p className="text-[12.5px] text-brand-text/50">
          {Number(partsAttribuees || 0)} % attribués — <strong className="text-brand-text/70">{restant} % disponibles</strong>
        </p>
      </header>

      <form onSubmit={soumettre} className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adresse e-mail de l'investisseur"
          className="h-[44px] rounded-md border border-devis-border bg-white px-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={part}
            onChange={(e) => setPart(e.target.value)}
            placeholder="part"
            className="h-[44px] w-[110px] rounded-md border border-devis-border bg-white px-3 text-right font-mono text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
          <span className="text-[13px] font-bold text-brand-text/50">%</span>
        </div>
        <button
          type="submit"
          disabled={enCours}
          className="h-[44px] rounded-md bg-brand-primary px-5 text-[13px] font-bold text-white hover:bg-brand-primary-dark disabled:opacity-50"
        >
          {enCours ? 'Envoi…' : 'Associer'}
        </button>
      </form>

      {message && (
        <p
          className={`mb-4 rounded-md px-3 py-2 text-[12.5px] ${
            message.type === 'succes'
              ? 'border border-brand-primary/20 bg-brand-primary/5 text-brand-text/75'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.texte}
        </p>
      )}

      {investisseurs.length === 0 ? (
        <p className="text-[13px] italic text-brand-text/40">Aucun investisseur associé pour l'instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-black/10 text-[11px] font-bold uppercase tracking-wider text-brand-text/45">
                <th className="py-2">Investisseur</th>
                <th className="py-2 text-right">Part</th>
                <th className="py-2 text-right">Sa part encaissée</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {investisseurs.map((i) => (
                <tr key={i.email} className="border-b border-black/[0.06]">
                  <td className="py-2.5">
                    <span className="font-bold text-brand-text">
                      {[i.prenom, i.nom].filter(Boolean).join(' ') || 'Nom non renseigné'}
                    </span>
                    <span className="ml-2 text-brand-text/50">{i.email}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{i.part} %</td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{formaterFcfa(i.montant)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => {
                        if (!window.confirm(`Retirer ${i.email} ? Sa part tombe à 0 et l'abonnement redevient dû.`)) return;
                        agir(() => retirerInvestisseur(i.email), (r) => `${r.email} a été retiré.`);
                      }}
                      className="text-[12px] font-bold text-red-500 underline hover:text-red-700 disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="mt-6 border-t border-black/[0.08] pt-4">
          <h4 className="mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-brand-text/45">
            <Icone nom="help-circle" size={14} />
            En attente de création de compte
          </h4>
          <ul className="space-y-2">
            {invitations.map((v) => (
              <li key={v.email} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span>
                  <span className="font-bold text-brand-text">{v.email}</span>
                  <span className="ml-2 font-mono text-brand-text/60">{v.part} %</span>
                </span>
                <span className="flex items-center gap-3">
                  {/* Aucun envoi automatique n'est branché : le message est
                      préparé, c'est vous qui l'envoyez. Promettre un e-mail
                      qui ne part pas serait pire que de ne rien promettre. */}
                  <a
                    href={`mailto:${encodeURIComponent(v.email)}?subject=${encodeURIComponent('Votre part dans Devis Facile BTP')}&body=${encodeURIComponent(messageInvitation(v.email, v.part))}`}
                    className="text-[12px] font-bold text-brand-primary underline"
                  >
                    Envoyer l'invitation
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(messageInvitation(v.email, v.part))}
                    className="text-[12px] font-bold text-brand-text/55 underline hover:text-brand-text"
                  >
                    Copier le message
                  </button>
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => agir(() => annulerInvitation(v.email), (r) => `Invitation de ${r.email} annulée.`)}
                    className="text-[12px] font-bold text-red-500 underline hover:text-red-700 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-[12px] leading-relaxed text-brand-text/45">
        Un investisseur associé utilise l'application sans abonnement et voit sa part en francs.
        Il ne voit ni le chiffre d'affaires, ni la liste des comptes — la base le lui refuse,
        pas seulement l'écran.
      </p>
    </section>
  );
}

function formaterFcfa(valeur) {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('fr-FR')} F`;
}
