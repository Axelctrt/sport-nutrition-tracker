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

## Sécurité et confidentialité

- [ ] La page `#/privacy` est accessible avant la création du profil.
- [ ] Le lien Confidentialité est visible depuis l’onboarding, les paramètres et le scanner.
- [ ] `dist/_headers` est présent après `npm run build`.
- [ ] `npm run audit:security` réussit.
- [ ] La réponse de production contient CSP, `nosniff`, `no-referrer` et la Permissions-Policy.
- [ ] Le scanner fonctionne toujours sur l’adresse HTTPS publiée.
- [ ] Les recherches Open Food Facts fonctionnent toujours.
- [ ] La PWA s’installe et se met à jour avec la CSP active.
## Minuteur de repos

- [ ] Valider une série de travail lance le repos configuré.
- [ ] Une série d’échauffement ne lance pas automatiquement le minuteur.
- [ ] Pause, reprise, arrêt, -15 s, +15 s et +30 s fonctionnent.
- [ ] Le retour après mise en arrière-plan affiche le temps exact.
- [ ] Le signal visuel reste présent si son et vibration sont indisponibles.
- [ ] Le minuteur s’arrête à la fin et à l’abandon de la séance.
- [ ] Aucun champ de série n’est masqué en portrait sur iPhone.


## Statistiques selon le type d’exercice

- [ ] Un exercice à charge externe conserve charge, volume et estimation du 1RM.
- [ ] Un exercice au poids du corps affiche répétitions, séries et meilleure série sans volume nul trompeur.
- [ ] Un exercice lesté sépare le lest ajouté de la charge totale calculée.
- [ ] La charge totale utilise le dernier poids connu à la date de séance.
- [ ] Un exercice assisté considère une assistance plus faible comme une progression.
- [ ] Les exercices en répétitions seules n’affichent aucun indicateur de charge.
- [ ] Les exercices en durée et en distance utilisent les champs et graphiques adaptés.
- [ ] Une ancienne sauvegarde sans méthode de suivi explicite reste importable.
- [ ] Les formulaires restent utilisables en portrait sur iPhone sans débordement horizontal.


## Planification hebdomadaire

- [ ] La page `#/strength/planning` affiche sept jours du lundi au dimanche.
- [ ] Une séance modèle peut être planifiée à la date choisie.
- [ ] Le même modèle ne peut pas être planifié deux fois à la même date.
- [ ] Le report déplace la séance et conserve sa date initiale.
- [ ] Une séance peut être marquée comme non réalisée après confirmation.
- [ ] Démarrer une séance prévue ouvre la séance active avec le même identifiant.
- [ ] Une séance commencée un autre jour affiche séparément la date prévue et la date réelle.
- [ ] Une autre séance active bloque correctement le démarrage depuis le planning.
- [ ] Le planning reste utilisable hors connexion.
- [ ] La vue ne déborde pas horizontalement en portrait sur iPhone 15.
- [ ] L’export CSV contient les dates réelle, prévue et prévue initiale.
- [ ] Une sauvegarde JSON v2 contenant des séances planifiées est restaurable.
