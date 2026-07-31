# Stratégie de test

Statut : **actuel**.

## Niveaux

- Tests de domaine/services : Vitest.
- Composants et pages : Testing Library + jsdom/fake IndexedDB.
- Contrats serveur : tests `.mjs` sous `functions`.
- Audits : scripts statiques et contrôles de cohérence dans `scripts`.
- Parcours : Playwright Chromium, WebKit et variantes mobiles.
- PWA : configuration Playwright dédiée avec vrai service worker.

## Commandes

```text
npm run lint
npm run test
npm run test:stability
npm run build
npm run test:e2e
npm run test:e2e:pwa
npm run check
```

`npm run ci` enchaîne lint, suite complète, build et audits. La CI GitHub
exécute quatre jobs : pipeline qualité, ordre mélangé, Playwright et mise à jour
PWA/conservation des données.

## Matrice UX

- Chromium desktop.
- WebKit iPhone 15.
- Chromium mobile 360.
- Scénarios dédiés 320, 412 et paysage.
- Texte agrandi, clair/sombre, clavier, safe areas et mouvement réduit selon le
  risque.

## Règles de fiabilité

- `maxWorkers: 1` et `isolate: false` sont actuellement configurés dans
  Vitest ; un test ne doit donc pas dépendre d’un cache de module ou état global
  laissé par un autre fichier.
- Toujours annuler timers, mocks, bases et listeners.
- Attendre un état observable, pas un délai arbitraire, sauf simulation
  explicite d’une saisie lente.
- Un timeout, test interrompu ou serveur Preview périmé n’est pas un succès.
- Pour Playwright, forcer un build/port neuf lorsque `reuseExistingServer`
  risquerait de servir un ancien `dist`.

## Documentation seule

Vérifier au minimum les liens locaux Markdown, chemins, commandes, statuts,
contradictions, `git diff --check` et les audits documentaires existants. Ne
modifier aucun code fonctionnel uniquement pour satisfaire un contrôle sans
rapport.
