# SportPilot 0.15.0 — fiabilité des sauvegardes

Branche recommandée : `feature/backup-reliability`

Ce patch ajoute :

- le suivi de la dernière sauvegarde JSON réussie ;
- un rappel local configurable à 7, 14 ou 30 jours ;
- sept exports CSV séparés ;
- un diagnostic technique sans données personnelles détaillées ;
- une prévisualisation enrichie avant restauration ;
- la normalisation automatique des anciens réglages et anciennes sauvegardes.

Compatibilité conservée :

- schéma Dexie v2 ;
- sauvegarde JSON v2 ;
- fonctionnement hors connexion ;
- anciennes sauvegardes SportPilot 0.15.0.

Contrôles :

```text
npm ci
npm run ci
npm run test:stability
npm run test:e2e
```
