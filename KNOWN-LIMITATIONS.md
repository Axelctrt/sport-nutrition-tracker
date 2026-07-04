# Limitations connues — SportPilot 0.25.0

Ces limitations sont connues et non bloquantes pour la version stable.

## Estimation photo nutrition

L’analyse photo 0.25.0 n’est pas une vraie reconnaissance IA. Elle fournit un fallback local volontairement générique, avec confiance faible, afin d’aider l’utilisateur à démarrer une saisie sans prétendre identifier précisément l’aliment ou la portion.

L’utilisateur doit toujours vérifier et corriger l’aliment, la quantité, les calories et les macros avant ajout au journal.

## Confidentialité

La photo sélectionnée reste locale pendant le parcours. SportPilot 0.25.0 ne persiste pas l’image dans Dexie et ne l’envoie pas vers un service externe. Une future intégration IA devra passer par un backend ou proxy avec consentement clair.

## Budget JavaScript

La version 0.25.0 peut dépasser le budget JavaScript historique. Ce dépassement est accepté pour conserver une interface photo mobile claire et testable. L’optimisation du bundle doit être traitée ultérieurement comme chantier technique global.

## Synchronisation en premier plan

L’automatisation fonctionne lorsque SportPilot est ouvert ou revient au premier plan. Elle ne dépend pas d’une tâche PWA en arrière-plan.

## Mode Wi-Fi uniquement

Certains navigateurs, notamment iOS, n’exposent pas le type de connexion. SportPilot bloque alors volontairement l’automatisation en mode Wi-Fi uniquement.

## Historique

L’historique de synchronisation est local à l’appareil, limité aux vingt dernières opérations par compte et non synchronisé entre appareils.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité.

## Versions de données

SportPilot 0.25.0 utilise le runtime Dexie Cloud v10. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1. Aucune migration n’est requise.
