# Prototype Dexie Cloud — C2 : pesées fictives synchronisées

## Statut

Lot expérimental limité à la branche `experiment/dexie-cloud-weight-sync`.

La base réelle `sportpilot-local-database`, son schéma Dexie v8 et le backup JSON v7 ne sont pas modifiés.

## Périmètre

C2 utilise uniquement la base expérimentale `sportpilot-sync-prototype` et les tables :

- `weights` ;
- `deletionRecords`.

Les pesées créées dans cet écran sont explicitement fictives. Elles ne sont jamais lues depuis ou copiées vers l’historique réel de SportPilot.

## Identifiants

Une pesée fictive conserve l’identifiant déterministe :

```text
weight:<YYYY-MM-DD>
```

Une seule pesée est donc autorisée par date et par compte. Une modification conserve l’identifiant et utilise une mise à jour partielle afin de laisser Dexie Cloud fusionner les propriétés indépendantes.

## Suppressions

La suppression est atomique dans la base expérimentale :

1. création ou mise à jour du marqueur `deletion:weight:<weightId>` avec le statut `deleted` ;
2. suppression physique de la pesée active.

L’interface masque toute pesée possédant un marqueur `deleted`, même si un ancien appareil hors ligne réintroduit temporairement l’objet.

La création volontaire d’une nouvelle pesée à la même date transforme le marqueur en révision `restored`. Ce comportement distingue une recréation explicite d’une résurrection silencieuse.

## Isolation par compte

Dexie Cloud ajoute les propriétés techniques `owner` et `realmId`. L’écran filtre les objets locaux sur l’utilisateur courant lorsqu’elles sont présentes. La déconnexion vide immédiatement les données affichées et le champ email.

## Synchronisation

Les écritures sont d’abord locales. Dexie Cloud les transmet ensuite au service distant. L’écran recharge les données :

- après l’ouverture de la base ;
- après une connexion ;
- après chaque écriture ;
- après une synchronisation manuelle ;
- après l’événement `syncComplete`.

## Scénarios manuels C2

1. créer une pesée fictive sur ordinateur ;
2. la recevoir sur iPhone avec le même compte ;
3. modifier la note sur un appareil et le poids sur l’autre ;
4. créer une pesée hors ligne puis reconnecter ;
5. supprimer une pesée pendant que l’autre appareil est hors ligne ;
6. vérifier que la pesée supprimée ne réapparaît pas ;
7. se déconnecter et vérifier que le champ email et la liste sont vidés.

## Hors périmètre

- données réelles ;
- corbeille avec snapshot local ;
- restauration depuis une corbeille ;
- synchronisation des autres domaines ;
- migration initiale d’un compte ;
- généralisation de Dexie Cloud.
