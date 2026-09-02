# Devis Facile BTP

Logiciel de métré et de devis pour les professionnels du BTP — Cameroun, FCFA.

Plan de construction complet (analyse du classeur, les huit lots, la ligne éditoriale) :
<https://claude.ai/code/artifact/d6a34315-26f5-485c-af3f-e134307abf66>

---

## Où on en est

| Lot | Objet | État |
| --- | --- | --- |
| 000 | Dépôt et harnais de test | **fait** |
| 100 | Moteur de métré | **fait** — 19 tests passent |
| 200 | Recettes matériaux | à faire |
| 300 | Valorisation et devis | à faire |
| 400 | Interface de saisie | à faire |
| 500 | Comptes et sauvegarde | à faire |
| 600 | Exports PDF et Excel | à faire |
| 700 | Abonnement et mise en ligne | à faire |

## Vérifier les calculs

```
npm test
```

Aucune installation n'est nécessaire : le moteur n'a aucune dépendance et les
tests utilisent le lanceur intégré à Node 24.

## Ce que contient le moteur

```
packages/moteur/
├── src/regles.js     dosages, ratios, pertes, taux — des DONNÉES, pas du code
├── src/metre.js      les onze blocs de métré
└── test/metre.test.js
```

Le moteur est une **fonction pure** : il reçoit une saisie, il rend des volumes et
des surfaces. Il ne connaît ni le navigateur, ni la base de données, ni l'heure
qu'il est. C'est ce qui permet de le vérifier contre vos devis réels avant
d'avoir écrit la moindre ligne d'interface.

```js
import { calculerMetre, REGLES_DEFAUT } from './packages/moteur/src/index.js';

const { blocs, avertissements } = calculerMetre(
  {
    semelles: [{ repere: 'S1', nombre: 5, longueur: 1.7, largeur: 1.7, hauteur: 0.5 }],
    maconnerie: [
      {
        repere: 'MUR 1',
        longueur: 210.27,
        hauteur: 3.2,
        ouvertures: [{ type: 'fenetre', nombre: 7, largeur: 1.5, hauteur: 1 }],
      },
    ],
  },
  REGLES_DEFAUT,
);

blocs.semelles.total;          // 7.225
blocs.maconnerie.total;        // 662.364
blocs.semelles.lignes[0].trace; // formule, entrées, résultat, unité
```

### Les deux règles tenues partout

1. **Une dimension manquante rend `null`, jamais `0`.** Un zéro se propage en
   silence dans un devis ; un `null` se voit.
2. **Toute valeur saisie est consommée ou signalée.** Une dimension qui n'entre
   dans aucune formule produit un avertissement — c'est exactement le piège qui
   rendait le béton de propreté cinq fois trop cher dans le classeur.

## Ce que les tests vérifient

**Les totaux du classeur, là où le classeur a raison.** Fouilles 175,8315 m³ ·
semelles 54,4232 m³ · longrines 15,9672 m³ · poteaux 7,83 m³ · maçonnerie
672,864 m². Toute divergence est une régression.

**Le cas de référence du guide.** Surface brute 177,855 m², six déductions —
fenêtres, impostes, portes et poteaux noyés — surface nette **143,325 m²**.

**Les défauts corrigés.** Chaque test porte le nom du défaut du classeur qu'il
corrige :

| Test | Défaut du classeur |
| --- | --- |
| `n1` | `METRE!H28` ignorait la largeur du béton de propreté → 2,745 m³ au lieu de 0,549 m³ |
| `n3` | La colonne « Périm. » n'avait ni formule ni total → plinthes toujours à zéro |
| `n5` | `MATERIAUX!B43:B48` ne lisait que 6 murs sur les 10 saisissables |

## Les blocs disponibles

`fouilles` · `betonProprete` · `semelles` · `longrines` · `poteaux` · `poutres` ·
`dalles` · `enduits` · `remblai` · `maconnerie` · `carrelage`

Les neuf premiers partagent la même table déclarative dans `metre.js` : ajouter
un ouvrage revient à ajouter une entrée, pas une fonction.

## Prochaine étape

**Lot 200 — les recettes matériaux.** Du volume au bon de commande : béton
méthode Dreux, agglos, aciers par barres ou par ratio, coffrage par ratio,
enduits, carrelage, plinthes. Avec les deux régimes de pertes tenus séparés —
`/(1−P)` pour les consommables, `×(1+P)` pour les pièces.

Cible de vérification : retrouver les **612 sacs de ciment** et les
**7 939 agglos** du classeur, au sac et à l'agglo près.

## Deux points à arbitrer

- **Taux de pertes par défaut** — 5 % dans le classeur, 10 à 15 % dans le guide.
  Réglé à 5 % pour l'instant, dans `regles.js`.
- **TVA** — 19,25 % dans le classeur, absente des deux devis réels examinés.
  Réglée à 0 % par défaut, à activer au cas par cas.
