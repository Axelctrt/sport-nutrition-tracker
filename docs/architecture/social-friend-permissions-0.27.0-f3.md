# SportPilot 0.27.0 F3 — Permissions de partage par ami

## Objectif

La phase F3 ajoute une couche de permissions de partage d’activité par ami, sans activer le fil d’activité ni l’export d’activité réelle.

## Règles métier

- Résumé par défaut pour chaque ami accepté.
- Détail uniquement après consentement explicite local ami par ami.
- Le réglage global `activitySharing` reste prioritaire.
- Si le profil est privé ou si le partage global est désactivé, aucun partage n’est exposable.
- Le partage détaillé global reste gardé : aucun export brut ni snapshot détaillé réel n’est généré en F3.
- Les fonctions par ami préparent F4, où les activités seront converties en snapshots sociaux filtrés.

## Persistance

F3 ajoute la table Dexie `friendActivityPermissions`.

Schéma logique :

```ts
type FriendActivityPermission = {
  id: EntityId;
  friendUserId?: EntityId;
  friendHandle: string;
  sharingLevel: 'summary' | 'detailed';
  detailedConsent: 'notRequested' | 'granted';
  detailedConsentGrantedAt?: string;
};
```

La migration passe IndexedDB de `v9` à `v10`.

## Sauvegarde JSON

La sauvegarde passe de `v8` à `v9` pour inclure :

```ts
friendActivityPermissions?: StoredFriendActivityPermission[];
```

Les sauvegardes v8 sont migrées vers v9 avec une liste de permissions vide.

## UX

Dans la page Amis, chaque ami accepté affiche :

- permission actuelle ;
- bouton `Résumé uniquement` ;
- bouton `Autoriser le détail` ;
- message de garde-fou contextualisé.

Le bouton de détail est désactivé tant que le partage global n’est pas réglé sur `Détaillé après accord`.

## Hors périmètre

F3 ne livre pas :

- fil d’activité ;
- snapshots sociaux d’activité ;
- likes ;
- commentaires ;
- messagerie ;
- groupes ;
- classements ;
- backend social réel ;
- export d’activité brute.
