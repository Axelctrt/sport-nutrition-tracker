# SportPilot 0.25.0 F2 — Consolidation de l’estimation nutritionnelle photo

## Objectif

La F2 consolide la première itération de l’estimation nutritionnelle assistée par photo sans brancher encore d’API IA distante. Le parcours reste volontairement prudent : une photo permet de préparer une saisie, mais l’utilisateur doit corriger l’aliment, la quantité et les valeurs nutritionnelles avant l’ajout au journal.

## Périmètre fonctionnel

- Interface mobile clarifiée après la F1 validée sur iPhone.
- Sélecteur photo unique, avec choix natifs iOS : caméra, galerie ou fichiers.
- Aperçu de la photo sélectionnée.
- Suppression manuelle de la photo avant analyse.
- État d’analyse en cours.
- État d’ajout au journal en cours.
- Messages d’erreur explicites : photo illisible, format non supporté, quantité invalide, réseau indisponible dans le futur cas API.
- Notice visible indiquant que l’estimation reste à vérifier.

## Confidentialité

En F2, aucune image n’est envoyée, stockée, synchronisée ou attachée au journal alimentaire. La photo reste uniquement dans l’état temporaire de la page pendant la saisie.

La future API IA devra respecter les règles suivantes :

1. consentement explicite avant tout envoi d’image ;
2. mention claire de la destination de traitement ;
3. possibilité de continuer en saisie locale sans API ;
4. absence de persistance automatique de l’image dans Dexie ;
5. message d’échec exploitable en cas de réseau indisponible ou de repas non reconnu.

## Architecture applicative

Le service `photoNutritionEstimationService` expose un port `PhotoNutritionAnalysisPort`. Ce port permet de remplacer le fallback local par une future implémentation backend/API IA, sans modifier le journal alimentaire.

La réponse d’analyse contient désormais :

- `mode` : `local-fallback` ou futur `remote-ai` ;
- `confidence` : niveau de confiance ;
- `privacy` : mode de confidentialité ;
- `warnings` : messages affichables à l’utilisateur.

## Données enregistrées

L’ajout au journal reste basé sur le système existant :

1. création d’un aliment manuel `Estimation photo` ;
2. normalisation des valeurs par 100 g ;
3. ajout d’une entrée alimentaire dans le repas sélectionné.

Aucune image, nom de fichier, URL d’aperçu ou donnée binaire photo n’est enregistrée dans le journal.

## Migrations

Aucune migration Dexie.

Aucune migration de sauvegarde JSON.

Aucun changement Open Food Facts.

Aucun changement scanner code-barres.

## Tests et audit

Couverture ajoutée ou renforcée :

- estimation locale prudente ;
- métadonnées de confiance et confidentialité ;
- refus de fichier non image ;
- refus de quantité invalide ;
- non-conservation du nom de fichier photo dans le résultat journal ;
- état de bouton désactivé sans photo ;
- analyse locale prudente affichée dans l’interface ;
- suppression manuelle de la photo ;
- audit `audit:photo-nutrition`.

## Limites assumées

La F2 ne fait pas encore de reconnaissance réelle d’aliment. Le libellé `Repas à vérifier` est volontaire pour éviter une fausse promesse produit.

Le branchement API IA/backend est repoussé à une phase ultérieure, avec consentement et gestion de confidentialité dédiés.
