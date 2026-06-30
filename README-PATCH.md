# SportPilot 0.17.0 — promotion stable

Branche recommandée : `release/0.17.0`

Cette phase ne rajoute aucune fonctionnalité métier. Elle prépare la promotion
du contenu validé de `develop` vers la version stable `0.17.0`.

Elle comprend :

- version applicative portée à `0.17.0` ;
- schéma Dexie principal en version 8 ;
- format de sauvegarde JSON en version 7 ;
- synchronisation Dexie Cloud sécurisée et volontaire des pesées ;
- activation distincte sur chaque appareil et liée au compte autorisé ;
- blocage automatique après un changement de compte ;
- outils de laboratoire masqués dans le build public ;
- configuration Vite de production pour l’origine Cloudflare officielle ;
- notes de publication, checklist, installation, limitations et retour arrière
  alignés ;
- procédure de fusion dans `main` et création du tag `v0.17.0`.

Contrôle déterministe complet :

```text
npm run release:verify
```

Contrôles navigateurs :

```text
npm run test:e2e
```

Validation de référence :

- 264 fichiers Vitest ;
- 809 tests Vitest ;
- suite de stabilité validée ;
- build PWA et audits de production validés ;
- validation manuelle sur ordinateur ;
- validation manuelle sur iPhone 15 sous iOS 26 ;
- changement compte A vers compte B sans transfert automatique des pesées ;
- synchronisation bidirectionnelle et reprise hors connexion validées.

Aucune clé privée Dexie Cloud, aucun fichier `.env.local`, `dexie-cloud.json`
ou `dexie-cloud.key` ne doit être ajouté au dépôt.
