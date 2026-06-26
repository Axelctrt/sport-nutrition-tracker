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

## Évolutions de fiabilité après la stabilisation

La branche de développement ajoute un suivi local de la dernière sauvegarde, un rappel configurable, des exports CSV, un diagnostic technique non sensible et une prévisualisation d’import plus détaillée. Ces évolutions restent compatibles avec le schéma Dexie v2 et les sauvegardes JSON v2 existantes.

## Sécurité et confidentialité après la stabilisation

La branche de développement ajoute une page Confidentialité publique et des en-têtes de sécurité Cloudflare. La CSP autorise les ressources locales, les workers nécessaires à la PWA et au scanner, ainsi que les deux domaines Open Food Facts utilisés par l’application. Les scripts inline et `unsafe-eval` restent interdits.
## Phase 5 — minuteur de repos

- minuteur lancé automatiquement après validation d’une série de travail ;
- commandes pause, reprise, arrêt, -15 s, +15 s et +30 s ;
- reprise exacte après arrière-plan grâce au timestamp de fin ;
- démarrage manuel par exercice ;
- vibration et son configurables avec fallback visuel ;
- état opérationnel limité à `sessionStorage` ;
- aucune migration Dexie et sauvegarde JSON v2 conservée.


## Phase 6 — statistiques poids du corps et assistance

- méthode de suivi configurable par exercice ;
- statistiques spécifiques pour charge externe, poids du corps, lest et assistance ;
- répétitions seules, durée et distance prises en charge ;
- charge effective calculée avec le poids applicable à la date de séance ;
- assistance plus faible classée comme meilleure performance ;
- formulaires de séries et séances modèles adaptés au type de mesure ;
- suppression des volumes nuls sans signification pour le poids du corps ;
- anciennes données et sauvegardes JSON v2 conservées sans migration.


## Phase 7 — planification hebdomadaire

- nouvelle route `#/strength/planning` ;
- vue du lundi au dimanche avec navigation entre les semaines ;
- planification d’une séance à partir d’un modèle ;
- instantané du modèle et de ses exercices créé au moment de la planification ;
- report avec conservation de la date initiale ;
- statut `Non réalisée` pour les séances prévues qui ne sont pas effectuées ;
- démarrage direct depuis le planning ;
- même identifiant conservé entre la séance prévue et la séance réelle ;
- date prévue conservée lorsqu’une séance démarre un autre jour ;
- sauvegarde JSON v2 et export CSV enrichis sans migration Dexie ;
- nouveau parcours Playwright Chromium/WebKit.

## Phase 8 — supersets, tri-sets et circuits

- regroupement des exercices dans les séances modèles ;
- types superset, tri-set et circuit ;
- nom, nombre de tours et temps de repos configurables ;
- création, ajout, retrait, réorganisation, duplication et dissolution des groupes ;
- repères ordonnés `A1`, `A2`, `B1` dans la séance active ;
- indication de l’exercice suivant et passage temporaire ;
- minuteur utilisant le repos entre exercices ou entre tours ;
- séries et statistiques conservées séparément par exercice ;
- métadonnées de groupe incluses dans la sauvegarde JSON v2 et le CSV ;
- anciennes séances sans groupe compatibles sans migration Dexie ;
- nouveau parcours Playwright Chromium/WebKit.

## Phase 9 retenue — fiabilité des produits alimentaires

- actualisation à la demande des produits Open Food Facts enregistrés ;
- protection des corrections locales par champ lors d’une actualisation ;
- remplacement explicite des corrections après confirmation ;
- détection des doublons par code-barres et par nom/marque normalisés ;
- ajout d’un libellé de portion en complément de la quantité ;
- fibres et sel visibles dans la bibliothèque et les aperçus du journal ;
- libellé de portion récupéré depuis Open Food Facts quand il est disponible ;
- nouveaux champs facultatifs acceptés par les sauvegardes JSON v2 ;
- aucune migration Dexie ni dépendance supplémentaire.
