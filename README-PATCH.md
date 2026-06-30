# SportPilot 0.17.1 — correctif de synchronisation en production

Branche recommandée : `hotfix/sync-production-0.17.1`

## Objet

Ce correctif rend disponible en production le compte Dexie Cloud déjà prévu par la version 0.17.0. Le build public embarque uniquement les paramètres clients nécessaires : activation du compte, URL publique de la base, activation de la synchronisation réelle des pesées et désactivation des diagnostics publics.

## Garanties

- aucune clé privée, aucun jeton et aucun fichier local Dexie Cloud versionné ;
- priorité conservée aux variables `VITE_*` éventuellement fournies par la plateforme de déploiement ;
- synchronisation limitée aux pesées ;
- aucune migration du schéma Dexie v8 ;
- aucune modification du format de sauvegarde JSON v7.

## Contrôles

```powershell
npm run lint
npm run test
npm run build
npm run audit:sync-deployment
npm run check
```

## Validation manuelle

Sur l’iPhone 15 sous iOS 26 :

1. mettre à jour la PWA ;
2. ouvrir Paramètres ;
3. sélectionner **Gérer le compte de synchronisation** ;
4. vérifier que l’écran de connexion est disponible ;
5. connecter le compte autorisé ;
6. créer une pesée puis vérifier sa réplication sur une seconde installation connectée au même compte ;
7. confirmer qu’aucune autre catégorie de données n’est synchronisée.
