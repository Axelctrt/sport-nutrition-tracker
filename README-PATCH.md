# SportPilot 0.23.1 — confirmations d’action globales

Branche de publication : `feature/global-action-feedback-0.23.1`

## Livraison

La version 0.23.1 :

- centralise les confirmations de succès et les erreurs ;
- déduplique les notifications répétées ;
- conserve une confirmation après un rechargement complet ;
- couvre les principaux écrans de création, modification, suppression, restauration et export ;
- maintient un indicateur discret pour les autosauvegardes et écritures fréquentes ;
- ajoute un audit transversal au pipeline complet.

## Correctif complémentaire Objectifs

La même livraison 0.23.1 corrige aussi l’éditeur d’objectifs :

- les données existantes sont réaffichées fidèlement lors d’une modification ;
- un nouvel objectif de poids propose la dernière pesée comme poids de départ ;
- un objectif de poids existant conserve son poids de départ historique et ne le recalcule jamais depuis la dernière pesée actuelle.

## Versions

- application : `0.23.1` ;
- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

Aucune migration n’est introduite.

## Vérification

```powershell
npm ci
npm run audit:action-feedback
npm run release:verify
git diff --check
```

La publication doit être validée sur ordinateur et iPhone 15 sous iOS 26 avant la fusion manuelle dans `main` et la création du tag `v0.23.1`.
