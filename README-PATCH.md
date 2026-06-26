# Correctif Playwright E2E

Ce patch corrige les sélecteurs Playwright et réduit l'exécution à un worker pour stabiliser Chromium et WebKit sous Windows.

Fichiers concernés :
- playwright.config.ts
- e2e/activity.spec.ts
- e2e/daily-tracking.spec.ts
- e2e/food-and-backup.spec.ts
- e2e/onboarding-and-navigation.spec.ts
- e2e/strength.spec.ts
