# SportPilot 0.15.0 — suivi des sports d’endurance

Branche recommandée : `feature/endurance-tracking`

Cette phase développe la course, la natation et le vélo sans dépendre d’un compte, d’un backend, de Garmin ou de Strava :

- course enrichie avec dénivelé positif, terrain et description facultative des segments ou intervalles ;
- natation enrichie avec longueur de bassin, nombre de longueurs calculé et séries facultatives ;
- vélo spécialisé avec distance, dénivelé, vitesse moyenne calculée, type de vélo et pratique intérieure ou extérieure ;
- page Analyses étendue aux volumes hebdomadaires, sorties les plus longues, meilleures allures ou vitesses et records de dénivelé ;
- records sur distances usuelles calculés uniquement lorsqu’une séance complète correspond réellement à la distance ;
- modèles simples de course, natation et vélo, modifiables et duplicables ;
- préremplissage d’une activité depuis un modèle sans modifier la date ni créer automatiquement un programme ;
- export CSV enrichi avec les nouvelles données ;
- sauvegarde JSON v2 compatible avec les nouveaux champs facultatifs ;
- scénario Playwright Chromium et WebKit proche d’un iPhone 15.

Architecture retenue :

- aucune nouvelle table Dexie et aucun nouvel index ;
- les nouveaux champs d’activité sont facultatifs ;
- les modèles sont stockés dans `AppSettings.enduranceTemplates` avec une version locale ;
- les records, allures, vitesses, longueurs et volumes hebdomadaires sont recalculés depuis les activités et ne sont pas stockés ;
- une ancienne base ou sauvegarde sans modèles reçoit les quatre modèles par défaut ;
- aucune dépendance npm supplémentaire ;
- le calculateur de disques abandonné n’est pas inclus.

Contrôles :

```text
npm run ci
npm run test:stability
npm run test:e2e
```
