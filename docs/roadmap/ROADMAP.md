# Roadmap SportPilot

Cette roadmap décrit une séquence et des conditions d’entrée, pas des dates de
livraison. Une phase planifiée n’autorise ni son implémentation, ni sa fusion,
ni son déploiement.

| Phase | Statut | Résultat attendu | Condition d’entrée |
| --- | --- | --- | --- |
| 0 — Stabilisation UX | **Publié en production** | Saisie numérique stable, confirmation de séance, constructeur simplifié, libellé « Profil » | Inclus dans la base publiée |
| 1 — Modèle opératoire agents | **Publié en production** | Référentiel documentaire vérifié, ADR et règles durables | Inclus dans la base publiée |
| 2 — Audit ciblé | **Terminé et accepté** | Rapport d’audit sans modification fonctionnelle | Conclusions utilisées pour la Phase 3 |
| 3 — Fondations UX partagées | **Publié en production 0.37.0** | Correctifs UX, variantes `EmptyState`, politique de feedback, arbitre global et carte extensible pilote | Phases 3A à 3E validées |
| 4 — Photos de progression locales | **Publié en production 0.37.0** | Suivi photo privé, local, non social et comparateur tactile | PR #18, CI complète et recette iPhone/Safari validées |
| 5 — Déploiement contrôlé | **Terminé** | Publication de `main`, tag annoté, release GitHub stable et production validée | PR #21, commit `84fea3d49e68c7d190c00d505502a5c4aa2e672a`, tag `v0.37.0` |

## État publié

- SportPilot 0.37.0 est en production depuis `main`.
- Le tag annoté `v0.37.0` pointe vers
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.
- La release GitHub 0.37.0 est stable, non draft et non prerelease.
- Aucune migration D1 n’a été exécutée pour cette publication.
- La version 0.36.0 reste une référence historique de repli uniquement.

## Garde-fous de séquencement

- Les photos de progression restent locales : pas d’images cloud, sociales ou
  analysées par IA.
- Le déplacement du statut de disponibilité de l’identifiant public sous son
  champ reste une amélioration UX non bloquante.
- Toute nouvelle évolution utilise une branche et une PR distinctes vers
  `develop`.
- Toute maintenance documentaire post-release part de `main`, cible `main`,
  puis `develop` est resynchronisée depuis `main` par merge.
- Aucun nouveau chantier fonctionnel n’est autorisé par la clôture de la
  release 0.37.0.

Les détails de portée figurent dans
[`PLANNED_FEATURES.md`](PLANNED_FEATURES.md). Les limites connues qui ne
constituent pas une phase produit figurent dans
[`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md).
