# SportPilot 0.15.0-alpha.11 — recherche et ajout alimentaire mobile

Branche obligatoire : `feature/mobile-food-search-scanner-ux`

Cette étape optimise la recherche et l’ajout d’aliments sur téléphone sans modifier les calculs ni les formats existants :

- sélection locale, Open Food Facts et scanner réunis autour du même parcours d’ajout ;
- quantité ouverte dans une feuille mobile accessible au lieu d’un formulaire ajouté en bas de page ;
- focus automatique sur la quantité, fermeture avec Échap ou appui sur l’arrière-plan, puis restitution du focus ;
- sources d’aliments affichées dans une grille mobile plus compacte ;
- skeleton partagé pendant le chargement initial du sélecteur ;
- recherche Open Food Facts organisée en deux modes exclusifs : nom ou marque, puis code-barres ;
- résumé compact des résultats locaux, affichés et disponibles dans la base externe ;
- cartes Open Food Facts raccourcies avec calories et macronutriments immédiatement lisibles ;
- scanner recentré sur la caméra, avec informations de confidentialité et saisie manuelle repliables ;
- produit détecté conservé dans une carte compacte avec réouverture directe du réglage de quantité ;
- états vides et recherches en cours harmonisés avec les composants partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde JSON.

## Validation

```powershell
npm install
npm run check
```

Tester en priorité sur iPhone 15 en portrait puis en paysage, en modes clair et sombre.
