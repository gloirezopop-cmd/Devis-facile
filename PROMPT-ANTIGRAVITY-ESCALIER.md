# Prompt à coller dans Antigravity

---

Tu travailles sur le monorepo **Devis Facile** (`packages/moteur` = moteur de calcul en JS
pur, `packages/app` = interface React). Objectif : remplacer le bloc `escalier`, qui demande
aujourd'hui un volume déjà calculé à la main et estime l'acier par un ratio forfaitaire de
100 kg/m³, par un vrai calcul en trois niveaux — géométrie → béton et coffrage → ferraillage.

**Lis d'abord `SPEC-ESCALIER.md` à la racine du dépôt. C'est le cahier des charges complet :
formules, modèle de données, emplacements exacts dans le code, et une recette chiffrée dont
les valeurs ont été produites en exécutant le moteur réel. Suis-le section par section.**

## Six contraintes non négociables

Elles priment sur toute optimisation que tu pourrais juger meilleure. Si l'une te semble
fausse, dis-le avant de coder au lieu de la contourner.

1. **Tout l'acier passe par `calculerBlocArmature()`** (`packages/moteur/src/armature.js:44`).
   N'écris aucun second calcul de poids. Le moteur facture des barres commerciales entières
   de 12 m, pas du mètre linéaire net.
2. **Ne remplace pas `poidsAuMetre()` par la formule φ²/162.** Elle donne 0,8889 kg/m pour un
   Ø12, la table du guide dit 0,880. La table fait foi partout dans le projet.
3. **N'ajoute pas le recouvrement dans la longueur développée `Ld`.**
   `calculerBlocArmature()` le gère déjà au-delà de 11,5 m ; l'ajouter le compte deux fois.
   `Ld` = géométrie − 2 × enrobage + crochets (+ ancrage en appui), rien d'autre.
4. **Ne change pas la règle de comptage des files.** C'est `ceil(dimension / espacement) + 1`
   partout dans le moteur (semelles, dalles). Légèrement sécuritaire, et cohérent.
5. **Pertes sur acier : régime « pièce », `Q × (1 + P)`**, jamais `Q / (1 − P)` qui est réservé
   aux consommables (ciment, sable, gravier, béton).
6. **Le logiciel ne choisit jamais un diamètre en silence.** Le métré part d'un Ø et d'un
   espacement saisis ou hérités des règles ; il ne les détermine pas. Aucun calcul de
   structure (M_Ed, A_s) dans cette tâche — voir §7 de la spec.

## Ce qu'il faut réutiliser plutôt que réécrire

Une paillasse est une dalle inclinée `L × b` ; un palier est une dalle `L_palier × l_palier`.
La nappe croisée existe déjà dans `extractionsArmatures.dalles`
(`packages/moteur/src/metre.js:655`). **Extrais-en une fonction `nappeCroisee()` et appelle-la
depuis `dalles` et depuis `escalier`** — pas de troisième implémentation. Les tests de dalles
existants doivent passer à l'identique après extraction.

## Ordre de travail

Un commit par étape, chaque étape verte avant la suivante :

1. Géométrie pure + tests (§1 et §8 de la spec).
2. Volumes béton + tests (§2).
3. Extraction de `nappeCroisee()`, tests de dalles inchangés (§4).
4. Ferraillage escalier branché sur `calculerBlocArmature()` + tests (§4 et §8).
5. Coffrage géométrique et contrôle contre le ratio de 12 m²/m³ (§3).
6. Interface React en dernier, le moteur doit être vert avant (§6).

## Critères d'acceptation

- La recette chiffrée du §8 tombe **au chiffre près** : `L = 2,712656 m`,
  `V_total = 0,9328 m³`, principales `9 files / Ld 2,872656 / 3 barres / 31,680 kg`,
  total nappe inférieure `55,968 kg` soit un ratio de 60,0 kg/m³ qui **doit** déclencher
  l'avertissement de contrôle, et `80,256 kg` soit 86,0 kg/m³ avec les chapeaux.
- Le mode `volume` historique survit : le cas `{ volume: 3.5, nombre: 1 }` de
  `packages/moteur/test/elevation.test.js:75` rend toujours 3,5 m³ et 350 kg par ratio.
- Chaque correction porte un test nommé. C'est la règle du projet.
- `npm test` passe en entier, sans test existant modifié pour l'occasion.

Si une donnée manque ou si la spec est ambiguë sur un point, pose la question au lieu de
choisir en silence : ce moteur produit des devis que quelqu'un signe.
