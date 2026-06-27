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

## Supersets, tri-sets et circuits

- [ ] Un superset contient exactement deux exercices.
- [ ] Un tri-set contient exactement trois exercices.
- [ ] Un circuit accepte deux exercices ou plus.
- [ ] Un exercice peut rejoindre ou quitter un groupe.
- [ ] Les exercices peuvent être réordonnés sans perdre leur groupe.
- [ ] Un groupe peut être dupliqué puis dissous.
- [ ] Le nom, les tours et les deux temps de repos sont conservés après rechargement.
- [ ] Une séance lancée depuis un modèle affiche les repères `A1`, `A2`, etc.
- [ ] Les séries restent indépendantes pour chaque exercice.
- [ ] Le minuteur applique le repos de transition puis le repos entre tours.
- [ ] Un exercice peut être passé temporairement puis réintégré.
- [ ] Une ancienne séance sans groupe reste utilisable.
- [ ] L’export JSON et le CSV conservent les métadonnées de groupe.
- [ ] L’interface ne déborde pas horizontalement sur iPhone 15.

## Fiabilité des produits alimentaires

- [ ] Un produit Open Food Facts peut être actualisé depuis sa fiche.
- [ ] Les corrections locales sont conservées lors de l’actualisation standard.
- [ ] Le remplacement des corrections demande une confirmation.
- [ ] Un code-barres déjà utilisé bloque la création et ouvre l’aliment existant.
- [ ] Un doublon de nom et marque peut être confirmé volontairement.
- [ ] Le libellé et la quantité d’une portion sont conservés après rechargement.
- [ ] Fibres et sel apparaissent dans la bibliothèque et dans l’aperçu du journal.
- [ ] Le comportement hors connexion affiche un message sans masquer le formulaire.
- [ ] Une ancienne sauvegarde JSON v2 sans les nouveaux champs reste importable.
- [ ] La page reste utilisable sans débordement horizontal sur iPhone 15.

## Suivi des sports d’endurance

- [ ] Une ancienne course sans terrain ni dénivelé reste modifiable et visible.
- [ ] Une course peut enregistrer terrain, dénivelé et intervalles facultatifs.
- [ ] Une natation avec bassin de 25 m ou 50 m affiche le nombre de longueurs calculé.
- [ ] Une sortie vélo affiche distance, vitesse moyenne, dénivelé, type de vélo et environnement.
- [ ] Les volumes hebdomadaires de course, natation et vélo sont corrects.
- [ ] Les sorties les plus longues et les meilleures allures ou vitesses sont recalculées depuis l’historique.
- [ ] Un record sur distance usuelle n’est affiché que pour une séance complète correspondant à cette distance.
- [ ] Les quatre modèles d’endurance par défaut sont disponibles après une mise à jour depuis une ancienne base.
- [ ] Créer, modifier, dupliquer et supprimer un modèle ne modifie pas les activités déjà enregistrées.
- [ ] Utiliser un modèle préremplit le sport et ses données sans forcer la date de l’activité.
- [ ] L’export CSV contient terrain, dénivelé, bassin, longueurs, type de vélo, environnement, vitesse et intervalles.
- [ ] Une sauvegarde JSON v2 ancienne et une sauvegarde contenant les nouveaux champs sont importables.
- [ ] La saisie, les modèles et les analyses restent utilisables hors connexion.
- [ ] Les pages ne débordent pas horizontalement sur iPhone 15 en portrait et paysage.

## Tableau de bord personnalisable

- [ ] La page `#/settings/dashboard` est accessible depuis l’accueil, les Paramètres et le menu mobile.
- [ ] Le préréglage Équilibré affiche tous les blocs dans l’ordre par défaut.
- [ ] Le préréglage Nutrition place le résumé nutritionnel en premier.
- [ ] Le préréglage Entraînement place la séance en cours et les actions en premier.
- [ ] Le préréglage Essentiel masque les activités et les détails du calcul.
- [ ] Chaque bloc peut être affiché ou masqué indépendamment.
- [ ] Les boutons Monter et Descendre changent réellement l’ordre.
- [ ] Les données d’un bloc masqué restent disponibles dans les écrans dédiés.
- [ ] Le choix reste identique après rechargement et redémarrage de la PWA.
- [ ] Une ancienne base sans préférences reçoit l’affichage Équilibré.
- [ ] Une sauvegarde JSON v2 conserve les préférences personnalisées.
- [ ] L’interface ne déborde pas horizontalement sur iPhone 15 en portrait et paysage.
- [ ] Les contrôles restent utilisables au clavier et avec VoiceOver.
