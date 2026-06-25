# SportPilot 0.14.0-alpha.8 — suggestions de progression

Branche obligatoire : `feature/strength-progression`

Cette étape ajoute la progression assistée des charges de musculation :

- détection automatique des objectifs atteints à la fin d’une séance modèle ;
- vérification des séries de travail prévues, de la borne haute de répétitions et du RPE maximal ;
- proposition d’une nouvelle charge à partir de l’incrément configuré ;
- possibilité d’accepter la charge proposée ou d’en saisir une autre ;
- possibilité de refuser ou de reporter la décision ;
- mise à jour de la charge cible du modèle uniquement après acceptation ;
- conservation de l’historique des suggestions et décisions ;
- signalement des décisions en attente dans l’historique des séances ;
- absence de modification automatique des charges.

Aucune migration Dexie supplémentaire n’est nécessaire : la table `progressionSuggestions` existe depuis `0.14.0-alpha.1`.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.8` ;
- 75 fichiers de tests ;
- 298 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi ;
- audit MVP réussi.
