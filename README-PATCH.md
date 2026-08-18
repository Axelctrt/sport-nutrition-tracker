# SportPilot 1.0.3 — hotfix continuité Goals

Branche : `release/1.0.3`.

Base fonctionnelle qualifiée :
`develop@e4b0992ad3b524a529e6962f54407235263f6fa5`.

Ce lot prépare uniquement la publication du hotfix Goals déjà fusionné via #176 et qualifié sur Preview fonctionnelle. Il ne réimplémente aucun comportement métier.

Garanties conservées :

- réconciliation initiale Goals legacy explicite ;
- `unknown` et `both` fail-closed hors parcours initial autorisé ;
- automatisme Strength + Goals + Weights uniquement ;
- Dexie v12 ;
- sauvegarde JSON v10 ;
- runtime Dexie Cloud v16 ;
- aucune migration D1 ;
- aucune modification de formule calorique ;
- aucun thème modifié ;
- aucun élargissement IA.

La Preview finale versionnée, `develop → main`, le tag `v1.0.3`, la GitHub Release et la production restent des gates techniques séquentiels.
