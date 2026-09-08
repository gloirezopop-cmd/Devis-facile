import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

/**
 * Un groupe de CarteBloc ne montre qu'un seul bloc grand ouvert à la fois —
 * les autres se réduisent à un résumé d'une ligne. Sans ça, une section comme
 * Fondations empile 9 blocs toujours dépliés et la page n'en finit plus de
 * s'allonger, surtout au clavier sur téléphone.
 *
 * Remplir un bloc puis cliquer « OK, valider » le réduit et ouvre le suivant
 * tout seul. Cliquer sur un bloc déjà réduit le rouvre pour le corriger ;
 * le revalider à ce moment-là referme et repart d'où l'utilisateur était,
 * pas seulement du suivant dans la liste.
 *
 * `ids` est l'ordre des blocs (leurs `titre`, qui sert aussi de clé). Passer
 * `key={niveauActifId}` sur le provider depuis la section appelante : changer
 * de niveau doit repartir du premier bloc, pas garder la progression d'un
 * autre niveau du même type.
 */
const AccordionCtx = createContext(null);

export function AccordionProvider({ ids, children }) {
  const [openId, setOpenId] = useState(ids[0] ?? null);
  const [doneIds, setDoneIds] = useState(() => new Set());
  const resumeRef = useRef(null);

  const openBloc = useCallback((id) => {
    setOpenId((current) => {
      if (current && current !== id) resumeRef.current = current;
      return id;
    });
  }, []);

  const validateBloc = useCallback((id) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setOpenId(() => {
      if (resumeRef.current && resumeRef.current !== id) {
        const target = resumeRef.current;
        resumeRef.current = null;
        return target;
      }
      const suivant = ids[ids.indexOf(id) + 1];
      return suivant ?? null;
    });
  }, [ids]);

  return (
    <AccordionCtx.Provider value={{ openId, doneIds, openBloc, validateBloc }}>
      {children}
    </AccordionCtx.Provider>
  );
}

/** null hors d'un AccordionProvider : CarteBloc reste alors toujours ouvert (comportement historique, inchangé). */
export function useAccordion() {
  return useContext(AccordionCtx);
}
