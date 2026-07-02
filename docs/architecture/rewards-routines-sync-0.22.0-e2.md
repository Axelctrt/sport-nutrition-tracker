# SportPilot 0.22.0 E2 — récompenses, thèmes et routines synchronisables

## Objectif

E2 complète la continuité du compte en synchronisant la progression ludique et les routines qui doivent suivre l’utilisateur d’un appareil à l’autre, sans synchroniser les préférences purement techniques ou visuelles de l’appareil.

L’interface reste provisoirement en version `0.21.1` pendant le développement de la roadmap `0.22.0`. Le passage de la version applicative à `0.22.0` sera réalisé au lot E4.

## Agrégat cloud

La table cloud `realRewardsRoutines` contient un agrégat unique identifié par `rewards-routines` pour chaque propriétaire Dexie Cloud. Il regroupe :

- les succès obtenus ;
- les thèmes visuels SportPilot débloqués ;
- le thème visuel SportPilot actif ;
- les missions hebdomadaires terminées ;
- les préférences de rappels de routine ;
- les rappels de routine déjà accomplis.

L’agrégat est filtré strictement par propriétaire cloud. Un appareil connecté au compte A ne peut ni analyser ni appliquer l’agrégat du compte B.

## Règles de fusion non destructives

Les ensembles de progression sont fusionnés par union :

- un succès déjà obtenu n’est jamais retiré ;
- un thème déjà débloqué n’est jamais reverrouillé ;
- une mission terminée n’est jamais annulée ;
- un rappel déjà accompli n’est jamais recréé par un appareil moins à jour.

Lorsque le même élément existe des deux côtés, la date la plus ancienne est conservée pour représenter le premier accomplissement réel.

Le thème visuel actif et les préférences de rappels ne sont pas des ensembles cumulatifs. La version la plus récente gagne selon son horodatage, avec une comparaison déterministe en cas d’égalité.

## Horodatage des rappels

`UserSettings.routineReminderUpdatedAt` suit uniquement les modifications des préférences de rappels de routine.

Cette séparation évite deux faux conflits :

- une modification d’un réglage partageable E1 ne rend pas artificiellement les rappels E2 plus récents ;
- une modification des rappels E2 ne rend pas artificiellement l’ensemble des réglages E1 plus récent.

Le champ reste optionnel dans les sauvegardes JSON v7. En son absence, les données historiques utilisent l’horodatage général des réglages comme valeur de compatibilité.

## Protection d’un appareil neuf

Un appareil sans progression réelle et encore configuré avec les valeurs par défaut est considéré comme non initialisé. Dans ce cas :

- les valeurs cloud existantes sont téléchargées ;
- les valeurs locales par défaut ne peuvent pas écraser le cloud ;
- l’analyse reste idempotente après la première initialisation locale nécessaire.

Cette règle couvre notamment le thème visuel SportPilot par défaut et les préférences de rappels créées automatiquement au premier lancement.

## Données restant propres à l’appareil

E2 ne synchronise pas :

- le mode clair, sombre ou système ;
- la demande de stockage persistant ;
- le minuteur de repos, ses sons et vibrations ;
- l’activation locale de la synchronisation automatique ;
- les métadonnées et rappels techniques de sauvegarde.

Le « thème visuel SportPilot » synchronisé par E2 est distinct du mode clair ou sombre de l’interface.

## Restauration après nouvelle installation

La restauration groupée D3 inclut désormais la catégorie `rewardsRoutines` :

1. le cloud est analysé en lecture seule ;
2. l’agrégat E2 est filtré par propriétaire ;
3. les états utilisateur sont préparés avec les autres domaines ;
4. l’écriture locale est appliquée atomiquement ;
5. les services de récompenses et de rappels sont rechargés après restauration.

La restauration n’efface jamais une progression locale plus riche : les ensembles sont fusionnés selon les règles non destructives décrites ci-dessus.

## Versions de stockage

| Élément | Version après E2 |
|---|---:|
| Runtime Dexie Cloud | 10 |
| Nom du runtime local cloud | `sportpilot-sync-runtime-0.20.0-v10` |
| Base métier Dexie | 8 |
| Sauvegarde JSON | 7 |
| Registre des espaces | 1 |

Le passage du runtime v9 au runtime v10 ajoute la table `realRewardsRoutines`. Il ne modifie ni le schéma métier ni le format de sauvegarde, mais peut demander une nouvelle authentification OTP lors du premier lancement sur chaque appareil.

## Scénarios de validation

- envoi initial puis seconde analyse à zéro différence ;
- union de deux progressions différentes sans perte ;
- conservation de la date d’obtention la plus ancienne ;
- propagation du thème visuel SportPilot actif le plus récent ;
- absence de propagation du mode clair ou sombre ;
- propagation des préférences de rappels les plus récentes ;
- conservation des rappels accomplis afin qu’ils ne réapparaissent pas ;
- téléchargement prioritaire sur un appareil neuf ;
- restauration E2 sur une installation vide ;
- isolation stricte entre deux comptes.
