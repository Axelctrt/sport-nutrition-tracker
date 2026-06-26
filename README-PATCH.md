# SportPilot 0.15.0-alpha.13 — finitions de saisie et panneaux mobiles

Branche obligatoire : `feature/mobile-form-interaction-polish`

Cette étape de finition corrige trois comportements transversaux avant la Release Candidate :

- tous les champs natifs de date, heure, mois ou semaine respectent strictement la largeur de leur conteneur sur Safari iOS ;
- leur hauteur est alignée sur les autres champs partagés ;
- un champ numérique contenant uniquement `0` se vide automatiquement lorsqu’il reçoit le focus ;
- si aucune nouvelle valeur n’est saisie, `0` est restauré au moment de quitter le champ ;
- ce comportement couvre les séries, charges, répétitions, poids, pas et les autres champs numériques similaires ;
- l’ouverture d’une section repliable recentre doucement le contenu développé dans la fenêtre ;
- les animations sont désactivées lorsque `prefers-reduced-motion` est actif ;
- le test de retour après ajout d’une activité vérifie directement l’appel de navigation, sa destination et l’état complet transmis au journal ;
- la page d’édition transmet explicitement cet état à `navigate`, même lorsqu’une branche locale provenait d’une ancienne base ;
- le helper de navigation possède désormais ses propres tests de régression ;
- le schéma Dexie reste en version 2 ;
- le format de sauvegarde JSON reste en version 2.

## Validation

```powershell
npm install
npm run check
```

Tester en priorité les champs de date en portrait et paysage, les séries préremplies à zéro, la saisie du poids et l’ouverture de plusieurs sections repliables sur iPhone 15. Le test d’activité ne dépend plus de la façon dont `MemoryRouter` expose temporairement `location.state` selon l’environnement.
