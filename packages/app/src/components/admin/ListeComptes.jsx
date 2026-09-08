import React, { useMemo, useState } from 'react';
import Icone from '../ui/Icone.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * La liste des comptes, avec de quoi écrire à ses clients.
 *
 * Deux façons de les contacter, parce qu'elles ne servent pas au même moment :
 * « Écrire » ouvre le logiciel de messagerie avec les adresses en copie
 * cachée — pratique jusqu'à une trentaine de destinataires, au-delà les
 * messageries tronquent le lien sans prévenir ; « Copier » met les adresses
 * dans le presse-papier, sans limite, pour les coller dans un vrai outil
 * d'envoi groupé.
 *
 * La copie cachée (Cci) n'est pas un détail : en copie normale, chaque client
 * verrait l'adresse de tous les autres.
 */

const LIMITE_MAILTO = 30;

export default function ListeComptes({ comptes = [] }) {
  const toast = useToast();
  const [recherche, setRecherche] = useState('');
  const [selection, setSelection] = useState(() => new Set());

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return comptes;
    return comptes.filter((c) => [c.email, c.prenom, c.nom, c.telephone, c.formule]
      .filter(Boolean)
      .some((champ) => String(champ).toLowerCase().includes(q)));
  }, [comptes, recherche]);

  const emailsSelectionnes = comptes
    .filter((c) => selection.has(c.email))
    .map((c) => c.email)
    .filter(Boolean);

  const toutAfficheEstCoche = filtres.length > 0
    && filtres.every((c) => selection.has(c.email));

  const basculerTout = () => {
    setSelection((precedente) => {
      const suivante = new Set(precedente);
      if (toutAfficheEstCoche) filtres.forEach((c) => suivante.delete(c.email));
      else filtres.forEach((c) => suivante.add(c.email));
      return suivante;
    });
  };

  const basculer = (email) => {
    setSelection((precedente) => {
      const suivante = new Set(precedente);
      if (suivante.has(email)) suivante.delete(email);
      else suivante.add(email);
      return suivante;
    });
  };

  const copier = async () => {
    const liste = (emailsSelectionnes.length ? emailsSelectionnes : filtres.map((c) => c.email))
      .filter(Boolean).join(', ');
    if (!liste) return;
    try {
      await navigator.clipboard.writeText(liste);
      toast(`${liste.split(', ').length} adresse(s) copiée(s).`);
    } catch {
      toast("Copie impossible : autorisez le presse-papier.", 'erreur');
    }
  };

  const lienEcriture = () => {
    const cibles = emailsSelectionnes.length ? emailsSelectionnes : filtres.map((c) => c.email);
    return `mailto:?bcc=${encodeURIComponent(cibles.filter(Boolean).join(','))}`;
  };

  const nombreCibles = emailsSelectionnes.length || filtres.length;

  return (
    <div className="rounded-xl border border-brand-primary/10 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-brand-primary/10 p-4">
        <h3 className="mr-auto text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
          Comptes ({comptes.length})
        </h3>

        <label className="relative">
          <span className="sr-only">Rechercher un compte</span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un email…"
            className="w-56 rounded-lg border-2 border-brand-primary/10 px-3 py-2 text-[13px] text-brand-text placeholder-brand-text/30 focus:border-brand-primary focus:ring-0"
          />
        </label>

        <button
          type="button"
          onClick={copier}
          className="flex min-h-[38px] items-center gap-1.5 rounded-lg border-2 border-brand-primary/15 px-3 text-[13px] font-bold text-brand-text/75 transition-colors hover:bg-black/5"
        >
          <Icone nom="files" size={15} /> Copier les adresses
        </button>

        <a
          href={nombreCibles > 0 && nombreCibles <= LIMITE_MAILTO ? lienEcriture() : undefined}
          onClick={(e) => {
            if (nombreCibles === 0) { e.preventDefault(); return; }
            if (nombreCibles > LIMITE_MAILTO) {
              e.preventDefault();
              toast(`${nombreCibles} destinataires : utilisez « Copier les adresses ».`, 'erreur');
            }
          }}
          className={`flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold transition-colors ${
            nombreCibles > 0 && nombreCibles <= LIMITE_MAILTO
              ? 'bg-brand-accent text-brand-primary-dark hover:brightness-105'
              : 'cursor-not-allowed bg-black/5 text-brand-text/35'
          }`}
        >
          <Icone nom="mail" size={15} /> Écrire à {nombreCibles}
        </a>
      </div>

      {emailsSelectionnes.length > 0 && (
        <p className="border-b border-brand-primary/10 bg-brand-bg px-4 py-2 text-[12.5px] text-brand-text/60">
          {emailsSelectionnes.length} compte(s) sélectionné(s).{' '}
          <button type="button" onClick={() => setSelection(new Set())} className="font-bold text-brand-interactive underline">
            Tout désélectionner
          </button>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-brand-primary/10 text-[11.5px] uppercase tracking-wider text-brand-text/45">
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={toutAfficheEstCoche}
                  onChange={basculerTout}
                  aria-label="Tout sélectionner"
                  className="h-4 w-4 accent-[#2F6FDE]"
                />
              </th>
              <th className="px-2 py-2.5 font-bold">Client</th>
              <th className="px-2 py-2.5 font-bold">Téléphone</th>
              <th className="px-2 py-2.5 font-bold">Formule</th>
              <th className="px-2 py-2.5 font-bold">Inscrit le</th>
              <th className="px-4 py-2.5 font-bold">Dernière activité</th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((compte) => (
              <tr key={compte.email} className="border-b border-brand-primary/5 last:border-0 hover:bg-brand-bg/60">
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selection.has(compte.email)}
                    onChange={() => basculer(compte.email)}
                    aria-label={`Sélectionner ${compte.email}`}
                    className="h-4 w-4 accent-[#2F6FDE]"
                  />
                </td>
                <td className="px-2 py-2.5">
                  {/* Un compte créé avant que le formulaire d'inscription
                      exige prénom et nom n'en a pas. Le dire vaut mieux
                      qu'une ligne vide qui ressemble à un bug — et c'est
                      aussi l'information qui explique qu'il ne peut pas
                      payer (Chariow exige ces champs). */}
                  {(compte.prenom || compte.nom) ? (
                    <p className="font-bold text-brand-text">
                      {[compte.prenom, compte.nom].filter(Boolean).join(' ')}
                    </p>
                  ) : (
                    <p className="text-[12.5px] italic text-brand-text/35">Nom non renseigné</p>
                  )}
                  <a href={`mailto:${compte.email}`} className="break-all text-brand-interactive hover:underline">
                    {compte.email}
                  </a>
                </td>
                <td className="px-2 py-2.5 text-brand-text/70">
                  {compte.telephone
                    ? <a href={`tel:${compte.telephone}`} className="hover:underline">{compte.telephone}</a>
                    : <span className="text-brand-text/30">—</span>}
                </td>
                <td className="px-2 py-2.5">
                  {compte.formule
                    ? <span className="rounded-full bg-devis-herite/10 px-2 py-0.5 text-[12px] font-bold text-devis-herite">{compte.formule}</span>
                    : <span className="text-brand-text/30">gratuit</span>}
                </td>
                <td className="px-2 py-2.5 text-brand-text/60">{dateCourte(compte.cree_le)}</td>
                <td className="px-4 py-2.5 text-brand-text/60">
                  {compte.derniere_activite ? dateCourte(compte.derniere_activite) : <span className="text-brand-text/30">jamais</span>}
                </td>
              </tr>
            ))}
            {filtres.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center italic text-brand-text/40">
                  Aucun compte ne correspond à cette recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function dateCourte(valeur) {
  if (!valeur) return '—';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
}
