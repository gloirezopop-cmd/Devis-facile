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

export function ajouterAvis({ nom, profession, texte, etoiles }) {
  const nouvelAvis = {
    id: `avis_${Date.now()}`,
    nom: nom?.trim() || 'Utilisateur Devis Facile',
    profession: profession?.trim() || 'Professionnel du BTP',
    texte: texte?.trim() || '',
    etoiles: Math.max(1, Math.min(5, Number(etoiles) || 5)),
    date: new Date().toISOString().split('T')[0],
    estPredefini: false,
  };

  try {
    const brut = localStorage.getItem(CLE_LOCALSTORAGE_AVIS);
    const listeActuelle = brut ? JSON.parse(brut) : [];
    const nouvelleListe = [nouvelAvis, ...listeActuelle];
    localStorage.setItem(CLE_LOCALSTORAGE_AVIS, JSON.stringify(nouvelleListe));
  } catch (err) {
    console.error('Erreur enregistrement avis :', err);
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
