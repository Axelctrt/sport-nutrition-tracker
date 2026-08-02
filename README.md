# SportPilot 0.37.0

SportPilot 0.37.0 est la version stable publiée en production depuis `main`.
La PR #21 a livré `develop` dans `main` au commit
`84fea3d49e68c7d190c00d505502a5c4aa2e672a`.

- Production : `https://sportpilot-pages.pages.dev`
- Tag annoté : `v0.37.0`
- Release GitHub stable :
  `https://github.com/Axelctrt/sport-nutrition-tracker/releases/tag/v0.37.0`
- Migration D1 ajoutée ou exécutée pour cette release : aucune

L’application reste mobile-first, local-first, utilisable hors ligne et
installable en PWA.

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

Le rapprochement visuel du statut de disponibilité avec le champ d’identifiant
public reste une amélioration non bloquante planifiée pour une passe UX
ultérieure.

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

## Contrôles de publication

```text
npm run check
npm run test:stability
npm run test:e2e
npm run test:e2e:pwa
npm audit
```

La version, le commit publié, le tag annoté, la release GitHub stable et la
production ont été validés sur le même état de code.

## Documentation

Le référentiel canonique commence dans [`docs/INDEX.md`](docs/INDEX.md). Les
règles applicables aux agents sont dans [`AGENTS.md`](AGENTS.md), l’historique
synthétique dans [`CHANGELOG.md`](CHANGELOG.md) et les preuves de préparation
dans les documents d’archive, notamment
[`RELEASE-NOTES-0.37.0.md`](RELEASE-NOTES-0.37.0.md).
