# Patch SportPilot 0.13.0-alpha.5 — Sélecteur alimentaire par repas

Base attendue : **0.13.0-alpha.4**.

Ce patch ajoute le parcours local d’ajout d’un aliment directement depuis le petit-déjeuner, le déjeuner, le dîner ou les collations.

Fonctionnalités :

- repas et date présélectionnés ;
- aliments récents ;
- aliments favoris ;
- recherche dans tous les aliments locaux ;
- aperçu nutritionnel ;
- quantité ou nombre de portions ;
- ajout direct au journal ;
- création manuelle avec retour vers le repas d’origine.

Aucune migration Dexie et aucune migration du format de sauvegarde ne sont nécessaires.

Après copie du contenu à la racine du projet :

```powershell
npm install
npm run check
npm run dev -- --host
```
