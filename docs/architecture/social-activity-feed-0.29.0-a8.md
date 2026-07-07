# SportPilot 0.29.0 A8 — Cartes et détails sociaux spécialisés

## Statut

A8 finalise la présentation du fil cloud introduit en A7 sans modifier les contrats, D1, Dexie ou la politique de confidentialité.

## Principes

- mobile-first : cartes verticales, actions tactiles de 44 px minimum et feuille de détail ancrée en bas ;
- desktop compatible : largeur maximale accrue et dialogue centré ;
- aucune donnée simulée : un graphique n'est rendu que si `chart.points` ou `paceSeries` est réellement présent dans le snapshot autorisé ;
- confidentialité conservée : aucun identifiant métier, note ou payload brut n'est affiché ;
- détail à la demande : les cartes restent légères et le serveur revérifie les permissions avant chaque ouverture.

## Présentation cardio

Le détail traduit les valeurs métier déjà persistées : type de séance, terrain, nage, bassin, vélo et environnement. Les intervalles, tours et segments sont présentés sous forme de blocs verticaux. Les séries graphiques autorisées utilisent Recharts avec une interaction compatible tactile et une représentation textuelle accessible.

## Présentation musculation

Les exercices sont affichés verticalement avec groupes musculaires et mode de suivi. Les séries distinguent :

- charge externe : `60 kg × 10` ;
- poids du corps : `Poids du corps × 9` ;
- assistance : `Assistance 20 kg × 8` ;
- répétitions, durée ou distance seules ;
- RPE, repos et type de série lorsqu'ils sont autorisés.

L'absence de charge dans le snapshot ne produit jamais une charge artificielle.

## Accessibilité

- focus initial sur le bouton de fermeture ;
- fermeture avec `Échap` et clic sur l'arrière-plan ;
- restitution du focus au bouton d'ouverture ;
- blocage du défilement de la page sous-jacente ;
- en-tête du détail fixe ;
- libellés sémantiques pour les métriques et graphiques ;
- défilement vertical préservé au toucher sur les graphiques.

## Hors périmètre

A8 n'ajoute aucun nouveau champ source, réglage de partage, cache du détail, migration ou endpoint. Les graphiques absents du modèle métier actuel ne sont pas fabriqués.
