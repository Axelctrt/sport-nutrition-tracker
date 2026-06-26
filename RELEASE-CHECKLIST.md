# Checklist de publication — SportPilot 0.15.0

## Préparation

- [ ] La branche courante est `release/0.15.0`.
- [ ] `npm install` termine sans vulnérabilité connue.
- [ ] `npm run check` termine sans erreur.
- [ ] La version affichée dans Paramètres est `0.15.0`.
- [ ] Une sauvegarde JSON récente est conservée hors de l’application.
- [ ] Les notes `RELEASE-NOTES-0.15.0.md` ont été relues.

## Non-régression fonctionnelle

- [ ] Création puis modification du profil.
- [ ] Saisie rapide des pas et du poids depuis le tableau de bord.
- [ ] Ajout, modification, duplication et suppression d’un aliment.
- [ ] Recherche Open Food Facts et comportement contrôlé sans réseau.
- [ ] Scan d’un code-barres sur iPhone.
- [ ] Création, modification et suppression d’une activité.
- [ ] Démarrage, saisie de séries, reprise et fin d’une séance de musculation.
- [ ] Création et démarrage d’une séance modèle.
- [ ] Consultation des analyses, de l’historique et du bilan hebdomadaire.
- [ ] Export puis restauration d’une sauvegarde JSON.

## Mobile, accessibilité et PWA

- [ ] Portrait et paysage sur iPhone 15.
- [ ] Largeur équivalente à 320 px sans débordement horizontal.
- [ ] Modes clair et sombre.
- [ ] Navigation basse et menu mobile utilisables avec les safe areas.
- [ ] Focus restitué après fermeture des dialogues et du menu mobile.
- [ ] Champs date contenus dans leur grille.
- [ ] Champs numériques initialisés à zéro directement remplaçables.
- [ ] Sections repliables recentrées à l’ouverture.
- [ ] Installation depuis Safari et ouverture depuis l’écran d’accueil.
- [ ] Données locales accessibles hors connexion.
- [ ] Mise à jour de `0.15.0-rc.1` vers `0.15.0` appliquée sans perte de données.

## Publication Git

- [ ] Le commit stable est poussé sur `origin/release/0.15.0`.
- [ ] La branche est fusionnée dans `develop` sans conflit.
- [ ] `npm run check` réussit sur `develop` après fusion.
- [ ] Le tag annoté `v0.15.0` pointe sur le commit stable validé.
- [ ] Le tag `v0.15.0` est poussé sur le dépôt distant.

## Décision

- [ ] Aucun défaut bloquant.
- [ ] Aucun défaut entraînant une perte de données.
- [ ] Les éventuelles anomalies non bloquantes sont documentées.
- [ ] La publication stable est autorisée.

## Fiabilité des données locales

- [ ] Un export JSON met à jour la date de dernière sauvegarde.
- [ ] Le rappel peut être désactivé ou réglé sur 7, 14 ou 30 jours.
- [ ] Les sept fichiers CSV s’ouvrent correctement en UTF-8.
- [ ] Le diagnostic ne contient ni nom, ni poids, ni repas, ni détail de séance.
- [ ] Une sauvegarde JSON v2 antérieure reste prévisualisable et importable.
- [ ] La prévisualisation indique la compatibilité et les migrations nécessaires.
