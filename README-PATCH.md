# SportPilot 0.15.0 — planification hebdomadaire des entraînements

Branche recommandée : `feature/weekly-planning`

Cette phase ajoute un planning de musculation local et hors connexion :

- planification d’une séance modèle à une date précise ;
- vue semaine du lundi au dimanche ;
- navigation vers la semaine précédente, courante ou suivante ;
- report d’une séance avec conservation de la date initiale ;
- marquage d’une séance comme non réalisée ;
- démarrage direct depuis le planning ;
- transformation de la même entrée planifiée en séance réellement effectuée ;
- affichage séparé de la date prévue et de la date réelle lorsque celles-ci diffèrent ;
- export CSV et sauvegarde JSON des métadonnées de planification ;
- parcours Playwright sur Chromium et WebKit iPhone.

Architecture retenue :

- aucune nouvelle table Dexie ;
- une séance planifiée utilise `WorkoutSession` avec le statut `planned` ;
- au démarrage, cette même séance passe à `inProgress` et conserve `plannedDate` ;
- les séances non réalisées utilisent le statut `skipped` ;
- le modèle et ses exercices sont figés au moment de la planification.

Compatibilité conservée :

- schéma Dexie v2 ;
- sauvegarde JSON v2 ;
- anciennes séances sans métadonnées de planification ;
- PWA et fonctionnement hors connexion ;
- aucune dépendance supplémentaire.

Contrôles :

```text
npm ci
npm run ci
npm run test:stability
npm run test:e2e
```
