# SportPilot 0.36.0

SportPilot 0.36.0 simplifie trois parcours quotidiens : la page Amis, l’organisation des Paramètres et la saisie détaillée d’une séance de musculation. Cette version repose sur le correctif de continuité de session 0.35.1.

L’application reste mobile-first, locale-first, utilisable hors ligne et installable en PWA.

## Principales évolutions

### Amis

- quatre rubriques réelles : Fil, Amis, Demandes et Profil ;
- rubrique conservée dans l’URL, compatible avec le rechargement et le bouton Retour ;
- une seule rubrique visible, avec badge sur les demandes reçues ;
- permissions détaillées ouvertes dans une feuille de gestion accessible ;
- diagnostic social déplacé vers les réglages avancés ;
- fil cloud préparé uniquement lorsque le Fil est ouvert ;
- retrait des textes techniques des parcours ordinaires.

### Paramètres

- cinq catégories principales compréhensibles ;
- résumés utiles sans métriques techniques sur l’accueil ;
- confidentialité, amis, autorisations et données regroupés ;
- réglages avancés débarrassés des doublons courants ;
- récompenses conservées dans Progression, avec de simples raccourcis depuis les réglages ;
- anciennes routes toujours accessibles.

### Musculation

- accordéon à ouverture unique pour les exercices ;
- exercice courant ouvert et reprise possible avec `Continuer` ;
- parcours principal Charge, Répétitions, Valider ;
- sauvegarde automatique différée, au blur et avant démontage ;
- état d’enregistrement et nouvelle tentative en cas d’échec ;
- RPE, type, notes, duplication et suppression placés dans les options secondaires ;
- préremplissage depuis la série courante, puis l’historique, puis l’objectif prévu.

## Stockage et versions techniques

- Application : `0.36.0`.
- AppDatabase locale : Dexie v11.
- Sauvegarde JSON : v10.
- Runtime Dexie Cloud prototype : v16.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 ajoutées par 0.36.0 : aucune.
- Migrations Dexie ajoutées par 0.36.0 : aucune.

## Contrôles de publication

```text
npm run lint
npx tsc -b --pretty false
npm run test
npm run build
npm run test:e2e
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

Aucun tag, aucune fusion et aucun déploiement ne sont réalisés par la préparation de cette branche.

## Documentation

Le référentiel canonique destiné aux contributeurs, à Codex et à ChatGPT
commence dans [`docs/INDEX.md`](docs/INDEX.md). Les règles applicables aux
agents sont dans [`AGENTS.md`](AGENTS.md).
