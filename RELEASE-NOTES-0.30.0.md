# Notes de release — SportPilot 0.30.0

## Résumé

SportPilot 0.30.0 finalise la refonte UX mobile. La version rend l’application plus rapide à utiliser au quotidien, clarifie les hubs Nutrition et Sport, sécurise les comportements de navigation et ajoute une recette mobile/accessibilité dédiée avant publication.

La release ne modifie pas les modèles de stockage, les règles de calcul calorique, les contrats sociaux ni les migrations cloud existantes.

## Nouveautés principales

### UX mobile et navigation

- accueil restructuré autour des actions prioritaires ;
- navigation principale simplifiée ;
- menu mobile plus accessible ;
- boutons d’en-tête alignés sur une cible tactile de 44 px ;
- lien d’évitement compatible avec le `HashRouter` ;
- garde-fous contre les débordements horizontaux.

### Onboarding, profil et paramètres

- parcours d’onboarding plus progressif ;
- reprise après interruption ;
- choix local ou compte clarifié ;
- paramètres regroupés par usages ;
- poids courant et impact calorique plus lisibles.

### Nutrition

- hub quotidien avec résumé calories/macros ;
- navigation jour précédent, suivant et date directe ;
- cartes repas compactes ;
- flux d’ajout centralisé ;
- sources de résultats explicites ;
- recherche locale tolérante aux accents et fautes simples ;
- consentement photo IA visible et limité à la photo sélectionnée.

### Sport

- hub Sport avec démarrage rapide ;
- activité en cours, programme, dernier entraînement et résumé hebdomadaire ;
- séance détaillée plus compacte ;
- séries validées repliées ;
- lignes prévues générées depuis les modèles ;
- choix du nombre de séries en séance libre ;
- raccourcis durée et intensité pour le cardio.

### Comportements globaux

- récupération après erreur de préchargement PWA ;
- page d’erreur route exploitable ;
- toasts mieux régulés ;
- message hors ligne plus clair ;
- confirmations accessibles ;
- actualisation silencieuse sans disparition des données ;
- champs préremplis vidés temporairement au focus puis restaurés si aucune saisie n’est faite.

## Versions techniques

- Application : `0.30.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 requises : aucune nouvelle migration.
- Migration Dexie : aucune.
- Tag attendu : `v0.30.0`.

## Validation

- recette UX mobile et accessibilité ;
- tests Playwright Chromium desktop et WebKit iPhone 15 ;
- suite Vitest complète ;
- build TypeScript/Vite/PWA ;
- audits de release, sécurité, production, dépôt, UX mobile et dépendances ;
- validation manuelle sur iPhone 15 sous iOS 26.

## Hors périmètre

- refonte du moteur calorique ;
- nouvelle migration D1 ou Dexie ;
- modification des contrats sociaux `0.29.0-a*` ;
- likes, commentaires, messagerie ou annuaire public ;
- export d’activité brute ;
- synchronisation multi-appareil supplémentaire.
