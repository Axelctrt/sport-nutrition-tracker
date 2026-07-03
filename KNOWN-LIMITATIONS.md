# Limitations connues — SportPilot 0.23.1

Ces limitations sont connues et non bloquantes pour la version stable.

## Notifications d’action

Les changements très fréquents, notamment la saisie de séries, les autosauvegardes et chaque frappe dans un formulaire, n’affichent pas un toast systématique. Ils utilisent l’indicateur local `Enregistrement… / Enregistré / Erreur` afin d’éviter une succession intrusive de notifications.

Une confirmation conservée après rechargement dépend de `sessionStorage`. Si le navigateur le refuse, l’action métier reste terminée mais le toast post-rechargement peut être absent.

## Synchronisation en premier plan

L’automatisation fonctionne lorsque SportPilot est ouvert ou revient au premier plan. Elle ne dépend pas d’une tâche PWA en arrière-plan.

## Mode Wi-Fi uniquement

Certains navigateurs, notamment iOS, n’exposent pas le type de connexion. SportPilot bloque alors volontairement l’automatisation en mode Wi-Fi uniquement.

## Historique

L’historique de synchronisation est local à l’appareil, limité aux vingt dernières opérations par compte et non synchronisé entre appareils.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité.

## Versions de données

SportPilot 0.23.1 utilise le runtime Dexie Cloud v10. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1.


## Récompenses et thèmes 0.24.0 R1

Le mode aperçu permet volontairement de visualiser les thèmes verrouillés pendant les tests. Cette prévisualisation ne vaut pas déblocage et ne doit pas être considérée comme une règle de progression définitive.

Les conditions de déblocage des nouveaux thèmes pourront être réajustées après validation esthétique.
