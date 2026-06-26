# SportPilot 0.15.0 — version stable

Branche obligatoire : `release/0.15.0`

Cette livraison promeut la Release Candidate validée en version stable. Elle ne modifie aucune fonctionnalité métier ni aucune donnée utilisateur.

## Promotion intégrée

- version applicative promue vers `0.15.0` sans suffixe de préversion ;
- version stable affichée dans Paramètres et injectée dans le build Vite ;
- audit de production adapté à une version sémantique stable sans suffixe ;
- `npm run check` exécute désormais l’audit stable ;
- tests de préparation et d’affichage de version mis à jour ;
- notes de publication, checklist finale et procédure de retour arrière actualisées ;
- aucune modification du schéma Dexie 2 ;
- aucune modification du format de sauvegarde JSON 2 ;
- aucune migration de données.

## Validation

```powershell
npm install
npm run check
```

La validation manuelle finale se trouve dans `RELEASE-CHECKLIST.md`. Les points clés de la version sont détaillés dans `RELEASE-NOTES-0.15.0.md` et la procédure de retour arrière dans `ROLLBACK.md`.
