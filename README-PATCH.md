# SportPilot 0.29.0 — release sociale privée

Branche de finalisation : `release/0.29.0`

SportPilot 0.29.0 clôt la roadmap sociale A1 à A26. La release transforme le socle cloud préparé en 0.28.x en un module d’amis utilisable avec de vrais comptes, des permissions par ami, un fil d’activité filtré, une fiche détaillée et des contrôles stricts de sécurité.

## Contenu livré

- identité sociale canonique et handles uniques ;
- annuaire limité à la recherche exacte ;
- demandes d’amis complètes avec nettoyage des états terminaux ;
- amitiés bilatérales, suppression et recréation ;
- source unique de partage configurée par ami ;
- modes Aucun, Résumé et Personnalisé ;
- sélection granulaire des champs musculation et cardio ;
- snapshots sociaux filtrés stockés dans D1 ;
- fil social déterministe et fiche détaillée sécurisée ;
- synchronisation résiliente hors ligne ;
- authentification et autorisation renforcées sur toutes les routes ;
- recette réelle ordinateur et iPhone 15 finalisée.

## Versions techniques

- application : `0.29.0` ;
- AppDatabase locale : Dexie v10 ;
- sauvegarde JSON : v9 ;
- runtime Dexie Cloud prototype : v14 ;
- contrat de snapshot : `0.29.0-a3` ;
- migrations D1 déjà requises : `0001` et `0002` ;
- migration supplémentaire A26 : aucune.

## Validation attendue

```text
npm run audit:social-complete-acceptance
npm run audit:social-release-finalization
npm run audit:social-release
npm run audit:release
npm run audit:repository
npm run lint
npm run test
npm run build
npm run check
npm run test:stability
npm audit
```

## Publication attendue

1. Committer la finalisation sur `release/0.29.0`.
2. Fusionner manuellement la branche dans `develop`.
3. Relancer les contrôles de release sur `develop`.
4. Fusionner manuellement `develop` dans `main`.
5. Construire puis déployer `main` sur Cloudflare Pages.
6. Vérifier la production avec les deux comptes réels.
7. Créer et pousser le tag annoté `v0.29.0`.
8. Resynchroniser `develop` avec `main`.
