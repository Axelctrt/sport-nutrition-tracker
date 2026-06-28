# Centre de restauration sélective

Cette phase complète la restauration JSON totale avec un mode de remplacement
par grands domaines fonctionnels.

## Objectif

L'utilisateur peut comparer une sauvegarde avec les données présentes sur
l'appareil, puis restaurer seulement les domaines utiles sans supprimer le
reste.

La restauration sélective ne fusionne pas les lignes individuellement. Chaque
domaine choisi est remplacé intégralement afin d'éviter les doublons et les
relations hybrides.

## Domaines

### Profil et réglages

- profil local ;
- objectifs ;
- paramètres de calcul ;
- préférences d'interface ;
- réglages de sauvegarde.

### Poids et pas

- pesées ;
- pas quotidiens.

### Activités d'endurance

- course ;
- natation ;
- vélo ;
- marche ;
- autres activités cardio.

### Nutrition et bilans

- aliments ;
- repas ;
- entrées alimentaires ;
- favoris ;
- recettes et ingrédients ;
- objectifs quotidiens ;
- statuts du journal ;
- bilans hebdomadaires ;
- ajustements caloriques acceptés.

### Musculation

- catalogue d'exercices ;
- séances modèles ;
- exercices de modèles ;
- séances planifiées ou réalisées ;
- exercices de séance ;
- séries ;
- suggestions de progression.

### Récompenses et thèmes

- accomplissements ;
- thèmes visuels débloqués et thème actif ;
- historique des missions hebdomadaires.

Les anciennes sauvegardes sans format de récompenses restent compatibles. Le
domaine Récompenses est simplement indisponible dans ce cas.

## Comparaison

Pour chaque domaine, l'écran affiche :

- le nombre d'enregistrements sur l'appareil ;
- le nombre d'enregistrements dans la sauvegarde ;
- l'écart ;
- la disponibilité du domaine dans le fichier.

## Sécurité

Avant l'écriture :

1. le fichier est validé et migré vers le format courant ;
2. l'utilisateur choisit les domaines ;
3. une sauvegarde JSON complète de l'appareil est téléchargée ;
4. les tables sélectionnées sont remplacées dans une transaction Dexie ;
5. les domaines non sélectionnés restent intacts.

Le fichier de sécurité suit le format :

```text
sportpilot-securite-avant-restauration-selective-<horodatage>.json
```

## Compatibilité

- les sauvegardes v1, v2 et v3 restent lisibles via les migrations existantes ;
- la restauration totale existante reste inchangée ;
- Dexie reste en version 4 ;
- le format JSON reste en version 3 ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire ;
- aucune transmission réseau.
