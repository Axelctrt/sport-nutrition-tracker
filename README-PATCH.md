# SportPilot 0.14.0-alpha.6 — historique par exercice

Branche obligatoire : `feature/strength-history`

Cette étape ajoute la continuité entre les séances de musculation :

- dernière performance affichée dans chaque exercice ;
- reprise rapide des séries précédentes ;
- protection contre l’écrasement de séries déjà saisies ;
- historique complet par exercice ;
- meilleure charge et volume cumulé ;
- exclusion des échauffements du volume principal ;
- accès aux séances d’origine ;
- fonctionnement hors connexion.

Aucune migration Dexie supplémentaire n’est nécessaire.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.6` ;
- 73 fichiers de tests ;
- 285 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi ;
- audit MVP réussi.
