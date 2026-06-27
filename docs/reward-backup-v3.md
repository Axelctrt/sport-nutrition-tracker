# Sauvegarde des récompenses — schéma JSON v3

Cette phase ajoute les données de progression conservées dans `localStorage`
aux sauvegardes SportPilot.

## Données ajoutées

- badges déjà gagnés et leur date d'obtention ;
- thèmes récompenses débloqués ;
- thème récompense actuellement actif ;
- semaines de missions hebdomadaires réussies.

## Compatibilité

Le format de sauvegarde passe de la version 2 à la version 3.

Les sauvegardes de versions 1 et 2 restent importables. Comme elles ne
contiennent aucun état de récompense, leur restauration conserve les
récompenses déjà présentes sur l'appareil au lieu de les effacer.

Une sauvegarde de version 3 restaure les données Dexie et les récompenses dans
la même opération. En cas d'échec d'écriture, les anciennes valeurs locales
sont restaurées.

## Nettoyage des données

Le nettoyage standard des données de test continue de conserver les badges,
les thèmes débloqués et l'historique des missions. Cette phase modifie
uniquement l'export et l'import des sauvegardes.
