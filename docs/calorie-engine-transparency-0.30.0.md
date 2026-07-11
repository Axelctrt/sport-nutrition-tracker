# SportPilot 0.30.0 — Transparence du moteur calorique (U2B.6)

## Objectif

Rendre immédiatement compréhensible la construction de la cible calorique quotidienne, sans obliger l’utilisateur à mémoriser une valeur précédente ou à ouvrir plusieurs écrans.

## Vue quotidienne

Le détail de l’Accueil distingue désormais :

- la dépense estimée hors sport ;
- la cible avant sport ;
- les calories des séances encore prévues ;
- les calories des activités déjà réalisées ;
- l’impact réellement appliqué à la cible après arrondi et plancher ;
- la cible alimentaire actuelle.

Chaque élément sportif est classé comme :

- séance encore prévue ;
- séance planifiée réalisée ;
- activité imprévue ;
- marche déjà incluse dans les pas.

Pour une activité planifiée puis réalisée, l’interface affiche l’estimation initiale et l’écart prévu/réel. Elle indique également si la dépense provient du calcul automatique ou d’une saisie manuelle.

## Planning

Les cartes du planning affichent directement l’estimation calorique persistée dans la cible quotidienne :

- musculation : durée, style et calories estimées ou réelles ;
- endurance : objectif prévu et calories prévues ;
- activité réalisée : calories réelles.

L’affichage du planning reste non bloquant si les cibles quotidiennes ne sont pas momentanément disponibles.

## Règles de calcul

La transparence ne modifie pas les formules énergétiques. Elle restitue les données calculées par le moteur existant :

- poids hebdomadaire de référence ;
- activité professionnelle ;
- pas ;
- dépenses nettes des activités ;
- ajustement de l’objectif ;
- calibration acceptée ;
- plancher calorique ;
- arrondi final à 10 kcal.

Les anciennes cibles qui ne contiennent pas certains champs optionnels restent lisibles. Les valeurs de transparence sont reconstruites au moment du calcul quotidien et ne nécessitent aucune migration.

## Compatibilité

- aucune migration Dexie ;
- aucune migration D1 ;
- aucune nouvelle table ;
- aucun changement de contrat Cloudflare ;
- aucune réécriture automatique des journées passées.
