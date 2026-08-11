# Roadmap SportPilot

Cette roadmap décrit une séquence et des conditions d’entrée, pas des dates de
livraison. Une phase planifiée n’autorise ni son implémentation, ni sa fusion,
ni son déploiement.

## Sources de vérité

- dépôt : `Axelctrt/sport-nutrition-tracker` ;
- production fonctionnelle 0.37.0 :
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a` ;
- `develop` constaté avant la Phase 0 V1 :
  `eec97bf9ac776b519d051329551836853894fd82` ;
- `develop` final après le Lot 8 et la clôture de #63 :
  `3eff34a73cc40d98d3de2ab947ac8b45bfae5f01` ;
- RC1 : `1.0.0-rc.1`, déployée une fois puis rejetée dans #142 ;
- correctif PWA RC1 : PR #145, intégré dans
  `develop@465f927c6ed17dd7537bfa83d6fe11e9329825ea` ;
- candidate en préparation : `1.0.0-rc.2`, journal #147 ;
- gate de recette CORS Dexie Cloud : #146 ;
- documents de détail :
  [`V1_READINESS_PLAN.md`](V1_READINESS_PLAN.md) et
  [`PLANNED_FEATURES.md`](PLANNED_FEATURES.md).

Les HEAD doivent être revérifiés sur GitHub à chaque reprise.

## État publié

SportPilot 0.37.0 est publié avec :

- fondations UX partagées ;
- photos de progression privées et locales ;
- Dexie v12 additive ;
- sauvegarde JSON v10 ;
- fonctionnement PWA, hors ligne et isolation des espaces validés ;
- tag annoté `v0.37.0` et release GitHub stable ;
- aucune migration D1 pour cette publication.

Le HEAD de `main` peut contenir une maintenance documentaire postérieure au SHA
fonctionnel déployé. Les deux références ne doivent pas être confondues.

## Intégré à `develop`, non publié

Les évolutions suivantes sont intégrées dans `develop` mais ne sont pas
présentes dans la production 0.37.0 :

| Lot | Références | Résultat |
| --- | --- | --- |
| Profil, Amis et Confidentialité | PR #24 | lecture seule prioritaire, surfaces d’édition protégées et feedback temporaire |
| Planning sportif | PR #45 | semaine prioritaire, action `Planifier` et création dédiée |
| Objectifs de progression | PR #47 | édition protégée, métrique verrouillée et anti-double comptage |
| Objectif vers action | PR #49 | destinations contextuelles explicites sans création automatique |
| Menus d’actions | PR #51, #53, #54, #56, #57 et #59 | primitive adaptative et migrations Sport, Nutrition et Progression |
| OTP fluide | PR #62 | champ natif partagé, huit cellules et vérification automatique |

Le chantier parent #50 est fonctionnellement terminé. Le renvoi OTP était une
option conditionnelle, pas un reliquat obligatoire.

## Décision stratégique

Le prochain objectif n’est pas un nouveau cycle de fonctionnalités. Le
périmètre existant doit être rendu cohérent, stabilisé puis évalué pour une
publication SportPilot `1.0.0`.

SportPilot sera considéré **V1-ready** lorsque l’audit de readiness aura
démontré que le périmètre existant est cohérent, stable, sûr pour les données,
mobile-first, hors ligne, testable et publiable. La V1 officielle exige ensuite
une candidate validée et une publication explicitement autorisée.

## Trajectoire V1

| Phase | Statut | Résultat attendu | Condition de sortie |
| --- | --- | --- | --- |
| 0 — Réconciliation documentaire | **Terminée** | sources canoniques alignées, PR #60 remplacée, #50 clôturé administrativement | validation et intégration terminées |
| 1 — Audit transverse | **Terminée** | matrice complète UX, comportements, accessibilité, hors ligne et données | rapport #63 validé par le propriétaire |
| 2 — Fondations partagées manquantes | **Terminée** | primitives démontrées nécessaires par l’audit | contrats et pilotes validés |
| 3 — Normalisation par domaines | **Terminée** | migrations en lots indépendants, sans changement métier implicite | recettes de chaque lot validées |
| 4 — Convergence transverse | **Terminée** | inventaire final, exceptions justifiées et cohérence globale démontrée | rapport de convergence accepté |
| 5 — Audit de readiness V1 | **Terminée** | décision V1 prête et dettes séparées | preuve transverse finale validée, #63 clôturée |
| 6 — Corrections bloquantes V1 | **Non requise** | aucun blocage V1 critique ou significatif reproductible restant dans #63 | décision de readiness validée |
| 7 — Release Candidate V1 | **En cours** | gel fonctionnel, version candidate, documentation et recette complète | validation propriétaire ; Preview séparément autorisée |
| 8 — Publication SportPilot V1 | **Planifiée** | `1.0.0`, tag, release et production | contrôles post-déploiement validés |
| 9 — Cycle produit post-V1 | **Après V1 uniquement** | nouvelles fonctions et optimisations | nouveau cadrage explicite |

## Prochaine action immédiate

1. préparer `1.0.0-rc.2` depuis
   `develop@465f927c6ed17dd7537bfa83d6fe11e9329825ea` ;
2. valider le diff documentaire et de plomberie de release ;
3. exécuter les tests, audits et la CI GitHub Actions complète ;
4. conserver #103, #136, #137, #138 et #141 comme dettes/gates séparés ;
5. conserver #146 ouvert jusqu'à la future recette compte/synchronisation ;
6. arrêter avant toute Preview Cloudflare, fusion, action sur `main`, tag,
   release ou production.

## Garde-fous permanents

- mobile-first, 320 à 412 px avant enrichissement desktop ;
- local-first et hors ligne ;
- continuité et isolation des données ;
- aucune formule calorique modifiée sans audit et validation ;
- aucun thème validé modifié sans validation ;
- aucune extension IA sans validation ;
- recommandations UX hors périmètre séparées ;
- aucune migration Dexie ou D1 implicite ;
- aucune fusion, release ou production sans autorisation explicite.

Les détails de portée et de méthode figurent dans
[`V1_READINESS_PLAN.md`](V1_READINESS_PLAN.md). Les limites connues figurent
dans [`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md).
