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
| Suivi UX post-0.37.0 — Profil, Amis et Confidentialité | **Intégré à `develop`, non publié** | Consultation en lecture seule, édition dans une surface dédiée, protection des modifications et feedback temporaire | PR #24, HEAD validé `6eed04863ff2c11611aac281fc04a91011f8a175`, merge `f66efc2798117e861c7b59b66b50ab1cd88ba6bc` |

## État publié

- SportPilot 0.37.0 est en production depuis `main`.
- Le tag annoté `v0.37.0` pointe vers
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.
- La release GitHub 0.37.0 est stable, non draft et non prerelease.
- Aucune migration D1 n’a été exécutée pour cette publication.
- La version 0.36.0 reste une référence historique de repli uniquement.

## État de développement après 0.37.0

La PR #24 est fusionnée dans `develop`, mais n’est pas présente dans `main` et
n’est pas publiée en production. Elle apporte notamment :

- un état initial en lecture seule pour le profil général et le profil social ;
- une action explicite `Modifier` ouvrant une surface d’édition dédiée ;
- la confirmation d’abandon des changements non enregistrés ;
- le statut de l’identifiant public placé directement sous son champ ;
- un feedback de succès temporaire unique ;
- la conservation du comportement cloud atomique pour l’identité sociale d’un
  espace compte.

## Prochain jalon à arbitrer

La suite fonctionnelle n’est pas encore ordonnée dans une source canonique. Le
prochain cadrage doit choisir le premier domaine à traiter entre
`Planning hebdomadaire` et `Objectifs`, ou valider un audit transverse préalable.
Aucune branche fonctionnelle ne doit être créée avant cette décision produit.

## Garde-fous de séquencement

- Les photos de progression restent locales : pas d’images cloud, sociales ou
  analysées par IA.
- Toute nouvelle évolution utilise une branche et une PR distinctes vers
  `develop`.
- Toute maintenance documentaire portant exclusivement sur l’état publié part
  de `main`, cible `main`, puis `develop` est resynchronisée depuis `main` par
  merge.
- Les évolutions intégrées uniquement à `develop` doivent rester explicitement
  distinguées de la production.
- Aucun nouveau chantier fonctionnel n’est autorisé par la clôture de la
  release 0.37.0 ni par la fusion de la PR #24.

Les détails de portée figurent dans
[`PLANNED_FEATURES.md`](PLANNED_FEATURES.md). Les limites connues qui ne
constituent pas une phase produit figurent dans
[`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md).
