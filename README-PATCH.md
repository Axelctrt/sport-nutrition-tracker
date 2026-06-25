# SportPilot 0.15.0-alpha.3 — journal alimentaire mobile

Branche obligatoire : `feature/mobile-food-journal-ux`

Cette étape optimise le journal alimentaire pour un usage mobile sans modifier les données ni les règles nutritionnelles :

- résumé nutritionnel journalier compact ;
- quatre repas autonomes avec calories et macronutriments regroupés ;
- bouton `Ajouter` immédiatement visible dans chaque repas ;
- modification rapide d’une quantité sans quitter le journal ;
- duplication et suppression reléguées dans les actions secondaires ;
- options rares du repas et de la journée repliées ;
- rafraîchissements silencieux conservant le contenu et la position ;
- retour automatique au bon repas après ajout, scan ou recette ;
- restauration du défilement et mise en évidence temporaire de l’entrée ajoutée ;
- confirmation unique par toast pour les actions alimentaires ;
- dialogue accessible à la place de la confirmation native pour la suppression ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Tester prioritairement sur iPhone en portrait avec une journée contenant plusieurs aliments.
