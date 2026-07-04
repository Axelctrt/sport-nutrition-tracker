# SportPilot 0.25.0 — estimation photo nutritionnelle

Branche de publication : `feature/photo-nutrition-0.25.0`

## Livraison

La version 0.25.0 finalise la première itération du parcours photo nutrition :

- bouton `Photo` depuis les repas du journal alimentaire ;
- choix d’une photo via le sélecteur natif mobile ;
- aperçu de la photo sélectionnée, nom et taille du fichier ;
- suppression manuelle de la photo avant analyse ;
- estimation locale prudente avec confiance faible ;
- correction manuelle de l’aliment, de la quantité, des calories et des macros ;
- ajout au bon repas du journal alimentaire ;
- messages d’erreur pour absence de photo ou fichier non image ;
- notice de confidentialité indiquant qu’aucune image n’est envoyée en 0.25.0 ;
- documentation de préparation pour une future API IA/backend.

## Versions de données

- application : `0.25.0` ;
- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

Aucune migration de données, de sauvegarde ou de registre n’est introduite.

## Vérification

```powershell
npm ci
npm run audit:photo-nutrition
npm run release:verify
git diff --check
```

La publication doit être validée sur ordinateur et iPhone 15 sous iOS 26 avant la fusion manuelle dans `main` et la création du tag `v0.25.0`.
