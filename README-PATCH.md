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
