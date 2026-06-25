# SportPilot 0.14.0-alpha.9 — retrait du RPE général des activités

Branche obligatoire : `feature/activity-rpe-cleanup`

Cette étape aligne le journal sportif avec le nouveau carnet de musculation :

- suppression du champ RPE des formulaires de course, natation, vélo, marche, cardio et ancienne musculation simplifiée ;
- suppression du RPE des cartes du journal, du tableau de bord et des analyses cardio ;
- maintien du RPE uniquement au niveau des séries de musculation ;
- nouvelles activités enregistrées sans RPE général ;
- conservation des valeurs RPE présentes dans les anciennes activités ;
- import et export toujours compatibles avec les sauvegardes historiques contenant un RPE ;
- modification d’une ancienne activité sans effacement de sa valeur historique en base.

Aucune migration Dexie ni nouvelle version du format de sauvegarde n’est nécessaire. Le champ historique devient facultatif et n’est plus exposé dans l’interface.

## Validation

```powershell
npm install
npm run check
```

- version `0.14.0-alpha.9` ;
- 76 fichiers de tests ;
- 301 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi avec 106 ressources précachées ;
- audit MVP réussi.
