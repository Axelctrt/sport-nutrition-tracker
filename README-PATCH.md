# SportPilot 1.0.4 — continuité Activities + Goals both

Branche : `release/1.0.4`.

Base fonctionnelle qualifiée :
`develop@01d317dd62ddbbdc77002add1ccb7411d08049a2`.

Ce lot prépare uniquement la publication du chantier #179 déjà fusionné et qualifié. Il ne réimplémente aucun comportement métier.

Garanties conservées :

- résolution Goals `both` exclusivement manuelle et explicite ;
- `unknown` et `both` fail-closed dans l’automatisme ;
- automatisme limité à Strength + Goals + Weights + Activities ;
- Dexie v12 ;
- sauvegarde JSON v10 ;
- runtime Dexie Cloud v16 ;
- aucune migration D1 ;
- aucune modification de formule calorique ;
- aucun thème modifié ;
- aucun élargissement IA.

La Preview finale versionnée, le smoke physique, `develop → main`, le tag `v1.0.4`, la GitHub Release et la production restent des gates techniques séquentiels.
