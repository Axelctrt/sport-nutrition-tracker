# SportPilot 0.23.0 F1 — orchestrateur de synchronisation

## Objectif

F1 introduit un socle unique pour piloter les neuf domaines cloud déjà publiés en 0.22.0. Cette phase ne déclenche aucune synchronisation automatique : le centre manuel reste l’unique point d’entrée actif.

## Responsabilités

L’orchestrateur :

- exécute les domaines séquentiellement ;
- conserve une file de demandes ;
- verrouille les opérations par empreinte de compte, y compris entre deux instances ;
- regroupe les demandes différées rapprochées avec un délai anti-rebond ;
- poursuit les domaines suivants après un échec temporaire ;
- mémorise les seuls domaines à relancer ;
- bloque toute opération cloud hors connexion ;
- distingue analyse et écriture afin qu’une analyse ne puisse jamais synchroniser implicitement.

## États du modèle

Le modèle F1 expose les états suivants :

- `idle` ;
- `queued` ;
- `analyzing` ;
- `up-to-date` ;
- `local-changes-pending` ;
- `cloud-changes-available` ;
- `action-required` ;
- `syncing` ;
- `temporary-failure` ;
- `offline`.

Les services 0.22.0 fournissent actuellement un nombre global de différences. Lorsqu’ils ne permettent pas encore d’identifier avec certitude l’origine locale ou cloud, l’orchestrateur utilise `action-required`. Les états directionnels sont déjà disponibles pour les adaptateurs enrichis des phases F2 et F3.

## File et verrouillage

Chaque orchestrateur possède une file locale. Un verrou partagé, indexé par empreinte de compte normalisée, empêche deux instances de travailler simultanément sur le même compte. Deux comptes différents restent indépendants.

La méthode `schedule()` est disponible pour F2. Elle fusionne les domaines demandés pendant la fenêtre anti-rebond avant d’ajouter une seule opération à la file. Aucun appel automatique à cette méthode n’est installé dans F1.

## Reprise

Un échec est enregistré comme `temporary-failure` sans interrompre les domaines suivants. `retryFailures()` rejoue uniquement les domaines ayant échoué lors de la dernière opération.

## Intégration au centre

Le centre 0.22.0 délègue désormais ses actions manuelles à l’orchestrateur. L’interface conserve :

- les confirmations avant écriture ;
- les détails par rubrique ;
- les dates locales de dernière analyse et synchronisation ;
- la relance ciblée ;
- le fonctionnement local hors connexion.

La file est affichée à titre de diagnostic UX. Aucun changement de données, de runtime cloud ou de format de sauvegarde n’est introduit.

## Versions inchangées

- application affichée : `0.22.0` pendant le développement F1 ;
- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.
