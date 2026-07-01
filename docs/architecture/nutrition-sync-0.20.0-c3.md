# SportPilot 0.20.0 C3 — Suivi nutritionnel

C3 synchronise les bilans hebdomadaires et les ajustements caloriques acceptés.

## Agrégat

Un bilan et son ajustement éventuel sont transférés ensemble. Un ajustement sans bilan parent, attaché à une décision non acceptée ou dupliqué est refusé.

## Convergence

La version possédant le `updatedAt` agrégé le plus récent gagne. À égalité, le départage commun de SportPilot garantit un résultat déterministe. Les métadonnées Dexie Cloud ne participent pas aux comparaisons.

## Recalcul des objectifs quotidiens

Après réception d’un ajustement, les objectifs quotidiens déjà enregistrés dont le cumul de calibration est obsolète sont recalculés à partir du profil, des paramètres, du poids, des pas et des activités locales. Le client relance ensuite la synchronisation C1 afin de propager ces objectifs corrigés.

## Versions

- Base cloud : v8
- Runtime local cloud : `sportpilot-sync-runtime-0.20.0-v8`
- Base métier : Dexie v8
- Sauvegarde : JSON v7
- Version applicative pendant le développement : 0.19.0
