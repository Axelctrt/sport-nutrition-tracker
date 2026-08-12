# SportPilot 1.0.0-rc.2

SportPilot `1.0.0-rc.2` est la candidate V1 préparée sur la base technique avant
gel `develop@e1921f5807292f8236e70c1688d8d9f02c22bdf0`. Cette préparation n'est ni
fusionnée, ni déployée, ni taguée, ni publiée. La production reste SportPilot
`0.37.0`, issue de la PR #21 au commit
`84fea3d49e68c7d190c00d505502a5c4aa2e672a`.

- Production : `https://sportpilot-pages.pages.dev`
- Tag annoté : `v0.37.0`
- Release GitHub stable :
  `https://github.com/Axelctrt/sport-nutrition-tracker/releases/tag/v0.37.0`
- Migration D1 ajoutée ou exécutée pour cette release : aucune

L’application reste mobile-first, local-first, utilisable hors ligne et
installable en PWA.

## Candidate RC2 depuis 0.37.0

- convergence mobile et desktop des hubs Sport, Nutrition et Progression ;
- continuité des saisies non enregistrées sur les surfaces critiques ;
- feedbacks d'action, états filtrés et parcours clavier/focus harmonisés ;
- comportement réduit des animations et stabilisation Chromium/WebKit/iPhone ;
- contrôles de continuité, d'isolation, d'export/restauration et de rétention PWA renforcés ;
- correctif du cold launch PWA hors ligne et preuve automatisée réelle ;
- version candidate et documentation de release alignées sans évolution de schéma.

RC1 a été déployée une seule fois puis rejetée à cause du cold launch PWA
suivi par #144. Le correctif #145 est inclus dans la base de RC2. Le CORS Dexie
Cloud #146 reste un gate de la future recette Preview, sans mutation incluse
dans cette préparation.

## Socle stable 0.37.0 conservé

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

- Application candidate : `1.0.0-rc.2`.
- Application actuellement en production : `0.37.0`.
- AppDatabase locale : Dexie v12, migration additive.
- Sauvegarde JSON générale : v10.
- Runtime Dexie Cloud prototype : v16.
- Contrat de snapshot social : `0.29.0-a3`.
- Migration D1 ajoutée par 0.37.0 : aucune.
- Les photos et leurs actifs restent dans l’espace de données local ouvert.

## Contrôles de la candidate

```text
npm run check
npm run test:stability
npm run test:e2e
npm run test:e2e:pwa
npm audit
```

La préparation RC n'autorise aucune Preview Cloudflare, fusion, création de
tag, release GitHub ou publication. Chacune de ces opérations reste soumise à
une validation explicite ultérieure.

## Documentation

Le référentiel canonique commence dans [`docs/INDEX.md`](docs/INDEX.md). Les
règles applicables aux agents sont dans [`AGENTS.md`](AGENTS.md), l’historique
synthétique dans [`CHANGELOG.md`](CHANGELOG.md) et les preuves de préparation
dans les documents d’archive, notamment
[`RELEASE-NOTES-0.37.0.md`](RELEASE-NOTES-0.37.0.md). Les changements de la
candidate sont synthétisés dans
[`RELEASE-NOTES-1.0.0-rc.2.md`](RELEASE-NOTES-1.0.0-rc.2.md). Le verdict
historique rejeté de RC1 reste archivé dans
[`RELEASE-NOTES-1.0.0-rc.1.md`](RELEASE-NOTES-1.0.0-rc.1.md).
