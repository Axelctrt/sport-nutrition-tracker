# Répéter une semaine sportive

Cette phase complète le planning sportif unifié avec une duplication
hebdomadaire sécurisée.

## Fonctionnement

Depuis la semaine affichée, l’utilisateur choisit une semaine cible puis
confirme la copie.

Sont repris :

- les séances de musculation liées à un modèle ;
- les activités d’endurance planifiées ;
- le jour relatif dans la semaine ;
- les objectifs de durée, distance, intensité et les notes.

Ne sont pas repris :

- les séries et performances réellement exécutées ;
- les durées réelles ;
- les statuts terminée, en cours, abandonnée ou non réalisée ;
- les dates historiques de création et de mise à jour.

Toutes les nouvelles entrées sont recréées avec le statut prévu.

## Prévention des doublons

Musculation :

- même modèle ;
- même date cible.

Endurance :

- même type d’activité ;
- même date cible ;
- même titre normalisé.

Les doublons existants sont ignorés et comptabilisés dans le toast de
résultat.

## Robustesse

La copie de musculation est réalisée séance par séance. Un modèle supprimé
ou devenu indisponible n’empêche pas la copie des autres séances ; il est
comptabilisé comme indisponible dans le bilan.

Le planning d’endurance est écrit en une seule opération locale.

## Technique

- aucune nouvelle route ;
- aucune nouvelle table Dexie ;
- aucune migration ;
- aucune dépendance npm ;
- aucune nouvelle donnée à ajouter aux sauvegardes ;
- fonctionnement hors connexion.
