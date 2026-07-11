# SportPilot 0.30.0 — U9A Architecture des Paramètres

## Objectif

Remplacer la longue page unique de réglages par une architecture orientée utilisateur, mobile-first, tout en conservant les routes et les outils existants.

## Architecture livrée

`/settings` devient l’accueil des Paramètres. Il présente les valeurs actives et neuf catégories :

1. Profil et objectifs ;
2. Compte et synchronisation ;
3. Confidentialité et amis ;
4. Apparence et accessibilité ;
5. Notifications, rappels et routines ;
6. Nutrition et calculs ;
7. Autorisations et intelligence artificielle ;
8. Données, sauvegardes et export ;
9. À propos de SportPilot.

La recherche porte sur le titre, la description, les mots-clés et le résumé actif de chaque catégorie.

## Routes

Les nouvelles routes sont :

- `/settings/profile-objectives` ;
- `/settings/account-sync` ;
- `/settings/privacy-friends` ;
- `/settings/appearance-accessibility` ;
- `/settings/notifications-routines` ;
- `/settings/nutrition-calculations` ;
- `/settings/ai-permissions` ;
- `/settings/data-backup` ;
- `/settings/about` ;
- `/settings/advanced`.

Les routes historiques restent disponibles, notamment :

- `/profile` ;
- `/settings/reminders` ;
- `/settings/dashboard` ;
- `/settings/account-devices` ;
- `/settings/sync-prototype` ;
- `/friends` ;
- `/backup` ;
- `/privacy`.

## Répartition des réglages

### Profil et objectifs

Accès au profil, au poids actuel, aux objectifs et à l’explication des calculs.

### Compte et synchronisation

Accès au compte et aux appareils, au centre de synchronisation et au réglage de synchronisation automatique.

### Confidentialité et amis

Accès à l’identité sociale, aux permissions par ami et à la politique de confidentialité.

### Apparence et accessibilité

Thème, demande de stockage persistant, personnalisation de l’Accueil, densité d’affichage et thèmes récompenses.

### Notifications, rappels et routines

Rappels, routines, minuteur de repos, son, vibration, accomplissements et régularité.

### Nutrition et calculs

Accès au profil pour les objectifs personnels, explication des calculs et réglages experts des coefficients, MET et limites de calibration.

### Autorisations et IA

État de disponibilité du proxy d’analyse photo, rappel du consentement explicite et accès à la politique de traitement des données.

### Données, sauvegardes et export

État du stockage, sauvegarde, restauration, import, export et corbeille.

### À propos

Version de l’application, confidentialité, calculs et accès aux diagnostics avancés.

## Réglages avancés

L’ancienne page complète est conservée à `/settings/advanced`. Elle regroupe les coefficients détaillés, les diagnostics de synchronisation, l’intégrité de la base et les outils techniques.

Le formulaire avancé accepte désormais un périmètre de sections. Les pages de catégories réutilisent donc les contrôles existants sans dupliquer les règles de validation ni la persistance.

## Persistance et synchronisation

Aucun nouveau réglage n’est introduit. Les règles existantes restent inchangées :

- préférences utilisateur éligibles synchronisées par le dépôt de réglages ;
- thème, densité et autres préférences appareil conservés selon leur comportement existant ;
- aucune donnée métier déplacée ;
- aucune réécriture de l’historique.

## Compatibilité

- aucune route historique supprimée ;
- le bouton Paramètres des pages principales continue d’ouvrir `/settings` ;
- les sous-pages de Paramètres reviennent vers `/settings` sur mobile ;
- les pages Profil, Amis, Sauvegarde et Compte conservent leur logique interne ;
- les anciens favoris et liens directs restent valides.

## Migrations

Aucune migration D1, Dexie ou de données locales.

## Validation

Contrôles prévus :

- recherche par accent et mot-clé ;
- neuf catégories et routes uniques ;
- affichage des valeurs actives ;
- filtrage du formulaire avancé ;
- conservation des routes historiques ;
- retour mobile vers l’accueil des Paramètres ;
- absence de débordement à 320, 375, 390 et 430 px ;
- navigation clavier et focus visible ;
- mode local et compte connecté ;
- build, lint et suite Vitest complète.
