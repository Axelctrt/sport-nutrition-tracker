# SportPilot 0.15.0-alpha.9 — carnet de musculation mobile

Branche obligatoire : `feature/mobile-strength-library-ux`

Cette étape optimise les écrans de musculation utilisés en dehors d’une séance active, sans modifier les calculs ni les données :

- catalogue d’exercices avec résumé compact, recherche prioritaire, filtres avancés repliés et cartes mobiles ;
- correction du champ de recherche : saisie continue, focus conservé et filtrage local sans rechargement à chaque caractère ;
- historique de progression accessible directement depuis chaque exercice ;
- actions modifier, dupliquer, archiver et réactiver regroupées dans un menu secondaire ;
- archivage protégé par le dialogue accessible partagé et mise à jour silencieuse de la liste ;
- séances modèles avec recherche locale, résumé, démarrage prioritaire et actions secondaires repliées ;
- historique des entraînements avec résumé, filtres rapides et cartes compactes ;
- progression par exercice regroupée dans une synthèse unique avec graphiques et records ouverts à la demande ;
- records par charge convertis en cartes, sans tableau horizontal ;
- détail des séries replié dans chaque séance historique ;
- formulaires d’exercice et de séance modèle raccourcis avec options facultatives et réglages avancés repliés ;
- focalisation automatique du premier champ invalide et skeletons partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Tester prioritairement sur iPhone 15 en portrait, puis en paysage, en modes clair et sombre.
