# Checklist de publication — SportPilot 0.24.0

## Git et version

- [ ] La branche `feature/rewards-themes-0.24.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.24.0`.
- [ ] Paramètres affiche `0.24.0`.
- [ ] Aucune archive, journal ou charge utile de patch n’est suivie par Git.

## Contrôles automatiques

- [ ] `npm run audit:reward-theme-catalog` réussit.
- [ ] `npm run check` réussit.
- [ ] `npm run test:stability` réussit.
- [ ] `git diff --check` ne signale aucune erreur.

## Recette récompenses

- [ ] Le centre de récompenses affiche 50 badges.
- [ ] Les badges historiques déjà gagnés restent reconnus.
- [ ] Les règles de progression ne créent pas de doublons.
- [ ] Les progressions de badges n’affichent plus d’artefacts flottants.
- [ ] Le badge Semi-marathonien affiche un restant arrondi, par exemple `0.1`.

## Recette thèmes

- [ ] Le catalogue affiche 15 thèmes.
- [ ] L’icône œil ouvre une mini pop-up fixe centrée.
- [ ] La pop-up est identique en mode Complet et Minimaliste.
- [ ] Le bouton Prévisualiser tout est absent.
- [ ] Un thème verrouillé reste non activable durablement.
- [ ] Le mode Complet applique l’identité visuelle à l’interface.
- [ ] Le mode Minimaliste limite le thème aux accents, icônes et barres de progression.
- [ ] SportPilot classique est grisé en mode Complet et disponible en Minimaliste.
- [ ] Aucun thème n’est animé.
- [ ] Le mode sombre reste cohérent pour les thèmes accessibles, avancés et Nexus.

## Mobile et accessibilité

- [ ] La pop-up œil est centrée sur iPhone 15 sous iOS 26.
- [ ] Les boutons restent accessibles au toucher.
- [ ] Les textes restent lisibles en mode clair et sombre.
- [ ] Le catalogue ne déborde pas horizontalement.

## Publication

- [ ] La PWA se met à jour vers `0.24.0`.
- [ ] `develop` reçoit la branche avec un commit de fusion manuel.
- [ ] `main` reçoit `develop` avec un commit de publication.
- [ ] Le tag annoté `v0.24.0` est créé sur le commit publié.
- [ ] `develop` est resynchronisée avec `main`.
