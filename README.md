# SportPilot 1.0.2

SportPilot `1.0.2` prépare l'extension de la continuité automatique sûre à
Goals et Weights depuis le candidat fonctionnel qualifié
`develop@37cae57dc779d6410f35a177403706be0a3eb382`.

Stable publiée avant cette maintenance :

- version : `1.0.1` ;
- `main@df28f61396160a68d24d110dd0924f491383faae` ;
- tag : `v1.0.1` ;
- production : `https://sportpilot-pages.pages.dev` ;
- aucune migration D1 ajoutée ou requise par 1.0.2.

L’application reste mobile-first, local-first, utilisable hors ligne et
installable en PWA.

## Continuité multi-appareils 1.0.2

- synchronisation automatique sûre limitée à Strength + Goals + Weights ;
- `local-only` → upload directionnel ;
- `cloud-only` → download directionnel ;
- `both` / `unknown` → aucune écriture automatique ;
- revalidation de la provenance avant écriture ;
- tombstones, suppressions, idempotence et isolation du compte préservés ;
- smoke physique Goals et Weights A → B validé ;
- non-régression Strength A → B validée ;
- absence de doublon Weight validée.

## Invariants de données et produit

- AppDatabase locale : Dexie v12 ;
- sauvegarde JSON générale : v10 ;
- runtime Dexie Cloud : v16 ;
- contrat de snapshot social : `0.29.0-a3` ;
- aucune migration D1 ;
- aucune modification des formules calories/macros ;
- aucun thème validé modifié ;
- aucun élargissement IA.

## Socle stable V1 conservé

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

## Contrôles de release

```text
npm run check
npm run test:stability
npm run audit:stable
npm run release:verify
npm run test:e2e
npm run test:e2e:pwa
npm audit
```

Les opérations de publication restent séquencées par leurs gates techniques :
CI, Preview immuable, `develop → main`, tag, GitHub Release puis production.

## Documentation

Le référentiel canonique commence dans [`docs/INDEX.md`](docs/INDEX.md). Les
règles applicables aux agents sont dans [`AGENTS.md`](AGENTS.md) et l’historique
synthétique dans [`CHANGELOG.md`](CHANGELOG.md).

La maintenance courante est documentée dans
[`RELEASE-NOTES-1.0.2.md`](RELEASE-NOTES-1.0.2.md). La maintenance 1.0.1 publiée
reste archivée dans [`RELEASE-NOTES-1.0.1.md`](RELEASE-NOTES-1.0.1.md). Les
archives 1.0.0, RC1, RC2 et 0.37.0 restent conservées dans leurs fichiers de
release respectifs.
