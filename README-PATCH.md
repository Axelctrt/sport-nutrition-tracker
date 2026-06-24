# Patch SportPilot 0.13.0-alpha.7

Branche recommandée : `feature/barcode-scanner-poc`

Ce patch ajoute un premier scanner caméra isolé afin de valider la compatibilité réelle des codes-barres alimentaires sur téléphone avant son branchement complet à Open Food Facts.

## Fonctionnalités

- bibliothèque `@ericblade/quagga2` ;
- formats EAN-13, EAN-8, UPC-A et UPC-E ;
- caméra arrière privilégiée ;
- démarrage après action explicite ;
- confirmation après deux lectures identiques ;
- arrêt après détection ;
- arrêt lors du démontage, du changement de page ou du passage en arrière-plan ;
- erreurs distinctes : permission refusée, caméra absente, caméra occupée, contexte non sécurisé ;
- saisie manuelle de secours ;
- route `/food/barcode-scanner` accessible depuis le sélecteur d’aliments ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Vérification

```powershell
npm install
npm run check
```

Résultat attendu : 56 fichiers de tests et 223 tests réussis.

## Test caméra

La caméra requiert HTTPS. Pour un test sur téléphone, utilise un déploiement HTTPS ou un tunnel temporaire Cloudflare. L’adresse locale `http://192.168.x.x:5173` permet d’ouvrir l’application mais pas d’utiliser `getUserMedia`.
