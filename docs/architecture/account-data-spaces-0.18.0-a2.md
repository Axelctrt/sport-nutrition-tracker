# SportPilot 0.18.0 A2 — liaison explicite du compte

## Objectif

Ce lot relie chaque compte Dexie Cloud à une base IndexedDB locale distincte sans jamais associer automatiquement les données de l’espace invité.

## Barrière de confidentialité

L’application métier n’est pas montée lorsque le compte connecté ne correspond pas à l’espace actif. Le garde d’espace attend la fin de l’initialisation Dexie Cloud, puis applique les règles suivantes :

- compte déconnecté + espace invité : ouverture normale ;
- compte déconnecté + espace de compte : retour automatique à l’espace invité puis rechargement ;
- compte connecté + espace correspondant : ouverture normale ;
- compte connecté + autre espace : écran bloquant de sélection ;
- compte connu sur l’appareil : ouverture explicite de son espace ;
- nouveau compte depuis l’espace invité : choix entre copie locale et espace vide.

Cette barrière évite qu’un écran du compte A reste visible après la connexion du compte B.

## Association des données invitées

Le choix « Rattacher mes données » :

1. ouvre une base de compte distincte ;
2. vérifie qu’elle ne contient aucune donnée utilisateur ;
3. copie les tables applicatives par lots de 500 en conservant les identifiants ;
4. exclut uniquement le journal de migration et les diagnostics techniques ;
5. active l’espace de compte après la réussite complète ;
6. conserve intégralement la base invitée d’origine.

En cas d’échec, la base cible partielle est supprimée et l’espace actif reste inchangé.

## Espace vide

Le choix « Commencer avec un espace vide » initialise le schéma Dexie v8 dans une nouvelle base, sans copier ni supprimer aucune donnée.

## Changement et déconnexion

Le changement d’espace est finalisé par un rechargement de la PWA. Les repositories, services et coordinators sont ainsi recréés sur la bonne instance `AppDatabase`.

Lors d’une déconnexion depuis un espace de compte, SportPilot réactive automatiquement l’espace invité puis recharge l’application. Les données du compte restent conservées dans leur base isolée.

## Invariants conservés

- version applicative : `0.17.1` pendant le développement de la phase ;
- schéma Dexie : `v8` ;
- sauvegarde JSON : `v7` ;
- aucune donnée invitée supprimée ;
- aucun email, jeton ou identifiant brut stocké dans le registre des espaces ;
- synchronisation réelle des pesées uniquement après ouverture de l’espace correspondant.
