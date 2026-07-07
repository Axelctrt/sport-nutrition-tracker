# SportPilot 0.29.0 A10 — Synchronisation cloud de la confidentialité sociale globale

## Statut

A10 étend le domaine existant `account-preferences` de Dexie Cloud afin de synchroniser les deux réglages globaux qui conditionnent toute publication sociale :

- la visibilité du profil social ;
- la politique globale de partage des activités.

Aucune nouvelle table Dexie, aucune nouvelle table D1 et aucune nouvelle version de schéma ne sont nécessaires. Les nouvelles propriétés sont optionnelles et restent compatibles avec les agrégats cloud produits avant A10.

## Flux

```text
Modification locale du partage global
→ persistance dans friendsPrivacySettings
→ événement account-preferences
→ synchronisation automatique Dexie Cloud
→ résolution composant par composant
→ écriture locale sur l’autre appareil
→ événement de confidentialité sociale
→ rechargement de la page ouverte
→ réconciliation best effort des snapshots existants
```

## Composants synchronisés

L’agrégat `AccountPreferencesAggregate` contient désormais deux composants indépendants :

- `socialProfileVisibility` ;
- `socialActivitySharing`.

Chaque composant porte son propre `updatedAt`. Une modification récente de visibilité ne remplace donc pas une politique plus récente, et inversement.

## Horodatages locaux dédiés

La ligne `StoredFriendsPrivacySettings` conserve :

- `profileVisibilityUpdatedAt` ;
- `socialActivitySharingPolicyUpdatedAt`.

Les changements sans rapport avec ces réglages — demande d’ami, identité sociale ou permission individuelle — ne modifient plus leur ordre de résolution cloud.

## Compatibilité

Les anciennes lignes locales sans horodatage dédié utilisent leur `updatedAt` existant comme valeur de transition. Les anciens agrégats cloud sans composants sociaux restent valides et sont enrichis lors de la prochaine synchronisation autorisée.

Le champ historique `activitySharing` continue d’être dérivé de la politique globale afin de conserver la compatibilité avec le socle social antérieur.

## Confidentialité

La résolution cloud utilise la version la plus récente de chaque composant. Le passage en profil privé est donc propagé entre appareils et déclenche ensuite la suppression ou la révocation des snapshots qui ne doivent plus rester publiés.

La synchronisation de la politique globale ne transporte :

- ni liste d’amis ;
- ni demandes d’amis ;
- ni permissions individuelles ;
- ni activité métier brute ;
- ni note personnelle.

## Résilience

Une erreur de synchronisation ou de réconciliation sociale ne bloque pas les fonctions sportives locales. La reprise s’effectue via l’orchestrateur automatique existant au démarrage, à la reconnexion ou lors d’un prochain changement local.

## Stockage

Versions maintenues :

- base principale SportPilot : Dexie v10 ;
- prototype Dexie Cloud : v14 ;
- migration D1 A6 : inchangée.
