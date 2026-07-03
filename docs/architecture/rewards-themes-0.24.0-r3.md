# SportPilot 0.24.0 R3 — Thèmes spectaculaires et immersifs

## Objectif

La R3 remplace l’approche trop discrète des thèmes R2 par une direction artistique beaucoup plus marquée. Les thèmes avancés deviennent des décors illustratifs, tandis que les thèmes accessibles restent plus modérés.

## Périmètre

- **Océan** : bulles, poissons, lumière sous-marine et reflets visibles.
- **Abysses** : profondeur sombre, silhouettes marines, bulles, coraux et lumière filtrée.
- **Volcan** : coulées de lave, fumée, cendres, braises et roche noire.
- **Canopée** : feuillage dense, lianes, ombres organiques et lumière de jungle.
- **Cosmos** : nébuleuses, étoiles, anneaux et planètes diffuses.
- **Forge** : acier, feu, étincelles, braises et atelier de force.
- **Nexus vivant** : thème légendaire multicouche avec énergie animée, particules mythiques et halo dynamique.

## Choix technique

Les décors restent en CSS et SVG inline via `data:image/svg+xml`. Aucun asset image lourd n’est ajouté au dépôt. Les miniatures de prévisualisation utilisent des scènes dédiées via `data-sport-preview` afin que l’utilisateur puisse juger le style avant le branchement définitif des règles de déblocage.

## Animation et performance

Les animations sont limitées aux fonds et aux miniatures. Elles respectent `prefers-reduced-motion: reduce`. Sur mobile, les fonds sont redimensionnés et recentrés afin d’éviter les débordements horizontaux.

## Verrouillage

La R3 reste une phase esthétique : elle ne débloque aucun thème artificiellement. Les thèmes verrouillés restent prévisualisables, mais leur application durable dépend toujours des règles de récompense.

## Stockage

Aucune migration n’est introduite.

- Runtime cloud : v10
- Dexie : v8
- Sauvegarde JSON : v7
- Registre des espaces : v1
