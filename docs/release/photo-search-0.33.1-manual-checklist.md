# SportPilot 0.33.1 - checklist manuelle

## Préparation

- Utiliser un compte de test SportPilot connecté.
- Préparer une petite image JPEG, une grande image verticale, une PNG, une WebP et une photo iPhone.
- Vérifier que la photo ne contient aucune information sensible.
- Exécuter le smoke test sur le staging avant tout test de production.

## iPhone réel

- Ouvrir la PWA installée puis choisir une photo dans la photothèque.
- Prendre une nouvelle photo avec la caméra et vérifier son orientation.
- Vérifier le switch à 320/360 px, en clair, sombre et avec le texte agrandi.
- Vérifier que le statut reste devant le switch, sans chevauchement.
- Ouvrir l’aide photo près du déclencheur, puis la fermer par toucher extérieur.
- Lancer une analyse réelle et contrôler le résultat Gemini.
- Simuler une erreur, réessayer, puis ouvrir la saisie manuelle vide.
- Ajouter le repas et vérifier le retour, l’ouverture et la mise en évidence du bon repas.
- Tester le clavier dans Mes aliments et Open Food Facts.
- Passer hors ligne, vérifier Mes aliments, puis revenir en ligne.

## Android réel

- Tester Chrome et la PWA installée avec Gboard.
- Vérifier le bouton Retour système à chaque étape du parcours d’ajout.
- Tester la permission caméra, son refus puis une nouvelle autorisation.
- Tester une grande photo et une photo horizontale.
- Vérifier le switch et le popover avec une grande taille de texte.
- Tester une analyse réelle, Mes aliments, Open Food Facts et la création sans résultat.
- Vérifier le message hors ligne d’Open Food Facts et le fonctionnement local de Mes aliments.

## Multi-appareils

- Lancer l’analyse sur un appareil puis ajouter le résultat au journal.
- Vérifier la synchronisation du journal sur un second appareil.
- Expirer le token du premier appareil et vérifier le message de reconnexion.
- Se reconnecter, relancer l’analyse et confirmer qu’aucun doublon n’est créé.
- Vérifier que les aliments et le journal restent disponibles localement.

## Validation finale

- Aucun résultat nutritionnel n’apparaît lorsque Gemini échoue.
- Aucune photo préparée n’est conservée après le parcours.
- Les quatre repas sont fermés au chargement et chacun peut être refermé.
- Le choix Mes aliments / Open Food Facts n’est demandé qu’une fois.
- Une recherche vide permet une création avec nom ou code-barres prérempli.
- Aucun secret, token ou contenu photo n’apparaît dans les logs.
