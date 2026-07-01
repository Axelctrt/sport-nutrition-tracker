# SportPilot 0.19.0 B1 — synchronisation des activités

## Objet

Ce lot ajoute la première brique de synchronisation sportive réelle. Il couvre la table `activities` de l’espace de données actif et les marqueurs `deletionRecords` de type `activity`.

## Périmètre

Les types d’activités suivants utilisent le même flux :

- course ;
- natation ;
- vélo ;
- marche ;
- cardio ;
- activité de musculation déclarative.

Les objectifs, modèles et séances de musculation détaillées restent hors périmètre de B1.

## Stockage cloud

La base Dexie Cloud isolée passe de la version 2 à la version 3 et ajoute :

- `realActivities` ;
- `realActivityDeletionRecords`.

La base locale principale reste en Dexie v8. Le format de sauvegarde reste en JSON v7.

## Identité et confidentialité

Chaque identifiant local est converti en identifiant privé Dexie Cloud préfixé par `#`. Les lignes téléchargées sont filtrées selon le propriétaire du compte courant. Aucun email, jeton ou secret n’est recopié dans les activités.

## Conflits

La convergence est déterministe :

1. la valeur ayant le `updatedAt` le plus récent gagne ;
2. à horodatage égal, une représentation stable départage les deux valeurs ;
3. une suppression gagne si son marqueur est au moins aussi récent que l’activité ;
4. une activité plus récente qu’un ancien marqueur produit un marqueur `restored` ;
5. une seconde exécution ne crée aucun doublon.

## Interface

Le panneau **Paramètres → Synchronisation des données → Synchronisation des activités** propose :

- une analyse sans écriture ;
- une synchronisation manuelle avec confirmation ;
- les volumes locaux, cloud et les suppressions ;
- un accès direct à la gestion du compte.

L’automatisation des échanges sera traitée dans un lot ultérieur de la version 0.19.0.
