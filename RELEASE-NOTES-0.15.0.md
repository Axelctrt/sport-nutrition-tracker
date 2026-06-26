# Notes de publication — SportPilot 0.15.0

## Résumé

SportPilot 0.15.0 est la première version stable du cycle mobile-first 0.15. Elle consolide l’utilisation principale sur iPhone tout en conservant une interface propre sur ordinateur et le fonctionnement local hors connexion.

## Expérience mobile

- tableau de bord compact avec saisie rapide des pas et du poids ;
- journal alimentaire et ajout de produits sans remontée intempestive de la page ;
- recherche locale, Open Food Facts et scanner réunis dans un parcours cohérent ;
- suivi des activités, du poids, des analyses et du bilan hebdomadaire optimisé ;
- carnet de musculation, exercices, modèles, séances et historique adaptés au téléphone ;
- profil, paramètres, sauvegarde et informations de calcul accessibles depuis le menu mobile ;
- champs de date contenus dans les grilles Safari iOS ;
- valeurs numériques égales à zéro directement remplaçables ;
- sections repliables recentrées lors de leur ouverture.

## PWA et robustesse

- installation guidée sur iPhone depuis Safari ;
- fonctionnement local hors connexion et messages réseau harmonisés ;
- mise à jour PWA avec version visible dans Paramètres ;
- routes et navigations vérifiées automatiquement ;
- sauvegarde JSON comparée à toutes les tables Dexie ;
- récupération vers l’accueil après une erreur globale ;
- thème tolérant aux restrictions de stockage du navigateur ;
- budgets JavaScript et CSS contrôlés avant publication.

## Compatibilité des données

- schéma Dexie : version 2 ;
- format de sauvegarde JSON : version 2 ;
- aucune migration requise depuis `0.15.0-alpha.13` ou `0.15.0-rc.1` ;
- les données locales existantes sont conservées lors de la mise à jour.

## Validation de référence

La livraison stable doit réussir `npm run check`, comprenant le lint, les tests, le build PWA, l’audit MVP, l’audit de version et l’audit stable. La validation manuelle finale est décrite dans `RELEASE-CHECKLIST.md`.
