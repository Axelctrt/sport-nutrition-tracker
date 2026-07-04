# Limitations connues — SportPilot 0.24.0

Ces limitations sont connues et non bloquantes pour la version stable.

## Récompenses et thèmes

Les thèmes verrouillés restent visibles et consultables via l’icône œil. Cette consultation ne vaut pas déblocage et ne permet pas d’activer durablement le thème.

SportPilot classique n’a pas de rendu complet dédié : il est proposé comme thème minimaliste uniquement, car il correspond au style neutre de base.

Nexus vivant est identifié comme thème ultime du catalogue. Dans cette version, il reste statique : aucune animation de thème n’est activée.

## Synchronisation en premier plan

L’automatisation fonctionne lorsque SportPilot est ouvert ou revient au premier plan. Elle ne dépend pas d’une tâche PWA en arrière-plan.

## Mode Wi-Fi uniquement

Certains navigateurs, notamment iOS, n’exposent pas le type de connexion. SportPilot bloque alors volontairement l’automatisation en mode Wi-Fi uniquement.

## Historique

L’historique de synchronisation est local à l’appareil, limité aux vingt dernières opérations par compte et non synchronisé entre appareils.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité.

## Versions de données

SportPilot 0.24.0 utilise le runtime Dexie Cloud v10. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1. Aucune migration n’est requise.
