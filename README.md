# SportPilot 0.14.0-alpha.7

PWA locale de suivi sportif, nutritionnel, calorique et de progression.

## Prérequis

- Node.js `20.19+`, `22.13+` ou `24+`
- npm

## Installation

```powershell
npm install
npm run check
npm run dev
```

Adresse de développement habituelle : `http://127.0.0.1:5173/`.

## Scripts

```powershell
npm run dev          # serveur Vite
npm run lint         # Oxlint
npm run test         # tests Vitest
npm run build        # TypeScript + build PWA
npm run audit:mvp    # contrôle statique final de la PWA
npm run check        # lint + tests + build + audit
npm run preview      # prévisualisation du build
npm run diagnose:off # diagnostic Open Food Facts
```

## Fonctionnalités

- onboarding et profil physique, avec modification mobile optimisée ;
- paramètres énergétiques avancés ;
- Mifflin–St Jeor, dépenses et macronutriments ;
- poids, pas et objectifs quotidiens ;
- course, natation, musculation, vélo, marche et cardio ;
- journal alimentaire local avec ajout direct depuis chaque repas ;
- Open Food Facts avec fonctionnement dégradé ;
- recettes et repas favoris ;
- historique et analyses sur douze semaines ;
- bilan hebdomadaire et calibration contrôlée ;
- export et import JSON complets ;
- suppression confirmée des données ;
- installation PWA et fonctionnement hors connexion.

## Sauvegarde et restauration

La page `#/backup` permet de :

1. télécharger une sauvegarde JSON complète ;
2. sélectionner un fichier de sauvegarde ;
3. valider sa structure avec Zod ;
4. consulter son résumé ;
5. restaurer toutes les tables dans une transaction Dexie ;
6. effacer toutes les données après confirmation `EFFACER`.

Le format courant est `sportpilot-backup`, schéma version `2`. Les sauvegardes des versions 0.12 et 0.13 au schéma version 1 sont migrées automatiquement à l’import. Les futures migrations de sauvegarde sont centralisées dans :

```text
src/infrastructure/backup/backupMigrations.ts
```

Un import invalide n’altère jamais la base. Si l’écriture échoue, la transaction est annulée et les données précédentes sont conservées.

## Confidentialité

Les données personnelles restent dans IndexedDB sur l’appareil. L’application n’utilise ni compte utilisateur ni backend. Seules les recherches lancées explicitement vers Open Food Facts nécessitent une connexion externe.

Le fichier de sauvegarde est créé localement par le navigateur et n’est envoyé à aucun serveur.

## Architecture

```text
src/
├── app/                 routage, providers et layouts
├── application/         orchestration des cas d’usage
├── domain/              modèles et logique métier pure
├── features/            pages et formulaires par fonctionnalité
├── infrastructure/      Dexie, repositories, backup et Open Food Facts
├── pwa/                 hors ligne, mise à jour et nettoyage local
├── shared/              composants et utilitaires partagés
└── test/                configuration et factories
```

## PWA

Le build génère :

```text
dist/manifest.webmanifest
dist/sw.js
dist/workbox-*.js
```

Le manifeste comprend des icônes standards et maskable ainsi que des raccourcis vers l’ajout d’un aliment, d’une activité et d’une pesée.

Pour tester la version de production :

```powershell
npm run build
npm run preview
```

## Contrôles finaux

La version 0.13.0 est validée avec :

- Oxlint : 0 avertissement, 0 erreur ;
- Vitest : 58 fichiers, 234 tests ;
- TypeScript strict : compilation réussie ;
- Vite/PWA : build réussi, service worker généré ;
- audit MVP : manifeste, icônes, raccourcis, hors ligne, repères d’accessibilité et absence de secrets évidents.

## Correctif 0.13.0-alpha.2

- Compatibilité des identifiants sur les origines HTTP locales mobiles où `crypto.randomUUID()` est indisponible.
- Utilisation de `crypto.getRandomValues()` lorsque possible, avec repli local pour les anciens navigateurs.
- Centralisation des identifiants des repas favoris.

## Nettoyage de l’interface 0.13.0-alpha.3

- suppression des références visibles aux étapes de développement ;
- remplacement des libellés temporaires par des intitulés métier ;
- retrait du diagnostic de version Open Food Facts dans l’interface ;
- mise à jour de la présentation des capacités de l’application ;
- ajout d’un test empêchant le retour de textes comme `Étape 8`, `MVP`, `prochainement` ou `TODO` dans les composants de production.


## Correctif mobile 0.13.0-alpha.4

Les champs natifs de date et d’heure sont maintenant contraints à la largeur de leur conteneur, y compris sur Safari iOS. Le correctif couvre notamment les écrans Journal alimentaire, Journal des activités, Poids et Analyses, sans désactiver les sélecteurs natifs du navigateur.

## Sélecteur alimentaire par repas 0.13.0-alpha.5

Depuis le petit-déjeuner, le déjeuner, le dîner ou les collations, l’utilisateur peut maintenant ouvrir un parcours d’ajout conservant automatiquement la date et le repas d’origine.

Le sélecteur propose :

- les aliments utilisés récemment ;
- les aliments marqués comme favoris ;
- tous les aliments locaux ;
- une recherche locale par nom, marque ou code-barres ;
- un aperçu nutritionnel avant validation ;
- la saisie par quantité ou par nombre de portions ;
- la création manuelle avec retour automatique vers le repas initial.

Le scan caméra sera intégré dans la branche suivante. Cette évolution réutilise les tables IndexedDB existantes et ne modifie pas le format des sauvegardes.


## Recherche Open Food Facts intégrée 0.13.0-alpha.6

Le sélecteur alimentaire de chaque repas comprend maintenant un onglet Open Food Facts. L’utilisateur peut effectuer une recherche textuelle, enregistrer le résultat localement, régler la quantité puis l’ajouter au repas d’origine sans changer de page.

Le parcours gère :

- les résultats complets et incomplets ;
- les produits déjà enregistrés localement ;
- la conservation prioritaire d’un aliment manuel utilisant le même code-barres ;
- le fonctionnement hors connexion avec retour vers les sources locales ;
- les erreurs et indisponibilités du service externe ;
- l’annulation automatique des requêtes lors du démontage du composant.

Aucune table IndexedDB ni version de sauvegarde n’est modifiée.

## Version 0.13.0-alpha.7 — validation du scanner caméra

Un écran de scan est accessible depuis le sélecteur d’aliments. Il utilise Quagga2 pour reconnaître EAN-13, EAN-8, UPC-A et UPC-E, privilégie la caméra arrière et arrête systématiquement le flux après détection, annulation, changement de page ou passage en arrière-plan.

Cette version valide uniquement la capture et le décodage. Le raccordement automatique du code détecté à Open Food Facts et à l’ajout au repas sera effectué dans la prochaine évolution.

Aucune table IndexedDB et aucun format de sauvegarde ne sont modifiés.

## Version 0.13.0-alpha.8 — scanner relié au journal alimentaire

Le scanner code-barres est désormais intégré au parcours alimentaire complet.

- recherche locale prioritaire par code-barres ;
- lecture des produits locaux hors connexion ;
- interrogation d'Open Food Facts pour un code inconnu ;
- enregistrement local du produit distant ;
- quantité et portions configurables après le scan ;
- ajout direct au repas d'origine ;
- création manuelle avec code prérempli ;
- recherche textuelle de secours ;
- messages distincts pour produit absent, produit archivé, mode hors connexion et API indisponible ;
- proxy de développement utilisable derrière un Quick Tunnel Cloudflare.

Le schéma IndexedDB et le format des sauvegardes restent inchangés.

## Version stable 0.13.0

Cette version finalise les évolutions d'interface et de nutrition prévues pour la série 0.13 :

- modification du profil utilisable sur mobile ;
- suppression des textes temporaires visibles ;
- ajout d'aliments directement depuis chaque repas ;
- aliments récents, favoris et locaux ;
- recherche Open Food Facts intégrée au repas ;
- scan EAN-13, EAN-8, UPC-A et UPC-E ;
- recherche locale prioritaire après scan ;
- ajout direct du produit au repas sélectionné ;
- fonctionnement dégradé et solutions de secours hors connexion.

Le schéma IndexedDB et le format des sauvegardes restent inchangés.

Validation de la version :

- Oxlint : 0 erreur et 0 avertissement ;
- Vitest : 58 fichiers et 234 tests réussis ;
- TypeScript strict : compilation réussie ;
- Vite/PWA : build et service worker générés ;
- audit MVP : réussi.

## Version 0.14.0-alpha.1 — socle de données musculation

Cette préversion ajoute le modèle de données du futur carnet de musculation sans encore modifier l’interface :

- catalogue d’exercices système ou utilisateur ;
- séances modèles et exercices ordonnés ;
- séances réalisées indépendantes de leur modèle d’origine ;
- séries avec répétitions, charge, type, validation et RPE facultatif ;
- suggestions de progression et historique des décisions ;
- sept nouvelles tables Dexie ajoutées par une migration non destructive ;
- conservation intégrale des anciennes activités de musculation dans `activities` ;
- format de sauvegarde version 2 incluant toutes les nouvelles tables ;
- migration automatique des sauvegardes version 1 vers la version 2.

Validation de cette préversion :

- Oxlint : 0 erreur et 0 avertissement ;
- Vitest : 59 fichiers et 238 tests réussis ;
- TypeScript strict : compilation réussie ;
- Vite/PWA : build et service worker générés ;
- audit MVP : réussi.



## Version 0.14.0-alpha.2 — catalogue d’exercices

Cette préversion ajoute le premier écran fonctionnel du carnet de musculation :

- catalogue local de 43 exercices courants disponible hors connexion ;
- recherche sans sensibilité aux accents ;
- filtres par groupe musculaire, matériel et origine ;
- création et modification d’exercices personnels ;
- archivage et réactivation des exercices personnels ;
- duplication d’un exercice système ou personnel ;
- protection des exercices système contre les modifications directes ;
- accès depuis le journal des activités et la navigation ordinateur ;
- restauration automatique du catalogue après un effacement ou l’import d’une ancienne sauvegarde.

Validation : 63 fichiers de tests, 249 tests, lint, build PWA et audit réussis.

## Version 0.14.0-alpha.3 — séances modèles de musculation

Cette préversion ajoute la gestion complète des séances modèles :

- création et modification d’une séance modèle ;
- ajout d’exercices depuis le catalogue local ;
- ordre modifiable avec des commandes accessibles ;
- séries prévues et fourchette de répétitions ;
- charge cible, incrément, repos et RPE maximal recommandé ;
- notes générales et notes par exercice ;
- duplication d’une séance avec une configuration indépendante ;
- archivage et réactivation sans suppression de l’historique ;
- conservation des identifiants des exercices de modèle lors des modifications ;
- accès depuis le journal des activités et la navigation ordinateur.

Validation : 66 fichiers de tests, 259 tests, lint, build PWA et audit réussis.

## Version 0.14.0-alpha.4 — séances réalisées

Cette préversion ajoute le cycle de vie des entraînements de musculation :

- démarrage d’une séance libre ou depuis un modèle ;
- création d’instantanés indépendants du modèle et du catalogue ;
- reprise automatique d’une séance en cours après fermeture de l’application ;
- prévention de plusieurs séances simultanées ;
- ajout, retrait et réorganisation des exercices pendant la séance ;
- notes générales persistantes ;
- clôture avec calcul de la durée ;
- abandon avec conservation dans l’historique ;
- consultation des séances terminées ou abandonnées ;
- accès depuis le journal des activités, les modèles et la navigation ordinateur.

Validation : 69 fichiers de tests, 268 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.5 — saisie des séries

Cette préversion ajoute la saisie détaillée des séries directement dans les séances de musculation :

- ajout d’une série avec reprise automatique de la charge cible et des répétitions prévues ;
- saisie de la charge, des répétitions, du RPE et du type de série ;
- notes facultatives au niveau de chaque série ;
- validation et réouverture d’une série ;
- duplication rapide d’une série existante ;
- suppression avec renumérotation automatique ;
- état d’avancement par exercice par rapport aux séries prévues ;
- protection des séances terminées contre les modifications ;
- persistance locale et reprise après fermeture de l’application ;
- interface responsive optimisée pour la saisie mobile.

Aucune nouvelle migration Dexie n’est nécessaire : la table `strengthSets` existe depuis `0.14.0-alpha.1`.

Validation : 71 fichiers de tests, 277 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.6 — historique par exercice

Cette préversion ajoute la continuité entre les séances de musculation :

- affichage de la dernière séance terminée pour chaque exercice d’une séance en cours ;
- détail des charges, répétitions et RPE précédents ;
- reprise automatique des séries de la séance précédente avant toute nouvelle saisie ;
- protection contre l’écrasement de séries déjà enregistrées ;
- page d’historique accessible depuis le catalogue et les séances ;
- récapitulatif du nombre de séances, de la meilleure charge et du volume cumulé ;
- historique détaillé des séries terminées ;
- exclusion des séries d’échauffement du volume principal ;
- accès direct à la séance d’origine ;
- fonctionnement intégral hors connexion avec IndexedDB.

Aucune nouvelle migration Dexie n’est nécessaire : l’historique est recalculé à partir des séances et séries déjà stockées.

Validation : 73 fichiers de tests, 285 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.7 — statistiques et records de musculation

Cette préversion enrichit l’historique de chaque exercice avec des analyses calculées localement :

- graphiques d’évolution de la charge maximale, de la charge moyenne et du 1RM estimé ;
- graphique du volume et des répétitions par séance ;
- meilleure charge, meilleur volume sur une série et meilleur volume sur une séance ;
- nombre total de séries de travail et de répétitions ;
- charge moyenne par série de travail ;
- estimation du 1RM avec la formule d’Epley sur les séries de 1 à 12 répétitions ;
- comparaison de la dernière séance avec la précédente ;
- records de répétitions pour chaque charge utilisée ;
- exclusion systématique des séries d’échauffement des statistiques principales.

Aucune nouvelle migration Dexie n’est nécessaire : les statistiques sont recalculées à partir des séances et séries existantes.

Validation : 74 fichiers de tests, 290 tests, lint, build PWA et audit réussis.
