# SportPilot 0.23.0 — synchronisation automatique résiliente

Branche de publication : `feature/automatic-sync-resilience-0.23.0`

## Livraison

La version 0.23.0 publie les lots F1 à F4 :

- orchestrateur commun pour les neuf rubriques ;
- file séquentielle et verrouillage par compte ;
- synchronisation automatique explicitement autorisée ;
- déclencheurs au démarrage, au premier plan, au retour du réseau, après connexion, restauration et modification locale ;
- historique local séparé par compte ;
- divergences examinables sans remplacement silencieux ;
- reprise ciblée après échec ;
- protection contre les résultats tardifs d’un ancien compte ;
- interruption maîtrisée lors de la fermeture ;
- audits, documentation et passage à la version stable 0.23.0.

## Versions

- application : `0.23.0` ;
- runtime Dexie Cloud : v10 ;
- runtime local : `sportpilot-sync-runtime-0.20.0-v10` ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

Aucune migration n’est introduite. Une authentification OTP peut uniquement être demandée lors de la première ouverture du runtime v10 sur un appareil.

## Vérification

```powershell
npm ci
npm run release:verify
npm run test:e2e
npm run audit:automatic-sync-release
git diff --check
```

La publication doit être validée sur ordinateur et iPhone 15 sous iOS 26 avant la fusion manuelle dans `main` et la création du tag `v0.23.0`.
