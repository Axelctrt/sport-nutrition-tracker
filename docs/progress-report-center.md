# Centre de rapports de progression

Cette phase ajoute une synthèse partageable des données SportPilot sans exposer
la base complète ni les journaux détaillés.

## Périodes

L'utilisateur peut choisir :

- les 7 derniers jours ;
- les 30 derniers jours ;
- les 90 derniers jours ;
- une période personnalisée.

La période est limitée à 366 jours afin de garder une synthèse lisible.

## Rubriques

Cinq domaines peuvent être inclus indépendamment :

- poids ;
- pas ;
- activités ;
- nutrition ;
- musculation.

## Indicateurs

### Poids

- nombre de pesées ;
- poids moyen ;
- première et dernière mesure ;
- évolution sur la période.

### Pas

- jours suivis ;
- total ;
- moyenne ;
- nombre de jours atteignant l'objectif du profil.

### Activités

- nombre de séances ;
- durée totale ;
- calories estimées ;
- distances de course, vélo et natation ;
- répartition par type.

### Nutrition

- jours suivis ;
- journaux terminés ;
- calories et macronutriments moyens ;
- rapport moyen entre calories consommées et cible quotidienne.

### Musculation

- séances terminées ;
- durée ;
- exercices ;
- séries terminées et séries de travail ;
- volume brut charge × répétitions ;
- RPE moyen lorsqu'il est renseigné.

## Confidentialité

Le prénom, l'objectif de poids et l'objectif de pas sont exclus par défaut.
L'utilisateur doit activer explicitement leur inclusion.

Le rapport ne contient pas :

- le détail de chaque repas ;
- les notes privées ;
- les noms de produits consommés ;
- le détail de chaque série ;
- la sauvegarde JSON complète.

## Livraison

Le rapport peut être :

- copié dans le presse-papiers ;
- téléchargé en texte UTF-8 ;
- partagé avec la feuille native du système ;
- imprimé ou enregistré en PDF via la fonction d'impression du navigateur.

## Technique

- calcul local depuis IndexedDB ;
- aucune transmission serveur ;
- Dexie v4 inchangé ;
- sauvegarde JSON v3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
