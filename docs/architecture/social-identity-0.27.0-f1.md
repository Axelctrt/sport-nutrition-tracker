# SportPilot 0.27.0 F1 — Identité sociale et identifiant public

## Objectif

La phase F1 ajoute une identité sociale locale exploitable avant les demandes d’amis réelles :

- `userId` interne stable, privé, jamais affiché comme identifiant utilisateur ;
- `handle` public visible avec `@`, stocké sans `@` ;
- `displayName` affiché ;
- contrat de recherche exacte préparé ;
- cloud social non branché par défaut ;
- aucun partage d’activité réel ;
- aucun export social détaillé ;
- garde-fou social conservé.

## Règles de handle

Le handle public respecte le cadre validé :

- 3 à 24 caractères ;
- minuscules uniquement ;
- lettres, chiffres, point, tiret, underscore ;
- pas d’espace ;
- pas d’accent ;
- pas de double arobase ;
- mots réservés bloqués : `admin`, `support`, `sportpilot`, `root`, `api`, `system`, `moderator`, `null`, `undefined`, `me`.

Exemples valides : `@alex.run`, `@romain_92`, `@lina.trail`, `@maxime-running`.

Exemples invalides : `@Alex`, `@alex run`, `@éloise`, `@@alex`, `@sportpilot`.

## Persistance

F1 ne crée pas de nouvelle table Dexie. L’identité sociale est conservée dans l’enregistrement local `friendsPrivacySettings.socialIdentity` afin de rester compatible avec Dexie v9 et la sauvegarde JSON v8.

Le dépôt `DexieSocialIdentityRepository` lit et écrit uniquement cette identité, sans modifier les amis, demandes et réglages de confidentialité existants.

## Recherche exacte

Le contrat `SocialUserLookupGateway` prépare la recherche exacte par handle.

Par défaut, l’adapter retourne `unavailable` : l’application locale seule ne peut pas savoir si `@alex.run` existe réellement. Les états `found`, `notFound`, `invalidHandle` et `unavailable` sont déjà modélisés pour F2.

## UX livrée

La page Amis affiche désormais :

- `Mon identifiant SportPilot` ;
- le handle public copiable ;
- le formulaire de modification du handle ;
- le nom affiché ;
- le bouton `Vérifier disponibilité` ;
- le bouton `Enregistrer` ;
- l’état `Identifiant valide` ou `Identifiant invalide` ;
- l’état `Compte cloud indisponible` quand aucun backend social n’est branché ;
- l’avertissement `Utilisateur non connecté au cloud social`.

## Limites volontaires F1

F1 ne livre pas :

- demandes d’amis cloud réelles ;
- annuaire public ;
- recherche ouverte ;
- suggestions ;
- fil d’activité ;
- likes ;
- commentaires ;
- messagerie ;
- groupes ;
- classements ;
- export d’activité brute ;
- partage automatique sans consentement.
