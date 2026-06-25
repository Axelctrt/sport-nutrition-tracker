# SportPilot 0.15.0-alpha.8 — bibliothèque alimentaire mobile

Branche obligatoire : `feature/mobile-food-library-ux`

Cette étape optimise les aliments locaux, les recettes et les repas favoris pour une utilisation mobile, sans modifier les calculs ni les données :

- résumés compacts pour les trois bibliothèques alimentaires ;
- recherche locale instantanée et filtres rapides pour les aliments ;
- cartes mobiles avec action principale visible et menu d’actions secondaires ;
- archivage et suppressions protégés par le dialogue accessible partagé ;
- mutations silencieuses sans démontage de page ni remontée en haut ;
- restauration du défilement et mise en évidence après création ou modification ;
- formulaires d’aliments et de recettes raccourcis avec détails facultatifs repliés ;
- ajout d’un repas favori au journal depuis sa carte, avec choix de la date et du repas dans une feuille mobile ;
- skeletons et états vides partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Tester prioritairement sur iPhone 15 en portrait, puis en paysage, en modes clair et sombre.
