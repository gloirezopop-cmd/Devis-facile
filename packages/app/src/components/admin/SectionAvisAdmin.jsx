import React, { useMemo, useState, useEffect } from 'react';
import Icone from '../ui/Icone.jsx';
import { fetchAvisServeur } from '../../utils/avisStore.js';

/**
 * Section d'administration pour consulter et analyser les retours et avis utilisateurs.
 * Permet au fondateur de comprendre les points forts et axes d'amélioration du produit.
 */
export default function SectionAvisAdmin() {
  const [avis, setAvis] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreEtoiles, setFiltreEtoiles] = useState('tous');

  const chargerAvis = async () => {
    setChargement(true);
    const data = await fetchAvisServeur();
    setAvis(Array.isArray(data) ? data : []);
    setChargement(false);
  };

  useEffect(() => {
    chargerAvis();
  }, []);

  // Calcul des métriques globales
  const stats = useMemo(() => {
    if (!avis.length) return { moyenne: 0, total: 0, parEtoile: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    const total = avis.length;
    const somme = avis.reduce((acc, a) => acc + (Number(a.etoiles) || 0), 0);
    const moyenne = (somme / total).toFixed(1);

    const parEtoile = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    avis.forEach((a) => {
      const note = Math.round(Number(a.etoiles) || 5);
      if (parEtoile[note] !== undefined) {
        parEtoile[note] += 1;
      }
    });

    return { moyenne, total, parEtoile };
  }, [avis]);

  // Filtrage selon la recherche et la note
  const avisFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return avis.filter((a) => {
      if (filtreEtoiles !== 'tous' && Number(a.etoiles) !== Number(filtreEtoiles)) {
        return false;
      }
      if (!q) return true;
      return (
        (a.nom && a.nom.toLowerCase().includes(q)) ||
        (a.profession && a.profession.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.texte && a.texte.toLowerCase().includes(q))
      );
    });
  }, [avis, recherche, filtreEtoiles]);

  return (
    <section className="mb-8 rounded-xl border border-brand-primary/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Icone nom="message-square" size={18} />
          </div>
          <div>
            <h2 className="font-sans text-[16px] font-extrabold text-brand-text">
              Avis et suggestions utilisateurs
            </h2>
            <p className="text-[12px] text-brand-text/55">
              Retours formulés par les utilisateurs pour guider les améliorations du logiciel
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={chargerAvis}
          disabled={chargement}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-brand-primary/15 bg-white px-3.5 text-[12.5px] font-bold text-brand-text/75 hover:bg-black/5 transition-colors"
        >
          <Icone nom="refresh" size={14} className={chargement ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Résumé chiffré */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-black/[0.02] p-3 border border-black/5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/45">
            Total des avis
          </span>
          <span className="font-mono text-2xl font-extrabold text-brand-text tabular-nums">
            {stats.total}
          </span>
        </div>

        <div className="rounded-lg bg-black/[0.02] p-3 border border-black/5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/45">
            Note moyenne
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-2xl font-extrabold text-brand-text tabular-nums">
              {stats.moyenne}
            </span>
            <span className="text-[12px] font-bold text-brand-text/40">/ 5</span>
            <Icone nom="star" size={16} className="text-amber-400 fill-amber-400 ml-1" />
          </div>
        </div>

        <div className="rounded-lg bg-black/[0.02] p-3 border border-black/5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/45">
            5 étoiles
          </span>
          <span className="font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
            {stats.parEtoile[5]}
          </span>
        </div>

        <div className="rounded-lg bg-black/[0.02] p-3 border border-black/5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/45">
            4 étoiles ou moins
          </span>
          <span className="font-mono text-2xl font-extrabold text-amber-600 tabular-nums">
            {stats.total - stats.parEtoile[5]}
          </span>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, métier, email ou mot-clé…"
            className="w-full h-11 rounded-lg border border-brand-primary/15 bg-white pl-9 pr-3 text-[13px] text-brand-text placeholder:text-brand-text/40 focus:border-brand-primary focus:outline-none"
          />
          <div className="absolute left-3 top-3 text-brand-text/40 pointer-events-none">
            <Icone nom="search" size={16} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {['tous', 5, 4, 3].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setFiltreEtoiles(val)}
              className={`min-h-[44px] px-3 rounded-lg text-[12px] font-bold transition-colors ${
                filtreEtoiles === val
                  ? 'bg-brand-primary text-white'
                  : 'bg-black/5 text-brand-text/65 hover:bg-black/10'
              }`}
            >
              {val === 'tous' ? 'Toutes notes' : `${val} étoiles`}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des retours */}
      <div className="mt-5 space-y-3">
        {chargement ? (
          <p className="py-10 text-center text-[13px] text-brand-text/45">
            Chargement des avis utilisateurs…
          </p>
        ) : avisFiltres.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/15 p-8 text-center text-[13px] text-brand-text/50">
            Aucun avis ne correspond aux critères de recherche.
          </div>
        ) : (
          avisFiltres.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-brand-primary/10 bg-brand-bg/40 p-4 transition-colors hover:bg-brand-bg"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black/5 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 font-bold text-brand-primary text-xs">
                    {item.nom ? item.nom.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13.5px] text-brand-text">
                        {item.nom}
                      </span>
                      {item.profession && (
                        <span className="text-[12px] text-brand-text/50">
                          ({item.profession})
                        </span>
                      )}
                    </div>
                    {item.email && (
                      <span className="text-[11.5px] text-brand-text/45 font-mono">
                        {item.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((etoile) => (
                      <Icone
                        key={etoile}
                        nom="star"
                        size={15}
                        className={etoile <= Number(item.etoiles) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                      />
                    ))}
                    <span className="ml-1 font-mono text-xs font-bold text-brand-text/70 tabular-nums">
                      {item.etoiles}/5
                    </span>
                  </div>

                  <span className="text-[11.5px] text-brand-text/45">
                    {item.date || '—'}
                  </span>

                  {item.source && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold ${
                        item.source.includes('Serveur')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.source}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-[13.5px] leading-relaxed text-brand-text/85">
                {item.texte}
              </p>

              {item.email && (
                <div className="mt-3 flex justify-end">
                  <a
                    href={`mailto:${item.email}?subject=${encodeURIComponent('Votre retour sur Devis Facile BTP')}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-brand-primary/15 bg-white px-2.5 py-1 text-[11.5px] font-bold text-brand-primary hover:bg-brand-primary/5 transition-colors"
                  >
                    <Icone nom="send" size={13} />
                    Répondre par e-mail
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
