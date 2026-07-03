# SportPilot 0.22.0 — continuité complète du compte

Branche de publication : `feature/full-account-continuity-0.22.0`

## Livraison

La version 0.22.0 publie les lots E1 à E4 :

- profil et réglages partageables ;
- récompenses, thèmes visuels SportPilot, missions et routines ;
- centre de synchronisation unifié pour neuf rubriques ;
- restauration complète après nouvelle installation ;
- audits finaux, documentation et passage de version.

## Versions

- application : `0.22.0` ;
- runtime Dexie Cloud : v10 ;
- runtime local : `sportpilot-sync-runtime-0.20.0-v10` ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

E4 ne contient aucune migration. Une authentification OTP peut être demandée uniquement si l’appareil n’a pas encore ouvert le runtime v10 introduit pendant E2.

## Vérification

```powershell
npm ci
npm run release:verify
npm run test:e2e
npm run audit:full-account-continuity-release
```

La publication doit ensuite être validée sur ordinateur et iPhone 15 sous iOS 26 avant la fusion manuelle dans `main` et la création du tag `v0.22.0`.

## Développement 0.23.0 F1

La branche `feature/automatic-sync-resilience-0.23.0` introduit l’orchestrateur commun sans activer les déclencheurs automatiques. Les opérations manuelles du centre passent par une file séquentielle verrouillée par compte.

Vérification ciblée :

```powershell
npx vitest run src/application/sync/syncOrchestrator.test.ts src/features/settings/components/UnifiedSyncCenterPanel.test.tsx src/app/syncOrchestratorReadiness.test.ts
npm run audit:sync-orchestrator
```

## Développement 0.23.0 F2

F2 active une automatisation maîtrisée lorsque SportPilot est ouvert : analyse au démarrage, au retour au premier plan, au retour du réseau, après connexion et après restauration. Les modifications locales sont regroupées par anti-rebond et ne sont écrites automatiquement que depuis une analyse propre.

```powershell
npx vitest run src/application/sync/automaticSyncController.test.ts src/features/settings/components/AutomaticSyncSettingsPanel.test.tsx src/app/automaticSyncReadiness.test.ts
npm run audit:automatic-sync
```
