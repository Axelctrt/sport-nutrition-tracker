# SportPilot 0.18.0 A1 — fondations des espaces de données

## Statut

Ce lot pose le socle local de l’isolation des données. Il ne modifie pas encore
le parcours de connexion et n’associe aucune donnée invitée à un compte.

## Décision d’architecture

SportPilot isole les espaces par base IndexedDB distincte plutôt que par ajout
d’un champ propriétaire dans chaque table.

Cette décision tient compte de l’architecture existante : tous les repositories
sont construits une fois sur une instance `AppDatabase`. Une base distincte par
espace permet donc de conserver les contrats et requêtes actuels tout en créant
une frontière physique entre deux comptes.

## Invariants

- la base historique `sportpilot-local-database` reste l’espace invité ;
- aucune donnée existante n’est déplacée par ce lot ;
- un espace de compte reçoit un nom dérivé d’une empreinte opaque ;
- aucun email, identifiant brut ou jeton n’est stocké dans le registre local ;
- le registre ne contient que des métadonnées d’appareil ;
- un registre corrompu retombe sur l’espace invité sans bloquer le démarrage ;
- aucun changement du schéma Dexie v8 ;
- aucun changement du backup JSON v7.

## Registre local

Clé : `sportpilot:data-spaces:v1`

Le registre conserve :

- l’espace actif ;
- les espaces connus sur l’appareil ;
- le nom de leur base IndexedDB ;
- une empreinte de compte non réversible pour les espaces connectés ;
- les dates techniques de création et de dernière activation.

## Étape suivante

Le lot A2 devra :

1. lier explicitement un compte Dexie Cloud à un espace local ;
2. demander à l’utilisateur s’il associe les données invitées ou démarre vide ;
3. recharger l’application après changement d’espace ;
4. désactiver toute synchronisation tant que l’espace actif ne correspond pas
   au compte connecté ;
5. revenir à l’espace invité lors de la déconnexion sans supprimer les données
   du compte.
