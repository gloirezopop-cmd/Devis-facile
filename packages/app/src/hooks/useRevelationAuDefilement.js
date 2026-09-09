import { useEffect, useRef, useState } from 'react';

/**
 * Révèle un élément quand il entre dans l'écran, une seule fois.
 *
 * Un `IntersectionObserver` plutôt qu'un écouteur de défilement : le navigateur
 * fait le calcul hors du fil principal, et la page ne saccade pas sur un
 * téléphone modeste. L'observation s'arrête dès la première apparition — une
 * section qui rejoue son animation à chaque passage devient vite fatigante.
 *
 * Si l'utilisateur a demandé moins d'animations, ou si son navigateur ne connaît
 * pas l'API, l'élément est visible d'emblée : jamais de contenu caché faute
 * d'avoir pu déclencher son apparition.
 */
export function useRevelationAuDefilement({ seuil = 0.15, marge = '0px 0px -60px 0px' } = {}) {
  const reference = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = reference.current;
    if (!element) return undefined;

    const mouvementReduit =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (mouvementReduit || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            setVisible(true);
            observateur.disconnect();
          }
        }
      },
      { threshold: seuil, rootMargin: marge },
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, [seuil, marge]);

  return { reference, visible };
}
