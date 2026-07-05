# SportPilot 0.26.0 F2 — Persistance locale amis et confidentialité

## Objectif

La phase F2 transforme le socle amis de la F1 en données persistées localement.
Le périmètre reste volontairement local : aucun échange cloud réel entre comptes
n’est activé et aucun partage détaillé de performances n’est publié.

## Stockage IndexedDB

La base Dexie passe de la version 8 à la version 9 avec trois tables utilisateur :

- `friendProfiles` : amis acceptés localement ;
- `friendRequests` : demandes entrantes, sortantes, acceptées ou refusées ;
- `friendsPrivacySettings` : préférences de visibilité et de partage.

La migration `version9` journalise l’évolution dans `migrationJournal` sans
injecter de fausses données sociales. Un utilisateur existant démarre donc avec
un état local vide et des paramètres sécurisés par défaut.

## Repository local

`DexieFriendsPrivacyRepository` expose un contrat minimal :

- `readSnapshot()` charge amis, demandes et préférences ;
- `saveSnapshot(snapshot)` remplace le snapshot local de manière atomique.

Le repository ne dépend pas de Dexie Cloud, du prototype de synchronisation ou
d’un compte distant. Il prépare seulement la donnée locale nécessaire à la suite.

## Page Amis

La page `/friends` charge le snapshot depuis Dexie lorsque l’application tourne
normalement. Les tests peuvent toujours injecter un `initialSnapshot` ou un
repository mémoire pour isoler les scénarios UI.

Les actions suivantes sont persistées :

- envoi d’une demande sortante ;
- acceptation d’une demande entrante ;
- refus d’une demande entrante ;
- changement de visibilité du profil ;
- activation/désactivation des demandes ;
- choix du niveau de partage préparé.

Même si le niveau `detailed` existe dans le domaine, le texte et les garde-fous
rappellent que le partage détaillé reste soumis à consentement et n’est pas
publié en F2.

## Sauvegarde JSON

Le format de sauvegarde passe en JSON v8. Les nouvelles tables sont exportées et
restaurées avec la sauvegarde complète :

- `friendProfiles` ;
- `friendRequests` ;
- `friendsPrivacySettings`.

Les anciennes sauvegardes sont migrées vers v8 avec des collections amis vides.

## Limites conservées pour 0.27.0

- Pas de recherche serveur d’utilisateurs ;
- pas d’acceptation réellement multi-compte ;
- pas de flux d’activité entre amis ;
- pas de synchronisation sociale cloud.
