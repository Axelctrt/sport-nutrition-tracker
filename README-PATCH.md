# SportPilot 1.0.2 — maintenance continuité

Branche : `release/1.0.2`.

Base fonctionnelle qualifiée :
`develop@37cae57dc779d6410f35a177403706be0a3eb382`.

Cette branche prépare uniquement la publication de l'extension de continuité
sûre Goals + Weights déjà fusionnée via #173 et validée sur Preview immuable.
Elle ne réimplémente aucun comportement métier.

Garanties conservées :

- Dexie v12 ;
- sauvegarde JSON v10 ;
- runtime Dexie Cloud v16 ;
- whitelist automatique Strength + Goals + Weights uniquement ;
- fail-closed pour `both` et `unknown` ;
- aucune migration D1 ;
- aucune modification de formule calorique ;
- aucun thème modifié ;
- aucun élargissement IA.

La Preview finale, `develop → main`, le tag `v1.0.2`, la GitHub Release et la
production restent des gates techniques séquentiels.
