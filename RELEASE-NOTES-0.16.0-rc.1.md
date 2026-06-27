# Notes de publication — SportPilot 0.16.0-rc.1

## Statut

Cette version est une Release Candidate destinée à la validation finale avant SportPilot 0.16.0. Elle ne modifie ni le schéma Dexie v2 ni le format de sauvegarde JSON v2.

## Principales évolutions depuis 0.15.0

### Musculation

- minuteur de repos avec reprise exacte après arrière-plan ;
- statistiques adaptées aux exercices chargés, au poids du corps, assistés, en durée ou en distance ;
- planification hebdomadaire avec report et statut non réalisé ;
- supersets, tri-sets et circuits avec transitions et repos entre tours.

### Nutrition

- actualisation Open Food Facts sans écraser les corrections locales ;
- détection des doublons par code-barres ou nom/marque ;
- portions nommées, fibres et sel visibles ;
- précision du sel conservée jusqu’à deux décimales.

### Endurance

- course avec terrain, dénivelé et intervalles ;
- natation avec longueur de bassin et longueurs calculées ;
- vélo avec distance, vitesse, type, environnement et dénivelé ;
- modèles d’endurance et records recalculés depuis l’historique.

### Tableau de bord

- préréglages Équilibré, Nutrition, Entraînement et Essentiel ;
- visibilité et ordre des blocs configurables ;
- préférences intégrées aux sauvegardes JSON.

### Robustesse

- pipeline CI avec lint, tests, build, audits, ordre aléatoire et Playwright ;
- audit automatique du bundle selon le type de version ;
- audit du dépôt contre les artefacts, archives et secrets suivis par Git ;
- documentation de limitations et procédure de retour arrière alignées.

## Compatibilité

- mise à jour depuis 0.15.0 sans migration ;
- bases et sauvegardes antérieures normalisées automatiquement ;
- fonctionnement local et hors connexion conservé ;
- aucune dépendance npm supplémentaire dans cette phase de stabilisation.

## Validation requise

Avant le tag `v0.16.0-rc.1` :

```text
npm ci
npm run release:verify
npm run test:e2e
```

La checklist manuelle iPhone 15 et les limitations connues doivent également être relues.
