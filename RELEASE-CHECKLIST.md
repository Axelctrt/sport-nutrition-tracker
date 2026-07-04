# Checklist de publication — SportPilot 0.25.0

## Git et version

- [ ] La branche `feature/photo-nutrition-0.25.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.25.0`.
- [ ] Paramètres affiche `0.25.0`.
- [ ] `vite.config.ts` ne contient pas de host Cloudflare temporaire.
- [ ] Aucune archive, journal ou charge utile de patch n’est suivie par Git.

## Contrôles automatiques

- [ ] `npm run audit:photo-nutrition` réussit.
- [ ] `npm run check` réussit.
- [ ] `npm run test:stability` réussit.
- [ ] `git diff --check` ne signale aucune erreur.

## Recette photo nutrition

- [ ] Le bouton `Photo` est visible depuis chaque repas du journal alimentaire.
- [ ] Le sélecteur natif permet de prendre ou choisir une photo.
- [ ] L’aperçu, le nom et la taille du fichier sont visibles.
- [ ] La croix supprime la photo sélectionnée et remet la page dans un état propre.
- [ ] L’analyse sans photo affiche un message clair et ne crée aucune entrée.
- [ ] Un fichier non image est refusé.
- [ ] L’analyse affiche une estimation locale prudente avec confiance faible.
- [ ] L’utilisateur peut corriger aliment, quantité, calories, protéines, glucides et lipides.
- [ ] L’entrée est ajoutée au bon repas avec les valeurs corrigées.
- [ ] L’image n’est pas persistée comme donnée utilisateur.

## Régressions nutrition

- [ ] L’ajout alimentaire classique fonctionne.
- [ ] Open Food Facts fonctionne.
- [ ] Le scanner code-barres fonctionne.
- [ ] Les totaux nutritionnels restent cohérents.

## Mobile et accessibilité

- [ ] La page photo est utilisable sur iPhone 15 sous iOS 26.
- [ ] Les boutons restent accessibles au toucher.
- [ ] Le clavier ne masque pas les actions principales.
- [ ] Les textes restent lisibles en mode clair et sombre.
- [ ] Le parcours ne déborde pas horizontalement.

## Arbitrage budget JS

- [ ] Le dépassement éventuel du budget JavaScript est accepté comme arbitrage UX pour 0.25.0.
- [ ] L’optimisation du bundle est reportée à une phase technique dédiée.

## Publication

- [ ] La PWA se met à jour vers `0.25.0`.
- [ ] `develop` reçoit la branche avec un commit de fusion manuel.
- [ ] `main` reçoit `develop` avec un commit de publication.
- [ ] Le tag annoté `v0.25.0` est créé sur le commit publié.
- [ ] `develop` est resynchronisée avec `main`.
