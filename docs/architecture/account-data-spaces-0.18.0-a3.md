# SportPilot 0.18.0 A3 — Compte et appareils

## Objectif

Ce lot complète le socle local des espaces de données avec une page de gestion claire du compte et de l’appareil courant.

Il ne généralise pas encore la synchronisation aux autres domaines et ne supprime jamais de données cloud.

## Principes retenus

### Identité locale de l’appareil

SportPilot crée un identifiant opaque et stable pour l’installation courante. Ce registre local contient uniquement :

- un identifiant technique aléatoire ;
- un libellé générique du navigateur et de la plateforme ;
- les dates de création et de dernière utilisation.

Il ne contient ni adresse e-mail, ni jeton, ni secret d’authentification.

### Trois actions distinctes

#### Déconnecter le compte

- arrête la session Dexie Cloud ;
- conserve l’espace et les données locales du compte ;
- revient à l’espace invité après rechargement.

#### Désassocier cet appareil

- marque l’espace du compte comme non associé à l’appareil courant ;
- conserve intégralement sa base IndexedDB locale ;
- déconnecte le compte ;
- exige une réassociation explicite lors de la prochaine connexion.

#### Supprimer les données locales de ce compte

- active d’abord l’espace invité ;
- ferme la base du compte ;
- supprime uniquement la base IndexedDB locale correspondante ;
- retire l’espace du registre local ;
- déconnecte le compte ;
- ne supprime aucune donnée cloud.

La confirmation forte `SUPPRIMER` est obligatoire avant cette opération.

## Page « Compte et appareils »

La page présente :

- le compte connecté ;
- l’état courant de synchronisation ;
- le dernier échange réussi connu ;
- l’état des modifications en attente ;
- l’espace de données actif ;
- l’appareil courant et son identifiant local abrégé ;
- l’accès au compte de synchronisation ;
- l’accès à l’export local ;
- les trois actions de cycle de vie local.

## Limites volontaires du lot A3

Dexie Cloud ne fournit pas encore à SportPilot une liste métier des appareils distants exploitable dans ce lot. La page affiche donc uniquement l’appareil courant.

La révocation distante d’un appareil, la suppression définitive du compte et la suppression cloud restent prévues dans la phase dédiée au cycle de vie complet du compte.

## Compatibilité des données

- version applicative inchangée : `0.17.1` ;
- schéma Dexie principal inchangé : `v8` ;
- format de sauvegarde JSON inchangé : `v7` ;
- aucune migration destructive ;
- aucun transfert automatique entre espaces.
