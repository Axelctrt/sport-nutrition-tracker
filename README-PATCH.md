# Patch SportPilot 0.13.0-alpha.6

Ce patch s’applique sur la version `0.13.0-alpha.5`, depuis la branche :

```text
feature/meal-food-off-search
```

Il intègre la recherche textuelle Open Food Facts directement dans le sélecteur alimentaire ouvert depuis un repas.

## Installation

1. arrêter Vite ;
2. copier le contenu du patch à la racine du projet ;
3. exécuter :

```powershell
npm install
npm run check
npm run dev -- --host
```

## Résultats attendus

```text
Version : 0.13.0-alpha.6
Fichiers de tests : 54 réussis
Tests : 213 réussis
Build PWA : réussi
Audit MVP : réussi
```

Aucune migration Dexie ou de sauvegarde JSON n’est nécessaire.
