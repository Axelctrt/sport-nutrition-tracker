# SportPilot 0.15.0-alpha.10 — profil, paramètres et sauvegarde mobile

Branche obligatoire : `feature/mobile-profile-settings-backup-ux`

Cette étape optimise les écrans de configuration et de gestion des données sans modifier les calculs ni les formats existants :

- résumé compact du profil avec objectif, poids de référence, pas et coefficients de macronutriments ;
- formulaire de profil réparti en sections progressives et bouton d’enregistrement fixe dans le flux de page ;
- résumé des paramètres avec thème, stockage, seuil de pas et limite de calibration ;
- coefficients techniques, MET de natation et calibration placés dans des sections repliables ;
- confirmation avant le rétablissement des paramètres par défaut ;
- champs numériques adaptés aux claviers mobiles et ouverture automatique de la section contenant une erreur ;
- skeleton partagé pendant le chargement des paramètres ;
- page de sauvegarde recentrée sur les actions exporter et restaurer ;
- aperçu compact du contenu d’une sauvegarde avant son import ;
- confirmation accessible avant le remplacement complet des données ;
- suppression définitive protégée par un dialogue exigeant la saisie `EFFACER` ;
- informations de confidentialité, stockage et fonctionnement PWA repliées ;
- aucune migration Dexie et aucune modification du format de sauvegarde JSON.

## Validation

```powershell
npm install
npm run check
```

Tester en priorité sur iPhone 15 en portrait puis en paysage, en modes clair et sombre.
