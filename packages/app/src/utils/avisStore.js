/**
 * Gestionnaire des avis et retours utilisateurs sur Devis Facile BTP.
 * Permet aux utilisateurs de donner leur avis sur le logiciel.
 */

export const AVIS_INITIALS = [
  {
    id: 'avis_1',
    nom: 'Jean-Marc D.',
    profession: 'Entrepreneur BTP',
    texte: "Avant, je passais des soirées entières sur Excel pour chiffrer mes chantiers. Aujourd'hui, Devis Facile me fait gagner un temps précieux et mes devis sont impeccables. Mes clients adorent la clarté.",
    etoiles: 5,
    date: '2026-08-15',
    estPredefini: true,
  },
  {
    id: 'avis_2',
    nom: 'Alain K.',
    profession: 'Architecte',
    texte: "La fiabilité du moteur de calcul m'a convaincu. Les sous-totaux par lots et la note de calcul détaillée me permettent de rassurer mes clients sur la transparence des prix. C'est un outil indispensable.",
    etoiles: 5,
    date: '2026-08-28',
    estPredefini: true,
  },
  {
    id: 'avis_3',
    nom: 'Franck M.',
    profession: 'Maître d\'œuvre',
    texte: "Je génère mes devis directement sur le chantier depuis ma tablette. L'export PDF est propre, pro, et l'interface est si intuitive qu'on n'a même pas besoin de formation pour la prendre en main.",
    etoiles: 5,
    date: '2026-09-02',
    estPredefini: true,
  },
];

import { supabase } from '../lib/supabaseClient.js';

const CLE_LOCALSTORAGE_AVIS = 'df_avis_utilisateurs_v1';

export function obtenirTousLesAvis() {
  let personnalises = [];
  try {
    const brut = localStorage.getItem(CLE_LOCALSTORAGE_AVIS);
    if (brut) {
      personnalises = JSON.parse(brut);
    }
  } catch (err) {
    console.error('Erreur lecture avis :', err);
  }
  return [...AVIS_INITIALS, ...personnalises];
}

export async function ajouterAvis({ nom, profession, texte, etoiles, email = null }) {
  const dateJour = new Date().toISOString().split('T')[0];
  const nouvelAvis = {
    id: `avis_${Date.now()}`,
    nom: nom?.trim() || 'Utilisateur Devis Facile',
    profession: profession?.trim() || 'Professionnel du BTP',
    texte: texte?.trim() || '',
    etoiles: Math.max(1, Math.min(5, Number(etoiles) || 5)),
    date: dateJour,
    email: email || null,
    estPredefini: false,
  };

  // 1. Sauvegarde locale immédiate pour la réactivité de l'affichage
  try {
    const brut = localStorage.getItem(CLE_LOCALSTORAGE_AVIS);
    const listeActuelle = brut ? JSON.parse(brut) : [];
    const nouvelleListe = [nouvelAvis, ...listeActuelle];
    localStorage.setItem(CLE_LOCALSTORAGE_AVIS, JSON.stringify(nouvelleListe));
  } catch (err) {
    console.error('Erreur enregistrement avis local :', err);
  }

  // 2. Sauvegarde sur Supabase pour que l'administrateur reçoive tous les retours
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      nom: nouvelAvis.nom,
      profession: nouvelAvis.profession,
      texte: nouvelAvis.texte,
      etoiles: nouvelAvis.etoiles,
      date: dateJour,
      email: email || user?.email || null,
    };

    await supabase.from('analytics_events').insert({
      user_id: user?.id ?? null,
      event: 'avis_utilisateur',
      properties: payload,
    });
  } catch (err) {
    console.debug('Enregistrement avis distant:', err);
  }

  return nouvelAvis;
}

export function supprimerAvisCustom(id) {
  try {
    const brut = localStorage.getItem(CLE_LOCALSTORAGE_AVIS);
    if (!brut) return;
    const listeActuelle = JSON.parse(brut);
    const nouvelleListe = listeActuelle.filter((a) => a.id !== id);
    localStorage.setItem(CLE_LOCALSTORAGE_AVIS, JSON.stringify(nouvelleListe));
  } catch (err) {
    console.error('Erreur suppression avis :', err);
  }
}

/**
 * Récupère les retours utilisateurs envoyés sur le serveur (pour le tableau d'administration).
 */
export async function fetchAvisServeur() {
  // 1. Tenter via la fonction RPC sécurisée
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('avis_utilisateurs_admin');
    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData;
    }
  } catch (errRpc) {
    console.debug('RPC avis_utilisateurs_admin non disponible:', errRpc);
  }

  // 2. Tenter la lecture directe depuis analytics_events
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event', 'avis_utilisateur')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((evt) => {
        const p = evt.properties || {};
        return {
          id: evt.id,
          nom: p.nom || 'Utilisateur',
          profession: p.profession || 'Professionnel',
          texte: p.texte || '',
          etoiles: Number(p.etoiles) || 5,
          email: p.email || null,
          date: p.date || evt.created_at?.split('T')[0],
          source: 'Serveur (Supabase)',
        };
      });
    }
  } catch (err) {
    console.debug('Erreur lecture directe analytics_events:', err);
  }

  // 3. Fallback sur le stockage local + avis prédéfinis
  const tous = obtenirTousLesAvis();
  return tous.map((a) => ({
    ...a,
    source: a.estPredefini ? 'Témoignage public' : 'Local',
  }));
}

