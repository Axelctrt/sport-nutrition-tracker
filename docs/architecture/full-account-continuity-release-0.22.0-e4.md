# SportPilot 0.22.0 E4 — publication de la continuité complète du compte

## Objectif

E4 gèle et publie les lots E1, E2 et E3 sous la version stable `0.22.0`. Il n’ajoute pas de nouveau domaine métier : il consolide les invariants de publication, la documentation, les audits et les scénarios multiappareils.

## Périmètre publié

Le centre unifié pilote neuf rubriques :

1. profil et réglages partageables ;
2. récompenses et routines ;
3. pesées ;
4. activités ;
5. objectifs ;
6. musculation ;
7. journal nutritionnel ;
8. bibliothèque nutritionnelle ;
9. suivi nutritionnel.

Les services unitaires restent responsables de la détection des différences, des règles de fusion, des marqueurs de suppression et du filtrage par propriétaire. Le centre ne réimplémente aucune règle métier.

## Restauration complète

La restauration initiale agrège les mêmes domaines que la synchronisation. Le cloud est lu sans modification, les données sont préparées dans une base temporaire, les empreintes source et cible sont revérifiées, puis la cible locale est appliquée atomiquement. Les valeurs par défaut d’un appareil vierge ne remplacent jamais un compte déjà renseigné.

## Isolation et conflits

- chaque ligne cloud est filtrée par propriétaire ;
- les métadonnées du centre sont indexées par empreinte locale du compte ;
- les états cumulatifs de progression sont fusionnés par union ;
- les dates d’obtention les plus anciennes sont conservées ;
- les préférences mutables utilisent leur horodatage ;
- une rubrique en erreur n’interrompt pas les suivantes ;
- aucune opération cloud n’est lancée hors connexion.

## Versions de données

| Élément | Version publiée |
| --- | --- |
| Application | `0.22.0` |
| Runtime Dexie Cloud | `v10` |
| Runtime local | `sportpilot-sync-runtime-0.20.0-v10` |
| Base métier Dexie | `v8` |
| Sauvegarde JSON | `v7` |
| Registre des espaces | `v1` |

E4 ne modifie aucun schéma. Le passage d’application de `0.21.1` à `0.22.0` est un gel de publication.

## Garde-fous

- test de préparation `fullAccountContinuityReleaseReadiness` ;
- audit `audit:full-account-continuity-release` dans `check` et `ci` ;
- audits historiques E1, E2, E3, D1 à D4 et isolation maintenus ;
- validation `release:verify` incluant la suite mélangée ;
- budgets de production inchangés ;
- documentation de publication, limites et retour arrière versionnées.
