# Roadmap SportPilot

Cette roadmap décrit une séquence et des conditions d’entrée, pas des dates de
livraison. Une phase planifiée n’autorise ni son implémentation, ni sa fusion,
ni son déploiement.

| Phase | Statut | Résultat attendu | Condition d’entrée |
| --- | --- | --- | --- |
| 0 — Stabilisation UX | **Intégré** | Saisie numérique stable, confirmation de séance, constructeur simplifié, libellé « Profil » | Livré sur `develop` |
| 1 — Modèle opératoire agents | **Intégré** | Référentiel documentaire vérifié, ADR et règles durables | Livré sur `develop` |
| 2 — Audit ciblé | **Terminé et accepté** | Rapport d’audit sans modification fonctionnelle | Conclusions utilisées pour la Phase 3 |
| 3 — Fondations UX partagées | **Intégré** | Correctifs UX, variantes `EmptyState`, politique de feedback, arbitre global et carte extensible pilote | Phases 3A à 3E livrées sur `develop` |
| 4 — Photos de progression locales | **Intégré sur `develop`** | Suivi photo privé, local, non social et comparateur tactile | PR #18 fusionnée après CI complète et recette iPhone/Safari validées ; pas encore déployé en production |
| 5 — Déploiement contrôlé | **Idée à étudier** | Validation réelle et activation progressive | Critères d’acceptation des phases précédentes remplis |

## Garde-fous de séquencement

- La Phase 4 reste locale : pas d’images cloud, sociales ou analysées par IA.
- L’intégration de la Phase 4 sur `develop` ne vaut pas autorisation de
  production, de tag ou de release.
- La Phase 5 dépend d’une décision ultérieure ; elle ne vaut pas autorisation
  de Preview, production, tag ou release.
- Chaque phase utilise une branche et une PR distinctes vers `develop`.

Les détails de portée figurent dans
[`PLANNED_FEATURES.md`](PLANNED_FEATURES.md). Les limites connues qui ne
constituent pas une phase produit figurent dans
[`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md).
