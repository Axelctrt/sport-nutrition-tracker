# Notes de version — SportPilot 0.23.1

## Confirmations d’action

SportPilot confirme désormais de manière homogène les créations, modifications, suppressions, restaurations et exports réellement terminés.

Les principaux parcours couverts comprennent :

- objectifs, profil, paramètres et rappels ;
- poids, pas et personnalisation du tableau de bord ;
- aliments, recettes, favoris et modèles sportifs ;
- exercices et séances de musculation ;
- sauvegarde, restauration, exports CSV et rapports ;
- compte, données invitées, restauration cloud et corbeille.

Les erreurs conservent le message métier utile. Plusieurs déclenchements identiques sont dédupliqués afin de ne pas empiler des notifications équivalentes.

## Confirmation après rechargement

Les actions qui rechargent immédiatement l’application, comme une déconnexion, une désassociation, un import invité ou une restauration cloud, conservent leur confirmation jusqu’au prochain écran. La notification est consommée une seule fois après rechargement.

## Écritures fréquentes

La saisie dans les formulaires, les autosauvegardes et les modifications répétées d’une séance active ne produisent pas un toast à chaque frappe. Elles utilisent toujours l’indicateur discret d’enregistrement déjà présent. Les erreurs restent visibles.

## Accessibilité et mobile

Les confirmations utilisent la région accessible existante, les erreurs restent annoncées comme alertes et l’affichage est limité à quatre notifications. La recette comprend les contrôles sur ordinateur et sur iPhone 15 sous iOS 26.

## Préremplissage des objectifs

L’éditeur d’objectif reprend désormais strictement les données déjà enregistrées quand un objectif existant est modifié : type, nom, cible, dates, échéance et poids de départ historique.

Lors de la création d’un nouvel objectif de poids, SportPilot préremplit le poids de départ avec la dernière pesée disponible. Cette dernière pesée sert uniquement à la création : la modification d’un objectif de poids conserve toujours le poids de départ historique défini lors de l’objectif.

## Compatibilité

- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

**Aucune migration** de données, de sauvegarde ou de registre n’est requise.
