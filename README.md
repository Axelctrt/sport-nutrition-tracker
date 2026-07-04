# SportPilot 0.25.0

## Estimation nutritionnelle assistée par photo

SportPilot 0.25.0 ajoute un parcours d’ajout alimentaire à partir d’une photo. L’utilisateur peut choisir ou prendre une photo, vérifier l’aperçu, supprimer la photo sélectionnée, lancer une estimation locale prudente, corriger les valeurs, puis ajouter l’entrée au bon repas du journal alimentaire.

Cette version ne branche pas encore de modèle IA distant. L’estimation photo repose sur un fallback local volontairement générique : elle sert de point de départ, jamais de vérité nutritionnelle. Les libellés rappellent que l’estimation doit être vérifiée et que les valeurs restent modifiables avant l’ajout au journal.

## Confidentialité et données

La photo sélectionnée reste locale dans la PWA pendant le parcours d’estimation. SportPilot ne conserve pas l’image dans Dexie et ne l’envoie pas à un service externe dans cette version. Le futur branchement IA devra passer par un backend ou proxy explicite, avec consentement clair avant tout envoi d’image.

## Journal alimentaire et Open Food Facts

Le journal nutritionnel existant reste la source centrale. Open Food Facts, le scanner code-barres, les aliments locaux, les recettes et l’ajout manuel restent disponibles. Le parcours photo complète ces outils sans les remplacer.

## Compatibilité

SportPilot 0.25.0 conserve le runtime Dexie Cloud v10 nommé `sportpilot-sync-runtime-0.20.0-v10`. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1. Aucune migration de données n’est requise.

## Arbitrage production

La recette mobile a privilégié une interface photo claire et testable. Le budget JavaScript historique peut être dépassé par arbitrage produit : ce dépassement est assumé pour la version 0.25.0 et devra être traité par une optimisation globale ultérieure plutôt que par une dégradation de l’expérience utilisateur.
