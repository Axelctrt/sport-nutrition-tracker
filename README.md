# SportPilot 0.37.0

SportPilot 0.37.0 est la release candidate issue de `develop`. Elle ajoute le suivi privé des photos de progression et consolide plusieurs parcours mobiles validés en recette réelle. La version de production reste 0.36.0 tant qu’une publication séparée n’a pas été autorisée.

L’application reste mobile-first, local-first, utilisable hors ligne et installable en PWA.

## Principales évolutions

### Photos de progression

- choix d’une photo via le sélecteur natif du navigateur ;
- date, vue, poids et note facultatifs ;
- redimensionnement, compression et suppression des métadonnées dans le navigateur ;
- galerie locale, filtres et comparateur tactile avant/après ;
- suppression individuelle ou complète ;
- export et restauration d’une archive photo séparée de la sauvegarde JSON générale ;
- continuité après rechargement et hors ligne.

### Ajustements UX issus de la recette

- fondations UX et feedbacks asynchrones partagés ;
- fermeture cohérente du sélecteur d’exercices ;
- vérification automatique de la disponibilité de l’identifiant public ;
- choix sélectionnés visuellement ;
- carte Sport journalière compacte ;
- calories et trois macronutriments visibles sur l’Accueil.

Le rapprochement visuel du statut de disponibilité avec le champ d’identifiant public reste une amélioration non bloquante planifiée pour une passe UX ultérieure.

## Confidentialité

- aucune synchronisation cloud des photos de progression ;
- aucune publication sociale des photos ;
- aucune analyse corporelle par IA ;
- aucune inclusion des photos dans la sauvegarde JSON générale ;
- aucune modification des formules caloriques.

## Stockage et versions techniques

- Application : `0.37.0`.
- AppDatabase locale : Dexie v12, migration additive.
- Sauvegarde JSON générale : v10.
- Runtime Dexie Cloud prototype : v16.
- Contrat de snapshot social : `0.29.0-a3`.
- Migration D1 ajoutée par 0.37.0 : aucune.
- Les photos et leurs actifs restent dans l’espace de données local ouvert.

## Contrôles de release candidate

```text
npm run check
npm run test:stability
npm run test:e2e
npm run test:e2e:pwa
npm audit
```

Aucun tag, aucune fusion vers `main` et aucun déploiement de production ne sont réalisés par cette préparation.

## Documentation

Le référentiel canonique commence dans [`docs/INDEX.md`](docs/INDEX.md). Les règles applicables aux agents sont dans [`AGENTS.md`](AGENTS.md), le détail de la candidate dans [`RELEASE-NOTES-0.37.0.md`](RELEASE-NOTES-0.37.0.md) et l’historique synthétique dans [`CHANGELOG.md`](CHANGELOG.md).
