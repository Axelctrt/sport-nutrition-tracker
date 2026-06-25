# SportPilot 0.14.0-alpha.7 — statistiques de musculation

Branche obligatoire : `feature/strength-analytics`

Cette étape ajoute les analyses de progression par exercice :

- records personnels de charge, répétitions et volume ;
- charge moyenne par série de travail ;
- estimation du 1RM avec la formule d’Epley ;
- comparaison avec la séance précédente ;
- graphiques de charge, volume et répétitions ;
- records de répétitions pour chaque charge ;
- exclusion des séries d’échauffement des statistiques principales.

Aucune migration Dexie supplémentaire n’est nécessaire.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.7` ;
- 74 fichiers de tests ;
- 290 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi ;
- audit MVP réussi.
