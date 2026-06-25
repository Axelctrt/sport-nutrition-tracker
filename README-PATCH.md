# SportPilot 0.14.0-alpha.4 — séances réalisées

Branche obligatoire : `feature/strength-sessions`

Cette étape ajoute le cycle de vie des entraînements de musculation :

- démarrage depuis une séance modèle ou depuis une séance libre ;
- une seule séance en cours à la fois ;
- reprise après fermeture de l’application ;
- instantanés indépendants du catalogue et des modèles ;
- ajout, retrait et réorganisation des exercices ;
- notes générales ;
- fin ou abandon avec conservation dans l’historique ;
- durée calculée automatiquement ;
- fonctionnement hors connexion dans IndexedDB.

Aucune migration Dexie supplémentaire n’est nécessaire : les tables utilisées existent depuis `0.14.0-alpha.1`.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.4` ;
- 69 fichiers de tests ;
- 268 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi ;
- audit MVP réussi.
