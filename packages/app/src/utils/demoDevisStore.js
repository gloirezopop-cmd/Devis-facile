/**
 * Gestionnaire des exemples de devis (Démo & Devis effectués).
 * Permet aux utilisateurs de consulter les devis d'exemple et à l'administrateur
 * d'en publier de nouveaux directement depuis son interface.
 */

export const DEVIS_PARTICULIER_DEFAUT = {
  ordreLots: ['terrassement', 'fondation', 'elevation', 'dalle', 'finition', 'charpente', 'couverture', 'piedsDroit'],
  lots: {
    terrassement: {
      nom: 'TERRASSEMENT',
      sousTotal: 252183,
      lignes: [
        { designation: 'Installation chantier', unite: 'fft', quantite: 1, pu: 0, pt: 0 },
        { designation: 'Déblais', unite: 'Tonne', quantite: 26.079, pu: 3000, pt: 78237 },
        { designation: 'Remblais', unite: 'Tonne', quantite: 57.982, pu: 3000, pt: 173946 }
      ]
    },
    fondation: {
      nom: 'FONDATION',
      sousTotal: 1340576,
      lignes: [
        { designation: 'Ciment', unite: 'sac', quantite: 68, pu: 5500, pt: 374000 },
        { designation: 'Gravier', unite: 'Tonne', quantite: 20, pu: 13500, pt: 270000 },
        { designation: 'Sable', unite: 'Tonne', quantite: 15, pu: 8500, pt: 127500 },
        { designation: 'Eau', unite: 'Litre', quantite: 2592, pu: 18, pt: 46656 },
        { designation: 'Bois de coffrage', unite: 'm3', quantite: 2.241, pu: 120000, pt: 268920 },
        { designation: 'Clous', unite: 'Kg', quantite: 7, pu: 2700, pt: 18900 },
        { designation: 'Armature HA10', unite: 'Pièce', quantite: 10, pu: 6000, pt: 60000 },
        { designation: 'Armature HA8', unite: 'Pièce', quantite: 3, pu: 4800, pt: 14400 },
        { designation: 'Fil à ligaturer', unite: 'Kg', quantite: 6, pu: 1200, pt: 7200 },
        { designation: 'Moellon', unite: 'Tonne', quantite: 15, pu: 10200, pt: 153000 }
      ]
    },
    elevation: {
      nom: 'ELEVATION',
      sousTotal: 2697882,
      lignes: [
        { designation: 'Blocs de 15', unite: 'Pièce', quantite: 1971, pu: 300, pt: 591300 },
        { designation: 'Ciment', unite: 'sac', quantite: 123, pu: 5500, pt: 676500 },
        { designation: 'Gravier', unite: 'Tonne', quantite: 10, pu: 13500, pt: 135000 },
        { designation: 'Sable', unite: 'Tonne', quantite: 30, pu: 8500, pt: 255000 },
        { designation: 'Eau', unite: 'litre', quantite: 3369, pu: 18, pt: 60642 },
        { designation: 'Bois de coffrage', unite: 'm3', quantite: 3.942, pu: 120000, pt: 473040 },
        { designation: 'Clous', unite: 'kg', quantite: 12, pu: 2700, pt: 32400 },
        { designation: 'Armature HA10', unite: 'Pièce', quantite: 44, pu: 6000, pt: 264000 },
        { designation: 'Armature HA8', unite: 'Pièce', quantite: 37, pu: 4800, pt: 177600 },
        { designation: 'Fil à ligaturer', unite: 'kg', quantite: 27, pu: 1200, pt: 32400 }
      ]
    },
    dalle: {
      nom: 'DALLE',
      sousTotal: 3122604,
      lignes: [
        { designation: 'Ciment', unite: 'sac', quantite: 74, pu: 5500, pt: 407000 },
        { designation: 'Gravier', unite: 'Tonne', quantite: 20, pu: 13500, pt: 270000 },
        { designation: 'Sable', unite: 'Tonne', quantite: 10, pu: 8500, pt: 85000 },
        { designation: 'Eau', unite: 'litre', quantite: 1838, pu: 18, pt: 33084 },
        { designation: 'Bois de coffrage', unite: 'm3', quantite: 7.236, pu: 120000, pt: 868320 },
        { designation: 'Clous', unite: 'kg', quantite: 20, pu: 2700, pt: 54000 },
        { designation: 'Armature HA10', unite: 'Pièce', quantite: 218, pu: 6000, pt: 1308000 },
        { designation: 'Fil à ligaturer', unite: 'kg', quantite: 81, pu: 1200, pt: 97200 }
      ]
    },
    finition: {
      nom: 'FINITION',
      sousTotal: 4009312,
      lignes: [
        { designation: 'Carreaux', unite: 'Carton', quantite: 63, pu: 12000, pt: 756000 },
        { designation: 'Faïence', unite: 'Carton', quantite: 30, pu: 12000, pt: 360000 },
        { designation: 'Ciment gris', unite: 'sac', quantite: 56, pu: 5500, pt: 308000 },
        { designation: 'Ciment colle', unite: 'kg', quantite: 634, pu: 1800, pt: 1141200 },
        { designation: 'Sable', unite: 'Tonne', quantite: 20, pu: 8500, pt: 170000 },
        { designation: 'Eau', unite: 'litre', quantite: 1784, pu: 18, pt: 32112 },
        { designation: 'Latex', unite: 'kg', quantite: 72, pu: 7200, pt: 518400 },
        { designation: 'Peinture classique', unite: 'Litre', quantite: 58, pu: 9000, pt: 522000 },
        { designation: 'Chaux', unite: 'kg', quantite: 96, pu: 2100, pt: 201600 }
      ]
    },
    charpente: {
      nom: 'CHARPENTE',
      sousTotal: 363660,
      lignes: [
        { designation: 'Madrier 5/10', unite: 'm3', quantite: 1.128, pu: 120000, pt: 135360 },
        { designation: 'Panne 5/5', unite: 'm3', quantite: 0.3, pu: 120000, pt: 36000 },
        { designation: 'Clous', unite: 'kg', quantite: 25, pu: 2700, pt: 67500 },
        { designation: 'Peinture à bois', unite: 'litre', quantite: 16, pu: 7800, pt: 124800 }
      ]
    },
    couverture: {
      nom: 'COUVERTURE',
      sousTotal: 410100,
      lignes: [
        { designation: 'Tôles (BG 28)', unite: 'Pièce', quantite: 54, pu: 6600, pt: 356400 },
        { designation: 'Tôles faîtière', unite: 'pièce', quantite: 5, pu: 4800, pt: 24000 },
        { designation: 'Clous', unite: 'kg', quantite: 11, pu: 2700, pt: 29700 }
      ]
    },
    piedsDroit: {
      nom: 'PIEDS DROIT',
      sousTotal: 813900,
      lignes: [
        { designation: 'Chevron 5/5', unite: 'm3', quantite: 1.5, pu: 120000, pt: 180000 },
        { designation: 'Chevron 7/7', unite: 'm3', quantite: 4.9, pu: 120000, pt: 588000 },
        { designation: 'Clous', unite: 'kg', quantite: 17, pu: 2700, pt: 45900 }
      ]
    }
  },
  cascade: { totalMateriaux: 13010217, imprevus: 650511, transport: 650511, mainOeuvre: 3903065, honorairesArchi: 1040817, honorairesInge: 1040817 },
  total: 20295938
};

export const DEVIS_ENTREPRISE_DEFAUT = {
  ordreLots: ['preliminaire', 'fondation', 'elevation', 'finition', 'toiture'],
  niveaux: {
    preliminaire: {
      nom: 'INSTALLATION CHANTIER ET IMPLANTATION',
      sousTotal: 600000,
      lignes: [
        { designation: 'Installation chantier et Implantation', unite: 'fft', quantite: 1, pu: 600000, pt: 600000 }
      ]
    },
    fondation: {
      nom: 'FONDATION',
      sousTotal: 3822542,
      lignes: [
        { designation: 'Déblaiement', unite: 'm3', quantite: 17.386, pu: 10350, pt: 179845 },
        { designation: 'Remblaiement', unite: 'm3', quantite: 38.655, pu: 4656, pt: 179977 },
        { designation: 'Béton de propreté dosé à 150kg/m3', unite: 'm3', quantite: 1.398, pu: 120000, pt: 167760 },
        { designation: 'Semelles isolées en B.A dosé à 350kg/m3', unite: 'm3', quantite: 0.441, pu: 180000, pt: 79380 },
        { designation: 'Socle des colonnes en B.A dosé à 350kg/m3', unite: 'm3', quantite: 0.148, pu: 180000, pt: 26640 },
        { designation: 'Fondation en moellon', unite: 'm3', quantite: 10.953, pu: 180000, pt: 1971540 },
        { designation: 'Chape d\'égalisation en béton dosé à 250 Kg/m3', unite: 'm3', quantite: 1.217, pu: 150000, pt: 182550 },
        { designation: 'Béton de sous pavement dosé à 250 Kg/m3', unite: 'm3', quantite: 6.899, pu: 150000, pt: 1034850 }
      ]
    },
    elevation: {
      nom: 'ELEVATION',
      sousTotal: 3560340,
      lignes: [
        { designation: 'Colonnes en B.A dosé à 350kg/m3', unite: 'm3', quantite: 0.804, pu: 180000, pt: 144720 },
        { designation: 'Ceinture en B.A dosé à 350kg/m3', unite: 'm3', quantite: 2.504, pu: 180000, pt: 450720 },
        { designation: 'Maçonnerie de blocs creux de 15', unite: 'm2', quantite: 143.32, pu: 7500, pt: 1074900 },
        { designation: 'Dalle en B.A dosé à 350kg/m3', unite: 'm3', quantite: 10.5, pu: 180000, pt: 1890000 }
      ]
    },
    finition: {
      nom: 'FINITION',
      sousTotal: 5676840,
      lignes: [
        { designation: 'Le revêtement de sol et mur', unite: 'm2', quantite: 630.76, pu: 9000, pt: 5676840 }
      ]
    },
    toiture: {
      nom: 'CHARPENTE ET TOITURE',
      sousTotal: 1370130,
      lignes: [
        { designation: 'Charpente', unite: 'm3', quantite: 1.428, pu: 420000, pt: 599760 },
        { designation: 'Toiture', unite: 'm2', quantite: 51.358, pu: 15000, pt: 770370 }
      ]
    }
  },
  cascade: { totalTravaux: 15029852, mainOeuvre: 4508956, honorairesArchi: 1202388, honorairesInge: 1202388 },
  total: 21943584
};

export const EXEMPLES_DEVISE_INITIALES = [
  {
    id: 'maison-plain-pied',
    titre: 'Maison de plain-pied (Standard)',
    description: 'Devis type d\'une villa de plain-pied avec bordereau de matériaux et prix tout compris.',
    particulier: DEVIS_PARTICULIER_DEFAUT,
    entreprise: DEVIS_ENTREPRISE_DEFAUT,
    datePublication: '2026-09-01',
    estPredefini: true,
  },
];

const CLE_LOCALSTORAGE = 'df_exemples_devis_custom';

export function obtenirTousLesExemplesDevis() {
  let personnalises = [];
  try {
    const brut = localStorage.getItem(CLE_LOCALSTORAGE);
    if (brut) {
      personnalises = JSON.parse(brut);
    }
  } catch (err) {
    console.error('Erreur lecture exemples de devis :', err);
  }
  return [...EXEMPLES_DEVISE_INITIALES, ...personnalises];
}

export function ajouterExempleDevis(titre, description, devisParticulier, devisEntreprise) {
  const nouveau = {
    id: `demo_${Date.now()}`,
    titre: titre || 'Devis de référence',
    description: description || 'Devis certifié et validé par la plateforme.',
    particulier: devisParticulier,
    entreprise: devisEntreprise,
    datePublication: new Date().toISOString(),
    estPredefini: false,
  };

  try {
    const brut = localStorage.getItem(CLE_LOCALSTORAGE);
    const listeActuelle = brut ? JSON.parse(brut) : [];
    const nouvelleListe = [nouveau, ...listeActuelle];
    localStorage.setItem(CLE_LOCALSTORAGE, JSON.stringify(nouvelleListe));
  } catch (err) {
    console.error('Erreur enregistrement exemple devis :', err);
  }

  return nouveau;
}

export function supprimerExempleDevisCustom(id) {
  try {
    const brut = localStorage.getItem(CLE_LOCALSTORAGE);
    if (!brut) return;
    const listeActuelle = JSON.parse(brut);
    const nouvelleListe = listeActuelle.filter((d) => d.id !== id);
    localStorage.setItem(CLE_LOCALSTORAGE, JSON.stringify(nouvelleListe));
  } catch (err) {
    console.error('Erreur suppression exemple devis :', err);
  }
}
