# Retour arrière — SportPilot 1.0.4

## Référence stable précédente

- version : `1.0.3` ;
- `main` : `9c6ea1df7ea3f686020b7b86f49def0ecc85a9cd` ;
- tag : `v1.0.3` ;
- production : `https://sportpilot-pages.pages.dev`.

Candidate 1.0.4 préparée depuis :

- `develop@01d317dd62ddbbdc77002add1ccb7411d08049a2` ;
- branche `release/1.0.4`.

## Compatibilité des données

La maintenance 1.0.4 ne change aucun schéma :

- Dexie v12 ;
- sauvegarde JSON v10 ;
- runtime Dexie Cloud v16 ;
- aucune migration D1.

## Stratégie en cas d'incident

1. STOP si perte de données, écrasement, contamination inter-compte, doublon persistant ou crash bloquant est observé.
2. Préserver IndexedDB et les données cloud ; ne jamais nettoyer les bases pour masquer le symptôme.
3. Identifier le SHA et le deployment Pages exacts concernés.
4. Préférer un correctif en avant compatible avec Dexie v12.
5. Un redéploiement d'un deployment immuable antérieur n'est envisagé qu'après vérification explicite de la compatibilité des données.
6. Ne lancer aucune migration D1 lors d'un rollback de cette maintenance.

Les formules calories/macros, les thèmes et le périmètre IA ne sont pas modifiés par cette maintenance.
