# SportPilot 0.15.0-alpha.7 — analyses et bilan hebdomadaire mobile

Branche obligatoire : `feature/mobile-analytics-review-ux`

Cette étape optimise les analyses sur douze semaines et le bilan hebdomadaire pour une utilisation mobile, sans modifier les calculs ni les données :

- vue d’ensemble compacte regroupant course, natation, adhérence calorique et poids récent ;
- graphiques rangés dans des sections ouvertes à la demande ;
- détails hebdomadaires convertis en cartes et suppression des tableaux horizontaux ;
- raccourcis directs entre analyses, bilan hebdomadaire et historique ;
- proposition calorique affichée avant les informations secondaires ;
- résumé hebdomadaire compact avec poids, évolution, adhérence et score ;
- détail de l’adhérence, ajustements acceptés et anciens bilans placés dans des sections repliables ;
- historique des décisions présenté sous forme de cartes mobiles ;
- acceptation ou refus sans rechargement complet ni disparition du bilan ;
- chargement assuré par les skeletons partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Tester prioritairement sur iPhone 15 en portrait, puis en paysage, en modes clair et sombre.
