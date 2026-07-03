# Limitations connues — SportPilot 0.23.0

Ces limitations sont connues et non bloquantes pour la version stable.

## Synchronisation en premier plan

L’automatisation fonctionne lorsque SportPilot est ouvert ou revient au premier plan. Elle ne dépend pas d’une tâche PWA en arrière-plan et ne garantit donc pas un traitement lorsque l’application est totalement fermée.

## Mode Wi-Fi uniquement

Certains navigateurs, notamment iOS, n’exposent pas le type de connexion. Dans ce cas, SportPilot bloque volontairement l’automatisation en mode Wi-Fi uniquement. Les actions manuelles et le mode Toute connexion restent disponibles.

## Interruption d’une requête engagée

Une requête cloud déjà engagée ne peut pas être annulée de manière fiable par le navigateur. Lors d’une fermeture ou d’un changement de compte, SportPilot laisse le domaine courant terminer, n’entame pas les domaines suivants et ignore les résultats tardifs pour l’état du nouveau compte.

## Centre de synchronisation

Les neuf domaines sont traités séquentiellement afin d’éviter des accès concurrents au runtime cloud. Une synchronisation complète peut prendre plus de temps qu’une action ciblée. Les panneaux détaillés sont chargés uniquement à la demande.

## Historique

L’historique récent est local à l’appareil, limité aux vingt dernières opérations par compte et non synchronisé entre appareils. Son indisponibilité ne bloque jamais une synchronisation.

## Conflits simultanés

La résolution utilise les règles déterministes propres à chaque domaine. Les domaines fusionnables convergent sans perte. Lorsqu’un choix directionnel local ou cloud ne peut pas être garanti, le centre demande d’examiner les différences au lieu de simuler un remplacement global.

## Espace invité

Les données invitées restent séparées après déconnexion et peuvent être importées explicitement. Une modification effectuée hors session ne part pas automatiquement vers un compte.

## Données restant locales

Le mode clair, sombre ou système, le stockage persistant, le minuteur de repos, l’autorisation de synchronisation automatique et les métadonnées de sauvegarde restent propres à l’appareil.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité. L’espace actif reste utilisable hors connexion, mais l’analyse, la restauration cloud et les synchronisations nécessitent une connexion.

## Versions de données

SportPilot 0.23.0 utilise le runtime Dexie Cloud v10 et le runtime local `sportpilot-sync-runtime-0.20.0-v10`. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1.
