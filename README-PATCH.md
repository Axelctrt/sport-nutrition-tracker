# SportPilot 0.20.1 — synchronisation nutritionnelle multiappareil

Branche de travail : `fix/nutrition-daily-target-uniqueness`

## Objet

Cette version complète la synchronisation sportive de 0.19.0 avec le journal nutritionnel, la bibliothèque alimentaire et le suivi hebdomadaire. Les données restent physiquement isolées par compte et l’application demeure utilisable sans connexion.

## Garanties

- synchronisation des repas, entrées alimentaires, objectifs quotidiens et statuts du journal ;
- produits utiles, recettes complètes et repas favoris transférés entre appareils ;
- déduplication déterministe des produits Open Food Facts par code-barres ;
- bilans hebdomadaires et ajustements caloriques acceptés synchronisés atomiquement ;
- objectifs quotidiens obsolètes recalculés puis propagés par le journal C1 ;
- filtrage strict par propriétaire cloud ;
- créations, modifications, suppressions et restaurations prises en charge ;
- absence de repas, ingrédients ou ajustements orphelins ;
- règles communes de comparaison et de résolution des conflits ;
- runtime Dexie Cloud `sportpilot-sync-runtime-0.20.0-v8` ;
- schéma métier Dexie v8 inchangé ;
- sauvegarde JSON v7 inchangée.

## Contrôles

```powershell
npm run lint
npm run test
npm run build
npm run audit:nutrition-sync-release
npm run release:verify
```

## Validation manuelle

1. synchroniser une journée complète entre deux navigateurs ;
2. modifier puis supprimer une entrée alimentaire ;
3. récupérer un produit manuel et un produit Open Food Facts utilisé ;
4. récupérer une recette avec tous ses ingrédients ;
5. vérifier la déduplication d’un même code-barres ;
6. synchroniser un repas favori ;
7. transférer un bilan hebdomadaire et son ajustement accepté ;
8. vérifier le recalcul et la propagation d’un objectif quotidien ;
9. confirmer le retour à `0 différence` après chaque synchronisation ;
10. tester un changement de compte sans fuite de données ;
11. vérifier la non-régression des pesées, activités, objectifs et données de musculation.

## Phase 0.21.0 D1 — Gestion du compte de synchronisation

- Les accès « Gérer le compte de synchronisation » ouvrent désormais l’écran Compte et appareils.
- La configuration publique validée de production ne peut plus être désactivée par une ancienne variable de déploiement.
- L’écran distingue le compte connecté, l’état du cloud, l’espace local actif et les actions de déconnexion/désassociation/suppression locale.
- La déconnexion et le changement de compte ne suppriment aucune donnée locale ou cloud.

## Phase 0.21.0 D2 — Import sécurisé de l’espace invité

- Une analyse préalable compare l’espace invité et l’espace du compte avant toute écriture.
- La fusion conserve la donnée la plus récente pour chaque identifiant fonctionnel.
- Les collisions de dates, repas, bilans et produits Open Food Facts sont dédupliquées.
- Les références vers les repas, produits et bilans sont remappées automatiquement.
- L’écriture dans l’espace du compte est atomique et l’espace invité reste intact.
- L’import est proposé à la connexion et reste disponible ensuite dans Compte et appareils.
