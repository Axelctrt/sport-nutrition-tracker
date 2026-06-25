# SportPilot 0.15.0-alpha.4 — tableau de bord mobile

Branche obligatoire : `feature/mobile-dashboard-ux`

Cette étape réorganise le tableau de bord pour une consultation rapide sur téléphone, sans modifier les données ni les règles métier :

- résumé quotidien compact avec calories consommées, reste ou dépassement, protéines, glucides, lipides, pas et poids du jour ;
- séance de musculation en cours visible immédiatement avec bouton de reprise prioritaire ;
- zone de six actions rapides adaptée à une utilisation à une main ;
- accès direct à l’ajout alimentaire, au scanner, aux pas, au poids, aux activités et à la musculation ;
- saisies du poids et des pas conservées sur le tableau de bord avec confirmations locales ;
- activités et informations de calcul déplacées dans des sections repliables ;
- chargement initial assuré par le skeleton partagé ;
- restauration centralisée du défilement conservée ;
- correction du mock `requestAnimationFrame` du test de navigation afin d’éliminer les exceptions asynchrones ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Tester prioritairement sur iPhone 15 en portrait, puis en paysage, en modes clair et sombre.
