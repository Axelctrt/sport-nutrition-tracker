# SportPilot 0.28.0 — F7 stable series audit fix

Ce correctif aligne globalement les audits et readiness tests encore bloqués sur les séries stables jusqu'à `0.27.x` afin qu'ils acceptent aussi `0.28.x`.

## Périmètre

- Scripts d'audit `scripts/**/*.mjs`
- Readiness tests `src/app/**/*.ts`
- Test aperçu paramètres `src/features/settings/components/**/*.tsx`

## Invariants préservés

- Dexie locale : v10
- Sauvegarde JSON : v9
- Runtime cloud prototype : v14
- Aucune logique métier modifiée
- Aucun bump additionnel de version applicative

## Application

```powershell
Expand-Archive `
  .\sportpilot-0.28.0-f7-stable-series-audit-fix.zip `
  -DestinationPath . `
  -Force

node .\apply-phase-0.28.0-f7-stable-series-audit-fix.mjs
```
