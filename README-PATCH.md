# SportPilot 0.15.0 — tableau de bord personnalisable

Branche recommandée : `feature/custom-dashboard`

Cette phase permet d’adapter l’écran d’accueil aux priorités de l’utilisateur sans supprimer ni dupliquer les données :

- nouvelle route `#/settings/dashboard` ;
- accès direct depuis le tableau de bord, les Paramètres et le menu mobile ;
- quatre préréglages : Équilibré, Nutrition, Entraînement et Essentiel ;
- visibilité configurable pour cinq blocs ;
- ordre modifiable avec des boutons accessibles au clavier et sur mobile ;
- persistance locale dans `AppSettings.dashboardPreferences` ;
- normalisation automatique des anciennes bases et des préférences incomplètes ;
- conservation d’au moins un bloc visible ;
- intégration aux sauvegardes JSON v2 ;
- aucun changement du schéma Dexie et aucune dépendance supplémentaire ;
- scénario Playwright Chromium et WebKit/iPhone 15.

Blocs configurables :

1. séance de musculation en cours ;
2. résumé de la journée ;
3. actions rapides ;
4. activités du jour ;
5. objectifs et détails du calcul.

Les blocs masqués ne suppriment aucune donnée. Ils restent accessibles dans leurs écrans dédiés et peuvent être réactivés à tout moment.

Contrôles :

```text
npm run ci
npm run test:stability
npm run test:e2e
```
