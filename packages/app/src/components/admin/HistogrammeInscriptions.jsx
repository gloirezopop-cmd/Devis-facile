import React, { useState } from 'react';

/**
 * Inscriptions par jour sur trente jours.
 *
 * Une seule série, donc aucune légende : le titre la nomme. Les barres sont
 * dessinées à la main en SVG — une bibliothèque de graphiques pèserait plus
 * lourd que tout ce fichier pour trente rectangles.
 *
 * Les jours sans inscription valent zéro et occupent leur place : c'est la
 * base qui les produit (`generate_series`). Les tasser donnerait l'illusion
 * d'une activité continue.
 */

// Bleu interactif de la charte. Vérifié sur fond blanc : bande de clarté,
// chroma et contrast >= 3:1 — il ne s'agit pas d'un choix esthétique isolé.
const COULEUR = '#2F6FDE';

const LARGEUR = 600;
const HAUTEUR = 170;
const MARGE_BASSE = 24; // place des dates
const MARGE_HAUTE = 14; // place de l'étiquette du maximum
const ECART = 3; // le séparateur de 2 px demandé entre deux barres

export default function HistogrammeInscriptions({ donnees = [] }) {
  const [survole, setSurvole] = useState(null);

  if (!Array.isArray(donnees) || donnees.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] italic text-brand-text/40">
        Pas encore d'inscription à afficher.
      </p>
    );
  }

  const valeurs = donnees.map((d) => Number(d.nombre) || 0);
  const maximum = Math.max(...valeurs, 1);
  const indexMax = valeurs.indexOf(Math.max(...valeurs));
  const hauteurUtile = HAUTEUR - MARGE_BASSE - MARGE_HAUTE;
  const largeurBarre = (LARGEUR - ECART * (donnees.length - 1)) / donnees.length;
  const xDe = (i) => i * (largeurBarre + ECART);

  const total = valeurs.reduce((s, v) => s + v, 0);

  return (
    <div className="relative">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-text/50">
          Inscriptions sur 30 jours
        </h3>
        <span className="text-[12.5px] text-brand-text/65">{total} au total</span>
      </div>

      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="w-full"
        style={{ height: 'auto' }}
        role="img"
        aria-label={`Inscriptions par jour sur trente jours, ${total} au total`}
      >
        {/* Ligne de base, discrète : elle situe, elle ne décore pas. */}
        <line
          x1="0" y1={HAUTEUR - MARGE_BASSE} x2={LARGEUR} y2={HAUTEUR - MARGE_BASSE}
          stroke="#1B1F27" strokeOpacity="0.12" strokeWidth="1"
        />

        {donnees.map((point, i) => {
          const valeur = Number(point.nombre) || 0;
          const hauteur = valeur === 0 ? 0 : Math.max(3, (valeur / maximum) * hauteurUtile);
          const y = HAUTEUR - MARGE_BASSE - hauteur;
          const actif = survole === i;

          return (
            <g key={point.jour}>
              {valeur > 0 && (
                <rect
                  x={xDe(i)} y={y} width={largeurBarre} height={hauteur}
                  rx="3"
                  fill={COULEUR}
                  fillOpacity={survole === null || actif ? 1 : 0.45}
                />
              )}
              {/* Cible de survol pleine hauteur : plus grande que la barre,
                  pour que les jours creux restent interrogeables. */}
              <rect
                x={xDe(i) - ECART / 2} y={0}
                width={largeurBarre + ECART} height={HAUTEUR - MARGE_BASSE}
                fill="transparent"
                onMouseEnter={() => setSurvole(i)}
                onMouseLeave={() => setSurvole(null)}
              />
            </g>
          );
        })}

        {/* Étiquette directe sur le seul maximum — pas un nombre sur chaque barre. */}
        {maximum > 0 && valeurs[indexMax] > 0 && (
          <text
            x={xDe(indexMax) + largeurBarre / 2}
            y={HAUTEUR - MARGE_BASSE - (valeurs[indexMax] / maximum) * hauteurUtile - 5}
            textAnchor="middle" fontSize="11" fontWeight="700" fill="#1B1F27" fillOpacity="0.7"
          >
            {valeurs[indexMax]}
          </text>
        )}

        {/* Trois dates seulement : début, milieu, fin. Trente se chevaucheraient.
            L'opacité fait 0,62 et non 0,40 : à 0,40 le contraste tombait à 2,45
            sur la carte blanche, sous le seuil de 4,5. Ces dates restaient
            visibles sur un écran de téléphone, très contrasté, et
            disparaissaient sur un écran d'ordinateur — un graphique dont on ne
            lit plus l'abscisse ne situe plus rien. */}
        {[0, Math.floor(donnees.length / 2), donnees.length - 1].map((i) => (
          <text
            key={i}
            x={Math.min(Math.max(xDe(i) + largeurBarre / 2, 18), LARGEUR - 18)}
            y={HAUTEUR - 8}
            textAnchor="middle" fontSize="11" fill="#1B1F27" fillOpacity="0.62"
          >
            {jourCourt(donnees[i].jour)}
          </text>
        ))}
      </svg>

      {survole !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg bg-brand-primary px-2.5 py-1.5 text-[12px] font-bold text-white shadow-lg"
          style={{ left: `${((xDe(survole) + largeurBarre / 2) / LARGEUR) * 100}%` }}
        >
          {jourLong(donnees[survole].jour)} — {Number(donnees[survole].nombre) || 0}
        </div>
      )}
    </div>
  );
}

function jourCourt(valeur) {
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function jourLong(valeur) {
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
}
