# SportPilot 0.15.0 — sécurité et confidentialité

Branche recommandée : `security/cloudflare-headers-and-privacy`

Ce patch ajoute :

- une page publique `#/privacy` accessible avant la création du profil ;
- des explications précises sur IndexedDB, Open Food Facts, la caméra, les sauvegardes et la suppression ;
- un fichier Cloudflare `public/_headers` avec CSP, permissions et protection anti-intégration ;
- un audit automatique des en-têtes après le build ;
- un parcours Playwright vérifiant les en-têtes réels de la prévisualisation de production.

Compatibilité conservée :

- schéma Dexie v2 ;
- sauvegarde JSON v2 ;
- PWA et scanner caméra ;
- appels Open Food Facts ;
- fonctionnement hors connexion.

Contrôles :

```text
npm ci
npm run ci
npm run test:stability
npm run test:e2e
```
