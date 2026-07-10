# U9 - Navigation mobile, Accueil et personnalisation

## Objectif

U9 simplifie l'architecture principale de SportPilot autour de quatre rubriques communes au mobile et au bureau :

- Accueil ;
- Nutrition ;
- Sport ;
- Progression.

Les routes historiques restent disponibles. Les écrans Poids, Analyses, Objectifs, Rapports, Bilan hebdomadaire, Historique et Récompenses sont regroupés dans le nouveau hub Progression.

## Navigation

- La barre mobile utilise quatre destinations principales.
- Les routes Sport et Progression activent leur rubrique par contexte, même lorsqu'une sous-page historique est ouverte.
- Les écrans principaux affichent Paramètres en haut à gauche.
- Les écrans secondaires affichent un bouton Retour contextuel au même emplacement.
- Le bureau conserve la même architecture dans la barre latérale.

## Accueil

L'Accueil conserve les widgets métier existants et ajoute une hiérarchie plus explicite pour la journée en cours :

- calories toujours visibles ;
- macros, pas et poids actuel sélectionnables ;
- raccourcis sélectionnables et réordonnés selon les préférences ;
- affichage confortable ou compact ;
- poids actuel issu de la résolution partagée introduite en U7.

Les informations critiques ne dépendent pas d'une configuration manuelle initiale : les anciennes préférences et les nouveaux comptes reçoivent une disposition recommandée complète.

## Persistance et synchronisation

Les préférences suivantes restent éligibles à la synchronisation du compte :

- widgets visibles ;
- ordre des widgets ;
- métriques principales ;
- raccourcis rapides.

La densité confortable ou compacte reste propre à l'appareil, car elle dépend du format d'écran. Elle est stockée dans les réglages appareil et exclue des réglages utilisateur synchronisés.

Les anciennes sauvegardes et préférences sont normalisées avec des valeurs par défaut. Aucune migration Dexie ou D1 n'est nécessaire.

## Compatibilité

- Aucune route historique n'est supprimée.
- Les liens existants vers Poids et Analyses continuent de fonctionner.
- Les préférences anciennes reçoivent automatiquement les nouveaux raccourcis et métriques recommandés.
- La navigation principale mobile et desktop partage la même architecture fonctionnelle.

## Contrôles exécutés

- tests ciblés navigation, dashboard, préférences, sauvegardes et synchronisation ;
- suite Vitest complète répartie en six lots déterministes ;
- lint ;
- TypeScript ;
- build Vite/PWA ;
- audit npm ;
- contrôle des différences et des fins de ligne.
