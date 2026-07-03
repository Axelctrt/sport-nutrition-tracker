# SportPilot 0.24.0 R1 — Catalogue récompenses et aperçu des thèmes

## Objectif

La phase R1 prépare la refonte Récompenses et thèmes 2.0 sans publier encore la version stable 0.24.0.
Elle élargit le catalogue visuel et fonctionnel afin de permettre une recette esthétique complète avant le branchement définitif des règles de déblocage.

## Badges

Le catalogue contient désormais cinquante badges structurés par discipline et rareté :

- course à pied ;
- musculation ;
- natation ;
- pas et activité quotidienne ;
- régularité ;
- polyvalence ;
- nutrition et progression.

Les anciens identifiants de badges sont conservés afin de ne pas casser les récompenses déjà synchronisées ou restaurées.
Les nouveaux critères restent centralisés dans le service de récompenses pour éviter des conditions dispersées dans les écrans.

## Thèmes

Le catalogue contient quinze thèmes :

- quatre thèmes historiques ;
- cinq thèmes accessibles ;
- cinq thèmes avancés ;
- un thème légendaire dynamique.

Les nouveaux thèmes ajoutés sont :

- Aurore ;
- Forêt ;
- Océan ;
- Acier ;
- Nuit polaire ;
- Abysses ;
- Volcan ;
- Canopée ;
- Cosmos ;
- Forge ;
- Nexus vivant.

## Mode aperçu

Pendant la phase de test, tous les thèmes peuvent être prévisualisés, même s’ils sont normalement verrouillés.
L’aperçu applique le thème dans l’interface sans le sauvegarder comme thème actif.

Règles :

- un thème verrouillé peut être prévisualisé ;
- seul un thème débloqué peut être appliqué durablement ;
- quitter l’aperçu restaure le thème actif enregistré ;
- un rechargement ne doit pas transformer un aperçu en déblocage réel ;
- les animations dynamiques respectent `prefers-reduced-motion`.

## Données et synchronisation

La phase ne modifie pas les versions de stockage :

- runtime cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre local des espaces : v1.

Aucune migration n’est introduite.
