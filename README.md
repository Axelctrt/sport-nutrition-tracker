# SportPilot 0.13.0-alpha.4

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
npm run test         # 197 tests Vitest
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
- journal alimentaire local ;
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

Le format courant est `sportpilot-backup`, schéma version `1`. Les futures migrations de sauvegarde sont centralisées dans :

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

La version 0.13.0-alpha.4 est validée avec :

- Oxlint : 0 avertissement, 0 erreur ;
- Vitest : 48 fichiers, 197 tests ;
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
