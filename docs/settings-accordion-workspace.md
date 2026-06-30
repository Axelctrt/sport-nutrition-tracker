# Espace de paramètres repliable

Cette phase transforme les écrans de configuration en espaces compacts,
navigables et persistants.

## Infrastructure commune

Le composant `CollapsibleSection` prend désormais en charge :

- un identifiant stable de section ;
- une icône facultative ;
- la mémorisation locale de l’état ouvert ou fermé ;
- l’ouverture depuis un lien profond utilisant le hash ;
- le défilement vers la rubrique ciblée ;
- le centrage immédiat de la rubrique choisie après son ouverture ;
- un état actif exclusif entre Profil, Paramètres et Menu complet ;
- le respect de la préférence de réduction des animations.

Les anciens usages restent compatibles.

## Sommaire et recherche

Les pages Paramètres et Profil disposent d’un sommaire filtrable. La recherche
porte sur :

- le titre ;
- la description ;
- des mots-clés associés ;
- les variantes avec ou sans accents.

Un clic ouvre la rubrique, met à jour le hash de l’URL et fait défiler la page.

## Paramètres avancés

L’écran regroupe désormais :

- profil et objectifs ;
- personnalisation du tableau de bord ;
- affichage et stockage ;
- minuteur de repos ;
- dépense énergétique et activités ;
- calibration hebdomadaire ;
- thèmes visuels ;
- motivation et régularité ;
- sauvegardes, stockage et données.

Les formulaires existants ne sont pas dupliqués.

## Profil

Les sections existantes du formulaire deviennent adressables et persistantes :

- informations personnelles ;
- objectif et activité quotidienne ;
- cibles de macronutriments.

## Récompenses

Le centre de récompenses sépare :

- missions hebdomadaires ;
- séries de régularité ;
- badges et accomplissements ;
- thèmes visuels.

## Sauvegardes

La page Sauvegarde et restauration replie indépendamment :

- suivi et rappels ;
- sauvegarde complète ;
- restauration complète ;
- diagnostic technique ;
- exports CSV avancés ;
- restauration sélective ;
- stockage local et persistance.

Les dialogues de confirmation et les mécanismes de sauvegarde restent
inchangés.

## Technique

- aucune nouvelle table Dexie ;
- aucune migration ;
- format JSON v3 inchangé ;
- état des accordéons stocké uniquement dans `localStorage` ;
- aucune dépendance npm ;
- aucune transmission réseau.
