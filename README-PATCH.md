# SportPilot 0.24.0 — récompenses et thèmes 2.0

Branche de publication : `feature/rewards-themes-0.24.0`

## Livraison

La version 0.24.0 finalise la roadmap récompenses et thèmes :

- catalogue de 50 badges ;
- catalogue de 15 thèmes ;
- règles de progression et de déblocage conservées dans le domaine récompenses ;
- aperçu rapide par icône œil uniquement ;
- suppression de l’ancien aperçu complet appliqué à l’app ;
- choix global **Complet / Minimaliste** pour le rendu des thèmes ;
- SportPilot classique disponible en minimaliste uniquement ;
- aucun thème animé ;
- rendu sombre stabilisé pour les thèmes accessibles ;
- affichage des distances restantes et progressions de badges arrondi proprement.

## Versions de données

- application : `0.24.0` ;
- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

Aucune migration de données, de sauvegarde ou de registre n’est introduite.

## Vérification

```powershell
npm ci
npm run audit:reward-theme-catalog
npm run release:verify
git diff --check
```

La publication doit être validée sur ordinateur et iPhone 15 sous iOS 26 avant la fusion manuelle dans `main` et la création du tag `v0.24.0`.
