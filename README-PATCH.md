# SportPilot 0.15.0-alpha.6 — poids et historique mobile

Branche obligatoire : `feature/mobile-weight-history-ux`

Cette étape optimise la saisie du poids, l’évolution des pesées et l’historique général pour une utilisation mobile, sans modifier les données ni les règles métier :

- résumé compact avec dernière pesée, moyenne sur sept jours, variation récente et écart à la trajectoire ;
- formulaire de pesée plus court avec note facultative repliée et bouton fixe sous le formulaire ;
- cartes de pesée mobiles remplaçant le tableau horizontal ;
- modification directe depuis une carte et suppression via le dialogue accessible partagé ;
- sauvegarde et suppression silencieuses sans démontage de la page ;
- graphique filtrable sur 30 jours, 90 jours ou l’ensemble de l’historique ;
- historique quotidien compact avec poids, pas, activité, alimentation et état du journal ;
- périodes rapides de 7, 28 et 90 jours, complétées par une période personnalisée repliable ;
- liens directs vers le journal alimentaire, les activités et la pesée de chaque date ;
- chargement assuré par les skeletons partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Tester prioritairement sur iPhone 15 en portrait, puis en paysage, en modes clair et sombre.
