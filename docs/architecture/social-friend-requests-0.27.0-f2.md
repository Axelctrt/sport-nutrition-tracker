# SportPilot 0.27.0 F2 — Demandes d’amis réelles

## Objectif

La phase F2 remplace l’envoi d’invitation basé sur un simple handle local par un flux compatible avec de vrais utilisateurs SportPilot.

Le principe est volontairement strict :

- l’utilisateur saisit un identifiant SportPilot exact ;
- l’application valide le format du handle ;
- un port de recherche exacte tente de résoudre le profil public ;
- si le profil existe, la demande locale est stockée avec `requesterUserId` et `recipientUserId` ;
- si aucun backend social n’est branché, l’état retourné est `unavailable` ;
- aucune recherche ouverte, suggestion ou annuaire public n’est introduit.

## États métier couverts

Le service `sendExactFriendRequest` retourne des états explicites :

- `sent` : profil trouvé, demande sortante créée ;
- `invalidHandle` : format invalide ;
- `notFound` : identifiant inexistant ;
- `self` : demande vers soi-même bloquée ;
- `alreadyFriend` : profil déjà ami ;
- `alreadySent` : demande déjà envoyée ;
- `alreadyReceived` : demande déjà reçue ;
- `unavailable` : service cloud indisponible.

## Contrats conservés

Les relations restent préparées autour du `userId`, pas autour du handle :

- `requesterUserId` identifie l’utilisateur qui envoie la demande ;
- `recipientUserId` identifie l’utilisateur ciblé ;
- `handle` reste une information publique d’affichage et de recherche exacte ;
- un changement de handle futur ne devra pas casser la relation.

## Persistance

Aucune migration Dexie n’est nécessaire en F2 :

- Dexie reste en `v9` ;
- sauvegarde JSON reste en `v8` ;
- les champs F2 sont ajoutés comme champs optionnels dans les objets existants ;
- les anciennes données locales restent lisibles.

## Limites volontaires

F2 ne livre pas :

- backend social réel ;
- découverte publique ;
- suggestions d’utilisateurs ;
- fil d’activité ;
- likes ;
- commentaires ;
- messagerie ;
- groupes ;
- classements ;
- partage détaillé d’activité.

Le garde-fou social reste actif. Une activité privée ne devient pas exposable via cette phase.
