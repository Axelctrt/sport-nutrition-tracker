# Mise à jour PWA et conservation des données

## Contrat d’identité

SportPilot conserve les identifiants suivants entre les versions :

- origine de production HTTPS stable : `https://sport-nutrition-tracker.axel-cottrant.workers.dev` ;
- `manifest.id` : `./` ;
- `manifest.start_url` : `./` ;
- `manifest.scope` : `./` ;
- base IndexedDB : `sportpilot-local-database`.

Un changement de protocole, de domaine, de sous-domaine ou de port crée une autre origine navigateur et donc un autre espace IndexedDB. Une URL de prévisualisation ne doit pas être utilisée comme installation principale.

## Séquence de mise à jour

Lorsque l’utilisateur choisit **Mettre à jour maintenant** :

1. les écritures lancées par les dépôts Dexie sont recensées ;
2. l’application attend leur résolution ;
3. une transaction Dexie exclusive et vide est placée sur toutes les tables afin d’attendre également toute transaction directe déjà ouverte ;
4. le service worker reçoit ensuite l’autorisation de s’activer et de recharger la page.

Si l’attente ou le contrôle Dexie échoue, le service worker n’est pas activé et aucune suppression n’est exécutée.

Le composant d’enregistrement du service worker est monté au niveau racine de l’application. Il reste donc actif pendant l’onboarding comme dans les écrans authentifiés localement.

## Développement local

Le nettoyage des anciens workers et caches locaux est limité à `import.meta.env.DEV`. Un build PWA de production servi sur `localhost` ou `127.0.0.1` conserve donc son service worker, ce qui permet de tester une vraie montée de version.

## Caches et IndexedDB

`cleanupOutdatedCaches` supprime uniquement les anciens caches gérés par Workbox. Cette option ne supprime pas la base IndexedDB.

Aucune écriture n’est lancée dans un gestionnaire `unload` ou `beforeunload`. Les opérations importantes doivent être validées avant le rechargement.

## Stratégie de test

La suite dédiée construit deux PWA distinctes puis les sert successivement sous la même origine :

1. installation et contrôle par la première PWA ;
2. création d’un profil local par le parcours utilisateur stable ;
3. insertion transactionnelle d’un jeu représentatif couvrant les 22 tables Dexie ;
4. capture exacte des compteurs et du contenu de chaque table ;
5. remplacement des fichiers servis par la seconde PWA ;
6. détection et activation du nouveau service worker ;
7. comparaison exacte de la base avant et après le rechargement ;
8. vérification que l’application se rouvre correctement sur une route stable, avec le profil et toutes les données toujours présents dans IndexedDB.

Le remplissage direct d’IndexedDB évite que ce test d’infrastructure dépende de sélecteurs propres aux formulaires nutritionnels, sportifs ou de pesée. Ces parcours restent couverts par leurs suites fonctionnelles dédiées.

La suite générale conserve `serviceWorkers: 'block'` pour rester déterministe. Le scénario réel de mise à jour utilise une configuration Playwright séparée avec `serviceWorkers: 'allow'`.

Playwright ne prend en charge les service workers que sur les navigateurs basés sur Chromium. La validation WebKit/iPhone reste donc un test manuel obligatoire.
