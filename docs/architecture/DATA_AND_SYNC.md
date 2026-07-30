# Données, espaces et synchronisation

Statut : **actuel**. Ce document résume les contrats ; les documents versionnés
de `docs/architecture` conservent l’historique détaillé.

## Stockages

| Stockage | Version actuelle | Rôle |
| --- | ---: | --- |
| `AppDatabase` Dexie | 11 | données utilisateur principales locales |
| Sauvegarde JSON | 10 | export/import contrôlé et restauration |
| Runtime Dexie Cloud | 16 | agrégats synchronisables et baselines logiques |
| D1 social | migrations `0000` à `0003` présentes | identité, relations, permissions, snapshots et limites photo |

La source de la version Dexie principale est
`src/infrastructure/database/migrations/versions.ts`. Les versions 1 à 11 sont
enregistrées dans `AppDatabase.ts`. Une constante ou migration publiée est
immuable.

## Espaces de données

- **Invité** : espace local isolé, sans compte cloud.
- **Profil local** : données de l’appareil dans la base principale.
- **Compte cloud** : espace sélectionné explicitement, avec restauration ou
  import contrôlé.

`src/app/data-spaces` applique les gardes d’accès.
`src/infrastructure/data-spaces` porte l’import invité, la restauration cloud
et la coordination des espaces. Un changement de compte doit masquer l’ancien
espace avant tout chargement du nouveau.

## Synchronisation

La synchronisation est désactivée par défaut dans `.env.example`. Chaque
domaine réel possède un flag explicite : poids, activités, objectifs,
musculation, journal et bibliothèque nutritionnels, suivi nutritionnel,
préférences du compte, récompenses/routines et cloud social.

Le runtime :

1. prépare un agrégat déterministe ;
2. compare la baseline logique ;
3. propage créations, mises à jour et tombstones ;
4. converge sans ressusciter les suppressions ;
5. conserve l’isolation de compte ;
6. expose un état compréhensible dans le centre de synchronisation.

Les suppressions synchronisées passent par des `DeletionRecord`. Les séances,
modèles et exercices de musculation sont synchronisés comme agrégats afin
d’éviter les états partiels.

## Sauvegarde et restauration

- Sauvegarde globale et sélective :
  `src/infrastructure/backup` et `src/application/backup`.
- Validation des enveloppes avant écriture.
- Sauvegarde de sécurité avant restauration ou opération sensible.
- Journal de migration et diagnostic d’intégrité dans la base principale.
- Import invité explicite ; aucune fusion silencieuse entre espaces.

Ne jamais contourner les schémas de sauvegarde pour « réparer » un fichier.
Une incompatibilité doit être signalée avant toute écriture.

## D1 et Pages Functions

Le binding vérifié dans `wrangler.jsonc` est `SOCIAL_DIRECTORY_DB`. Les
fonctions sociales et photo sont dans `functions/api`. Les migrations SQL
restent dans `migrations/` et leur application distante est une opération
séparée exigeant une autorisation.

## Évolution d’un contrat de données

Toute évolution doit fournir :

- nouvelle version si le schéma change ;
- migration additive et idempotente ;
- tests depuis les versions historiques pertinentes ;
- impact sauvegarde/import/restauration ;
- impact synchronisation, D1 et suppression ;
- audit de continuité et procédure de retour arrière.
