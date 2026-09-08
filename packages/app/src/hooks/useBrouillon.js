import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { chargerBrouillon, enregistrerBrouillon, supprimerBrouillon } from '../lib/brouillonApi.js';
import {
  collecterEtatLocal, restaurerEtatLocal, effacerEtatLocal, brouillonEstVide, resumerBrouillon,
} from '../utils/brouillon.js';

/** Une fois la question posée et tranchée, on ne la repose pas à chaque page. */
const CLE_REPONSE = 'df_brouillon_repondu';

// `sessionStorage` lève dans une fenêtre privée verrouillée ou lorsque le
// navigateur bloque le stockage. Une question reposée est un désagrément ;
// une application qui refuse de démarrer en est un autre, plus grave.
function dejaRepondu() {
  try {
    return sessionStorage.getItem(CLE_REPONSE) === 'oui';
  } catch {
    return false;
  }
}
function noterLaReponse() {
  try {
    noterLaReponse();
  } catch { /* sans mémoire de session, la question se reposera : tant pis */ }
}

/** Rythme de la sauvegarde de fond, en millisecondes. */
const INTERVALLE = 45000;

/**
 * Le travail en cours suit l'utilisateur.
 *
 * Ce qu'il saisit part dans son profil : quand il quitte l'onglet, et
 * régulièrement pendant qu'il travaille. Le départ n'est pas un moment fiable
 * pour parler au réseau — un onglet fermé n'attend pas — d'où l'enregistrement
 * de fond, qui garantit qu'on ne perd au pire que quelques minutes.
 *
 * À la connexion suivante, si un brouillon existe, la question est posée une
 * fois : reprendre, ou repartir de zéro.
 *
 * Les formulaires ne sont PAS vidés au départ de l'utilisateur. Le faire
 * signifierait effacer son travail en pariant sur la réussite d'un appel
 * réseau qu'on ne peut pas attendre. Le vidage a lieu quand il choisit
 * lui-même « nouveau projet » — un geste explicite, jamais un effet de bord.
 */
export function useBrouillon() {
  const { user } = useAuth();
  const [brouillon, setBrouillon] = useState(null);
  const [question, setQuestion] = useState(false);
  const [occupe, setOccupe] = useState(false);
  // Le compte pour lequel le brouillon a déjà été demandé. Un identifiant, et
  // non un simple drapeau : se déconnecter puis se reconnecter avec un autre
  // compte doit bien relire le brouillon de ce second compte.
  const chargePour = useRef(null);

  // ── Ce qu'on trouve dans le profil à l'arrivée ──
  useEffect(() => {
    if (!user || chargePour.current === user.id) return undefined;
    chargePour.current = user.id;

    let annule = false;
    chargerBrouillon().then((trouve) => {
      if (annule || !trouve) return;
      setBrouillon(trouve);
      if (!dejaRepondu() && !brouillonEstVide(trouve.contenu)) setQuestion(true);
    });
    return () => { annule = true; };
  }, [user]);

  // ── L'enregistrement ──
  const enregistrer = useCallback(async () => {
    if (!user) return false;
    const contenu = collecterEtatLocal();
    if (brouillonEstVide(contenu)) return false;

    return enregistrerBrouillon({
      contenu,
      chemin: window.location.pathname + window.location.search,
      resume: resumerBrouillon(contenu),
    });
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    // `visibilitychange` est le dernier instant où le navigateur laisse
    // encore une requête partir. `pagehide` double la tentative pour les
    // navigateurs qui ne passent pas par « hidden ».
    const auDepart = () => {
      if (document.visibilityState === 'hidden') enregistrer();
    };
    const aLaFermeture = () => { enregistrer(); };

    document.addEventListener('visibilitychange', auDepart);
    window.addEventListener('pagehide', aLaFermeture);
    const minuteur = setInterval(enregistrer, INTERVALLE);

    return () => {
      document.removeEventListener('visibilitychange', auDepart);
      window.removeEventListener('pagehide', aLaFermeture);
      clearInterval(minuteur);
    };
  }, [user, enregistrer]);

  // ── Les deux réponses possibles ──

  /**
   * Reprendre. On repose la photo puis on recharge la page : c'est le seul
   * moyen d'être certain qu'aucun formulaire ne garde en mémoire une valeur
   * de l'ancienne session.
   */
  const continuer = useCallback(() => {
    if (!brouillon?.contenu) return;
    setOccupe(true);
    noterLaReponse();
    restaurerEtatLocal(brouillon.contenu);
    window.location.href = brouillon.chemin || '/dashboard';
  }, [brouillon]);

  /**
   * Repartir de zéro. Le travail local est effacé, le brouillon retiré du
   * profil, et la page rechargée sur un état neuf. Les projets déjà
   * enregistrés ne sont pas touchés.
   */
  const recommencer = useCallback(async () => {
    setOccupe(true);
    noterLaReponse();
    effacerEtatLocal();
    await supprimerBrouillon();
    window.location.href = '/dashboard';
  }, []);

  /** Fermer sans trancher : la question ne revient pas avant la prochaine connexion. */
  const remettreAPlusTard = useCallback(() => {
    noterLaReponse();
    setQuestion(false);
  }, []);

  return { brouillon, question, occupe, continuer, recommencer, remettreAPlusTard, enregistrer };
}
