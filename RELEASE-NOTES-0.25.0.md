# Notes de version — SportPilot 0.25.0

## Estimation nutritionnelle assistée par photo

SportPilot ajoute un nouveau parcours permettant de démarrer une saisie alimentaire depuis une photo. Depuis le journal alimentaire, l’utilisateur peut ouvrir le bouton `Photo`, choisir ou prendre une photo, contrôler l’aperçu, lancer une estimation prudente, corriger les valeurs puis ajouter l’entrée au bon repas.

## UX mobile clarifiée

La page photo a été validée sur iPhone avec une interface explicite : sélection native de photo, aperçu visible, nom et taille du fichier, suppression manuelle par croix, état d’analyse et formulaire de correction lisible.

## Estimation locale prudente

La version 0.25.0 ne branche pas encore d’IA distante. L’estimation repose sur un fallback local générique, identifié comme faible confiance. L’objectif est de fournir une base de saisie, pas une vérité nutritionnelle.

## Correction manuelle obligatoire

L’utilisateur peut modifier l’aliment, la quantité, les calories, les protéines, les glucides et les lipides avant ajout. Les valeurs corrigées sont celles qui sont enregistrées dans le journal alimentaire.

## Confidentialité

Aucune image n’est envoyée vers un service externe en 0.25.0. La photo sélectionnée sert uniquement au parcours courant et n’est pas persistée comme donnée utilisateur. Le futur branchement IA devra passer par un backend ou proxy avec consentement explicite.

## Compatibilité nutrition

Open Food Facts, le scanner code-barres, les aliments locaux, les recettes et l’ajout manuel restent inchangés. Le parcours photo complète le journal alimentaire existant sans le remplacer.

## Arbitrage production

L’interface photo claire a été priorisée. Un dépassement du budget JavaScript historique est accepté pour cette version et devra être traité par une optimisation globale ultérieure.

## Versions de données

- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

**Aucune migration** de données, de sauvegarde ou de registre n’est requise.
