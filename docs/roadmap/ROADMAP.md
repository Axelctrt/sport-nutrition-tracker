# Roadmap SportPilot

Cette roadmap décrit une séquence et des conditions d’entrée, pas des dates de
livraison. Une phase planifiée n’autorise ni son implémentation, ni sa fusion,
ni son déploiement.

| Phase | Statut | Résultat attendu | Condition d’entrée |
| --- | --- | --- | --- |
| 0 — Stabilisation UX | **Actuel, intégré** | Saisie numérique stable, confirmation de séance, constructeur simplifié, libellé « Profil » | Livré sur `develop` |
| 1 — Modèle opératoire agents | **En cours** | Référentiel documentaire vérifié, ADR et règles durables | Base 0.36.0 et Phase 0 intégrée |
| 2 — Audit ciblé | **Planifié** | Rapport d’audit sans modification de fichiers | Phase 1 intégrée et autorisation explicite |
| 3 — Fondations UX partagées | **Planifié sous condition** | Primitives réutilisables et cohérentes avec Performance Glass | Audit Phase 2 accepté et périmètre autorisé |
| 4 — Photos de progression locales | **Planifié sous condition** | Suivi photo privé, local et non social | Fondations UX intégrées et périmètre autorisé |
| 5 — Déploiement contrôlé | **Idée à étudier** | Validation réelle et activation progressive | Critères d’acceptation des phases précédentes remplis |

## Garde-fous de séquencement

- La Phase 2 est un audit uniquement : aucun correctif ni refactorisation.
- La Phase 3 ne commence pas avant acceptation des conclusions de l’audit.
- La Phase 4 reste locale : pas d’images cloud, sociales ou analysées par IA
  dans le périmètre prévu.
- La Phase 5 dépend d’une décision ultérieure ; elle ne vaut pas autorisation
  de Preview, production, tag ou release.
- Chaque phase utilise une branche et une PR distinctes vers `develop`.

Les détails de portée figurent dans
[`PLANNED_FEATURES.md`](PLANNED_FEATURES.md). Les limites connues qui ne
constituent pas une phase produit figurent dans
[`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md).
