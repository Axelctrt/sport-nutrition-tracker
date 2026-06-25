# SportPilot 0.14.0 — release du carnet de musculation

Branche obligatoire : `release/0.14.0`

Cette release consolide la série 0.14 :

- version stable `0.14.0` ;
- catalogue local d’exercices et exercices personnalisés ;
- séances modèles et séances réalisées ;
- séries avec charge, répétitions, type, notes et RPE ;
- historique, statistiques, records et estimation du 1RM ;
- suggestions de progression avec décision manuelle ;
- retrait non destructif du RPE général des activités ;
- migration Dexie vers le schéma 2 ;
- sauvegardes JSON version 2 compatibles avec les versions antérieures ;
- version de l’application centralisée depuis `package.json` ;
- audit automatique des métadonnées, schémas et fichiers de release ;
- documentation des calculs de musculation ;
- raccourci PWA vers le carnet de musculation.

## Validation

```powershell
npm install
npm run check
```

Résultats validés : 78 fichiers de tests, 305 tests, lint sans erreur ni avertissement, build PWA avec 106 ressources précachées, audit MVP et audit de release réussis.
