# SportPilot 0.17.1

## Correctif de production

- activation fiable de la configuration cliente Dexie Cloud dans les builds de production ;
- priorité conservée aux variables Vite fournies par la plateforme de déploiement ;
- synchronisation réelle limitée aux pesées, conformément au périmètre de la version 0.17 ;
- ajout d’un audit empêchant une nouvelle publication sans configuration publique exploitable ;
- aucune clé privée, aucun jeton et aucun fichier local Dexie Cloud ajouté au dépôt ;
- aucune migration Dexie et aucune modification du format de sauvegarde JSON.

## Validation attendue

- `npm run lint` ;
- `npm run test` ;
- `npm run build` ;
- `npm run audit:sync-deployment` ;
- `npm run check` ;
- test sur iPhone 15 : ouverture de **Gérer le compte de synchronisation**, connexion, puis synchronisation d’une pesée entre deux installations.
