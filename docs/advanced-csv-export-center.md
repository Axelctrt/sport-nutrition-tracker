# Centre d'export CSV avancé

Cette phase transforme les exports CSV techniques existants en un véritable
outil de sélection et d'analyse.

## Périodes disponibles

L'utilisateur peut exporter :

- toutes les dates ;
- les 7 derniers jours ;
- les 30 derniers jours ;
- les 90 derniers jours ;
- une période personnalisée.

La date de début doit précéder la date de fin.

## Jeux de données

Sept fichiers peuvent être sélectionnés indépendamment :

- poids ;
- pas ;
- activités ;
- séances de musculation ;
- séries de musculation ;
- aliments consommés ;
- apports nutritionnels quotidiens.

## Cohérence des données de musculation

Lorsqu'une période est appliquée, les séries et exercices de séance sont
filtrés à partir des séances incluses dans cette période. Une série ne peut donc
pas apparaître sans sa séance de référence.

## Aperçu

Après préparation, l'interface affiche :

- le nom de chaque fichier ;
- son nombre de lignes ;
- la période utilisée ;
- un bouton de téléchargement individuel.

La modification de la période ou de la sélection invalide l'aperçu précédent.

## Téléchargement et partage

L'utilisateur peut :

- télécharger un fichier précis ;
- déclencher le téléchargement de tous les fichiers préparés ;
- utiliser la feuille de partage native quand le navigateur accepte plusieurs
  fichiers.

Sur iPhone, la feuille de partage permet notamment d'envoyer les CSV vers
Fichiers, iCloud Drive, AirDrop ou une application compatible. Si le partage de
plusieurs fichiers n'est pas pris en charge, les boutons de téléchargement
restent disponibles.

## Compatibilité

L'appel historique `createCsvExports(database, exportedAt)` reste compatible.
Les filtres sont ajoutés dans un troisième paramètre optionnel.

## Confidentialité

La lecture, le filtrage, la création des CSV et les téléchargements restent
entièrement locaux.

## Versions techniques

- Dexie : version 4 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- archive de corbeille : version 1 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
