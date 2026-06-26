# SportPilot 0.15.0 — fiabilité des produits alimentaires

Branche recommandée : `feature/food-product-refresh`

Cette phase améliore la qualité et la maintenance de la bibliothèque alimentaire locale :

- actualisation manuelle des produits Open Food Facts enregistrés ;
- conservation automatique des corrections locales champ par champ ;
- remplacement explicite des corrections après confirmation ;
- détection des doublons par code-barres ou par nom et marque normalisés ;
- possibilité de confirmer un doublon de nom, mais blocage d’un code-barres déjà utilisé ;
- libellé de portion, par exemple `1 pot`, `1 tranche` ou `1 dose` ;
- fibres et sel visibles dans la bibliothèque et les aperçus du journal ;
- import Open Food Facts enrichi avec le libellé de portion ;
- sauvegarde JSON v2 compatible avec les nouveaux champs facultatifs ;
- scénario Playwright Chromium et WebKit iPhone pour les portions et doublons.

Architecture retenue :

- aucune nouvelle table Dexie ;
- aucun nouvel index ;
- les corrections locales sont stockées dans `FoodProduct.localOverrides` ;
- la date de dernière récupération reste portée par `source.fetchedAt` ;
- les anciennes données et sauvegardes restent valides sans migration.

Contrôles :

```text
npm run ci
npm run test:stability
npm run test:e2e
```
