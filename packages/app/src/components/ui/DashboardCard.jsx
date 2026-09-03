import React from 'react';
import { Link } from 'react-router-dom';
import Icone from './Icone.jsx';

/** Grande carte d'action du tableau de bord — « Apprendre » / « Faire un devis ». */
export default function DashboardCard({ to, icone, titre, texte, cta, accent = false }) {
  return (
    <Link
      to={to}
      className="group relative block overflow-hidden rounded-xl border border-brand-primary/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-brand-primary/15" />
      <span className="absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-brand-primary/15" />

      <div
        className={`grid h-11 w-11 place-items-center rounded-lg ${
          accent ? 'bg-brand-accent/15 text-brand-accent' : 'bg-brand-interactive/10 text-brand-interactive'
        }`}
      >
        <Icone nom={icone} size={22} />
      </div>

      <h3 className="mt-4 font-sans text-[17px] font-bold text-brand-text">{titre}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-brand-text/60">{texte}</p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand-interactive">
        {cta}
        <Icone nom="arrow-right" size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
