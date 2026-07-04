# SportPilot 0.25.0 F1 — Estimation nutritionnelle assistée par photo

## Objectif

Préparer le parcours d’ajout d’un repas à partir d’une photo sans casser le journal nutritionnel existant ni remplacer Open Food Facts.

## Principes produit

- L’analyse photo reste une estimation à vérifier.
- La quantité est explicitement présentée comme approximative.
- L’utilisateur peut corriger le nom, la quantité, les calories, les protéines, les glucides, les lipides, les fibres et le sel avant validation.
- L’image n’est pas stockée dans le journal alimentaire.
- Aucune image n’est envoyée à un service externe dans cette phase.
- Une future API IA devra passer par un port d’analyse et par un consentement explicite avant transmission.

## Architecture

La phase introduit un module applicatif `photo-nutrition` avec :

- un port `PhotoNutritionAnalysisPort` pour brancher plus tard une API IA ou un backend ;
- un fallback local `localPhotoNutritionAnalysisPort` ;
- une normalisation des valeurs totales estimées vers des valeurs pour 100 g/ml ;
- une sauvegarde compatible avec l’existant : création d’un aliment local manuel puis ajout d’une entrée alimentaire classique.

## Limites assumées

Le fallback local ne reconnaît pas réellement le contenu visuel de l’image. Il fournit un brouillon prudent et corrigeable, basé sur quelques gabarits indicatifs ou sur un repas générique lorsqu’il ne reconnaît rien.

## Recette manuelle attendue

- Depuis le journal alimentaire, ouvrir un repas.
- Cliquer sur `Photo`.
- Importer ou prendre une photo.
- Lancer l’analyse.
- Vérifier le message `Estimation à vérifier`.
- Corriger les valeurs.
- Ajouter au journal.
- Vérifier que l’entrée apparaît dans le bon repas et qu’elle reste modifiable comme un aliment classique.
