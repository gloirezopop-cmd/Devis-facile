export const toNumber = (val) => {
  if (typeof val === 'string') {
    if (val.trim() === '') return undefined;
    const num = Number(val);
    return !isNaN(num) ? num : val;
  }
  return val;
};

export const sanitize = (arr) => arr.map(item => {
  const sanitized = {};
  for (const [key, value] of Object.entries(item)) {
    if (Array.isArray(value)) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = toNumber(value);
    }
  }
  return sanitized;
});

export function preparerSaisiePourMoteur(niveau, state) {
  return {
    niveaux: [niveau],
    fouilles: sanitize((state.fouilles || []).filter(f => f.niveauId === niveau.id)),
    fouilleFilante: sanitize((state.fouilleFilante || []).filter(f => f.niveauId === niveau.id)),
    betonProprete: sanitize((state.betonProprete || []).filter(bp => bp.niveauId === niveau.id)),
    semelles: sanitize((state.semelles || []).filter(s => s.niveauId === niveau.id)),
    longrines: sanitize((state.longrines || []).filter(l => l.niveauId === niveau.id)),
    poteaux: sanitize((state.colonnes || []).filter(c => c.niveauId === niveau.id)),
    escalier: sanitize((state.escaliers || []).filter(e => e.niveauId === niveau.id)),
    maconnerie: sanitize((state.maconneries || []).filter(m => m.niveauId === niveau.id)),
    murSoubassement: sanitize((state.soubassements || []).filter(ms => ms.niveauId === niveau.id)),
    // Meme saisie, deux blocs : la surface pour le devis, les agglos pleins et
    // le mortier pour les recettes. Le moteur fait l'equivalence perimetre/longueur.
    soubassement: sanitize((state.soubassements || []).filter(ms => ms.niveauId === niveau.id)),
    moellon: sanitize((state.moellons || []).filter(m => m.niveauId === niveau.id)),
    chapeEgalisation: sanitize((state.chapeEgalisations || []).filter(c => c.niveauId === niveau.id)),
    sousPavement: sanitize((state.sousPavements || []).filter(s => s.niveauId === niveau.id)),
    nivellement: sanitize((state.nivellement || []).filter(n => n.niveauId === niveau.id)),
    carrelage: sanitize((state.carrelages || []).filter(c => c.niveauId === niveau.id)),
    enduits: sanitize((state.enduits || []).filter(e => e.niveauId === niveau.id)),
    peinture: sanitize((state.peintures || []).filter(p => p.niveauId === niveau.id)),
    faience: sanitize((state.faiences || []).filter(f => f.niveauId === niveau.id)),
    autresOuvrages: sanitize((state.autresOuvrages || []).filter(a => a.niveauId === niveau.id)),
    dalles: sanitize((state.dalles || []).filter(d => d.niveauId === niveau.id)),
    plancherHourdis12: sanitize((state.plancherHourdis12 || []).filter(p => p.niveauId === niveau.id)),
    plancherHourdis16: sanitize((state.plancherHourdis16 || []).filter(p => p.niveauId === niveau.id)),
    charpenteBois: sanitize((state.charpentes || []).filter(c => c.niveauId === niveau.id)),
    couvertureToles: sanitize((state.couverturesToles || []).filter(c => c.niveauId === niveau.id)),
    acrotere: sanitize((state.terrasses || []).filter(t => t.niveauId === niveau.id)),
    formePente: sanitize((state.terrasses || []).filter(t => t.niveauId === niveau.id))
  };
}
