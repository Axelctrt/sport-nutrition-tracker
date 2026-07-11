# SportPilot 0.30.0

SportPilot 0.30.0 livre la grande refonte UX mobile de l’application. La version rend les parcours essentiels plus directs sur iPhone, clarifie l’accueil, modernise les hubs Nutrition et Sport, sécurise les comportements globaux et finalise les garde-fous d’accessibilité avant publication.

L’application reste locale-first, compatible cloud, et conserve les données existantes sans migration Dexie ou D1 supplémentaire.

## Nouveautés principales

### Accueil, navigation et paramètres

- page d’accueil recentrée sur les actions prioritaires ;
- navigation mobile plus lisible autour des rubriques Accueil, Nutrition, Sport et Progression ;
- paramètres réorganisés par usages ;
- lien d’évitement clavier fonctionnel avec le `HashRouter` ;
- cibles tactiles principales alignées sur 44 px.

### Onboarding et profil

- parcours d’entrée restructuré ;
- séparation plus claire entre usage local et compte ;
- récupération et reprise après interruption ;
- étapes de profil plus explicites ;
- résumé final compatible avec les données existantes.

### Nutrition

- nouveau hub quotidien ;
- navigation par jour ;
- résumé calories et macros plus lisible ;
- repas compacts et actionnables ;
- flux d’ajout unifié : recherche, scanner, photo, récents, favoris, aliments personnels, recettes, repas favoris et manuel ;
- retour vers le bon repas après ajout ;
- recherche locale plus tolérante aux accents et fautes simples ;
- consentement photo IA explicite par image sélectionnée.

### Sport et musculation

- nouveau hub Sport ;
- démarrage rapide des activités ;
- reprise d’une séance en cours ;
- accès aux séances planifiées ;
- dernier entraînement et résumé hebdomadaire ;
- parcours musculation plus compact ;
- séries prévues des modèles générées automatiquement ;
- séance libre avec choix du nombre de séries ;
- saisie cardio accélérée par raccourcis durée et intensité.

### Comportements UX globaux

- récupération après erreur de chunk ou mise à jour PWA ;
- page d’erreur route plus utile ;
- toasts normalisés ;
- formulation hors ligne clarifiée ;
- confirmation de suppression plus accessible ;
- actualisation silencieuse sans effacer les données affichées ;
- champs préremplis vidés au focus puis restaurés si aucune saisie n’est faite.

## Stockage et versions techniques

- Application : `0.30.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 ajoutées par 0.30.0 : aucune.
- Migrations Dexie ajoutées par 0.30.0 : aucune.

## Validation de la release

La publication doit être précédée de :

```text
npm run audit:ux-mobile-acceptance
npm run audit:release
npm run audit:security
npm run audit:production
npm run audit:repository
npm run lint
npm run test
npm run build
npm run check
npm run test:stability
npm audit
```

La recette réelle sur iPhone 15 sous iOS 26 doit valider les parcours Accueil, Nutrition, Sport, Progression, paramètres, onboarding, ajout Nutrition, séance cardio, séance musculation, hors ligne, PWA et accessibilité.

Tag attendu : `v0.30.0`.
