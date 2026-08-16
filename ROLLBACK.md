# Retour arrière — SportPilot 1.0.1

## Références avant publication

Stable publiée avant la maintenance P0 :

- version : `1.0.0` ;
- `main` : `d3ff60017027295f75b665d7efe2a037db69d69e` ;
- tag : `v1.0.0` ;
- production : `https://sportpilot-pages.pages.dev`.

Candidate 1.0.1 préparée depuis :

- `develop@bec369ff7960dc897f7f34db42a6d8253a48ed36` ;
- branche `release/1.0.1`.

## Compatibilité des données

La maintenance 1.0.1 ne change aucun schéma :

- Dexie v12 ;
- sauvegarde JSON v10 ;
- runtime Dexie Cloud v16 ;
- aucune migration D1.

## Stratégie en cas d'incident

1. STOP si perte de données, écrasement, contamination inter-compte ou crash
   bloquant est observé.
2. Préserver IndexedDB et les données cloud ; ne jamais nettoyer les bases pour
   tenter de masquer le symptôme.
3. Identifier le SHA et le deployment Pages exacts.
4. Préférer un correctif en avant compatible avec Dexie v12.
5. Un redéploiement d'un deployment immuable antérieur n'est envisagé qu'après
   vérification explicite de la compatibilité des données et autorisation
   propriétaire.
6. Ne lancer aucune migration D1 lors d'un rollback de cette maintenance.
