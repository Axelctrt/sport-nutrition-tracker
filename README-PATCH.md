# Patch SportPilot 0.13.0-alpha.8

Branche recommandée : `feature/barcode-scanner`

Ce patch transforme le prototype caméra en parcours alimentaire complet :

- recherche prioritaire dans les aliments locaux ;
- fonctionnement hors connexion pour un produit déjà enregistré ;
- recherche Open Food Facts par code-barres si nécessaire ;
- enregistrement local du produit distant ;
- choix de la quantité ou du nombre de portions ;
- ajout direct au repas présélectionné ;
- création manuelle avec code-barres prérempli ;
- accès direct à la recherche textuelle Open Food Facts ;
- arrêt et annulation des requêtes en cas de changement de page ;
- proxy Vite compatible avec les Quick Tunnels Cloudflare.

Aucune migration Dexie ni migration de sauvegarde n'est nécessaire.

## Validation

Exécuter séparément :

```powershell
npm install --registry=https://registry.npmjs.org/
npm run check
```

Résultat attendu après installation complète :

- 58 fichiers de tests ;
- 234 tests ;
- lint sans erreur ;
- build Vite/PWA réussi ;
- audit MVP réussi.
