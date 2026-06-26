# Checklist de validation — SportPilot 0.15.0-rc.1

## Préparation

- [ ] `npm install` termine sans vulnérabilité connue.
- [ ] `npm run check` termine sans erreur.
- [ ] La version affichée dans Paramètres est `0.15.0-rc.1`.
- [ ] Une sauvegarde JSON récente a été exportée et conservée hors de l’application.

## Parcours critiques

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

## Mobile et accessibilité

- [ ] Portrait et paysage sur iPhone 15.
- [ ] Largeur équivalente à 320 px sans débordement horizontal.
- [ ] Modes clair et sombre.
- [ ] Navigation basse et menu mobile utilisables avec les safe areas.
- [ ] Focus restitué après fermeture des dialogues et du menu mobile.
- [ ] Champs date contenus dans leur grille.
- [ ] Champs numériques initialisés à zéro directement remplaçables.
- [ ] Sections repliables recentrées à l’ouverture.

## PWA et réseau

- [ ] Installation depuis Safari via Ajouter à l’écran d’accueil.
- [ ] Ouverture depuis l’icône installée.
- [ ] Données locales accessibles hors connexion.
- [ ] Bannière de retour du réseau affichée puis masquée.
- [ ] Mise à jour PWA détectée et appliquée sans perte de données.

## Décision

- [ ] Aucun défaut bloquant.
- [ ] Aucun défaut entraînant une perte de données.
- [ ] Les éventuelles anomalies restantes sont documentées avant le passage à `0.15.0`.
