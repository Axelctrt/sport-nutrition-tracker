# SportPilot 0.15.0-alpha.12 — navigation mobile et expérience PWA

Branche obligatoire : `feature/mobile-navigation-pwa-ux`

Cette étape finalise la navigation et les états transversaux sur téléphone sans modifier les données ni les calculs :

- nouveau menu mobile complet dans l’en-tête ;
- accès direct à la musculation, à l’historique, au bilan, à la sauvegarde et aux informations de calcul ;
- profil et paramètres également disponibles dans ce menu, en complément de leurs raccourcis mobiles ;
- état actif du menu lorsqu’un écran secondaire est ouvert ;
- feuille accessible avec focus initial, verrouillage du scroll, boucle de tabulation, Échap et restitution déterministe du focus au bouton Menu ;
- instructions d’installation adaptées à Safari sur iPhone ;
- bouton d’installation native dans le menu sur les navigateurs compatibles ;
- indication claire lorsque SportPilot fonctionne déjà comme application installée ;
- bannière hors connexion plus explicite et confirmation du retour du réseau ;
- invite de mise à jour PWA adaptée à la navigation basse et aux safe areas ;
- page Informations sur les calculs organisée en sections repliables ;
- pages hors connexion et introuvable avec actions de reprise plus claires ;
- aucune migration Dexie et aucune modification du format de sauvegarde JSON.

## Validation

```powershell
npm install
npm run check
```

Tester en priorité le menu complet, l’installation depuis Safari, le retour du réseau et la mise à jour PWA sur iPhone 15 en portrait puis en paysage.
