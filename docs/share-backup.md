# Partage natif des sauvegardes

Cette évolution ajoute une action `Partager la sauvegarde` à la page de
sauvegarde de SportPilot.

## Fonctionnement

Lorsque le navigateur accepte le partage de fichiers, SportPilot ouvre la
feuille de partage du système avec le fichier JSON complet. Sur iPhone, cette
feuille permet notamment de choisir Fichiers, iCloud Drive, AirDrop ou une
application compatible installée.

Lorsque l'API de partage de fichiers n'est pas disponible, SportPilot utilise
automatiquement le téléchargement classique.

Une annulation volontaire de la feuille de partage n'est pas considérée comme
une erreur et n'enregistre pas une fausse date de sauvegarde réussie.

## Confidentialité

Le fichier est généré localement. SportPilot ne l'envoie vers aucun serveur et
ne choisit jamais une destination à la place de l'utilisateur.

## Compatibilité

- schéma Dexie : version 3 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
