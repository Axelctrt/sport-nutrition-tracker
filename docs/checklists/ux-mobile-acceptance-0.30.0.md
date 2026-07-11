# Checklist de recette U15 — SportPilot 0.30.0

## Appareil principal

- iPhone 15 sous iOS 26
- Safari puis PWA installée
- orientation portrait, puis paysage sur les écrans principaux

## Navigation et structure

- [ ] Les quatre onglets Accueil, Nutrition, Sport et Progression sont visibles et utilisables.
- [ ] L’onglet courant est identifiable sans dépendre uniquement de la couleur.
- [ ] Le menu complet s’ouvre, piège le focus et se ferme avec son bouton.
- [ ] Le bouton Retour des pages secondaires revient au bon hub.
- [ ] Aucun écran ne défile horizontalement.

## Accessibilité

- [ ] Les actions de l’en-tête et de la navigation basse sont faciles à toucher.
- [ ] VoiceOver annonce correctement les titres, boutons, interrupteurs, champs et états.
- [ ] Les dialogues annoncent leur titre et leur conséquence.
- [ ] Le focus revient au déclencheur après fermeture d’un panneau ou dialogue.
- [ ] Le zoom texte iOS à 200 % ne masque aucune action essentielle.
- [ ] Réduire les animations dans iOS supprime les mouvements non indispensables.
- [ ] Les thèmes clair, sombre et système conservent un contraste lisible.

## Non-régression fonctionnelle

- [ ] Onboarding local complet et conservation du profil après rechargement.
- [ ] Accueil : raccourcis, widgets, pas et poids.
- [ ] Nutrition : changement de date, ajout par repas, scanner, photo, recettes et favoris.
- [ ] Sport : démarrage rapide, activité cardio, séance de musculation et reprise d’une séance active.
- [ ] Progression : poids, objectifs, analyses et historique.
- [ ] Paramètres : apparence, données, compte et sauvegarde.
- [ ] Mode hors ligne : données locales visibles et message compréhensible.
- [ ] Rechargement de la PWA sans perte des données locales.

## Validation finale

- [ ] `npm run audit:ux-mobile-acceptance`
- [ ] `npm run test:e2e:acceptance`
- [ ] suite Vitest complète
- [ ] lint
- [ ] build PWA
- [ ] audit npm
