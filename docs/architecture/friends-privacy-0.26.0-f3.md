# SportPilot 0.26.0 F3 — garde-fous sociaux et préparation release

## Objectif

La phase F3 consolide la base amis/confidentialité avant la finalisation de la release 0.26.0. Elle ne livre pas encore le partage d’activité entre comptes : cette capacité reste réservée à 0.27.0.

## Garde-fou de partage

Le domaine expose `evaluateFriendActivitySharingGuard` et `canExposeFriendActivityDetails` afin de séparer clairement la préférence utilisateur du droit réel d’exposition des données.

Règles appliquées :

- profil privé : aucun partage ;
- partage désactivé : aucune exposition ;
- aucun ami accepté : aucune exposition ;
- résumé uniquement : résumé autorisé aux amis acceptés ;
- niveau détaillé : préférence préparée, mais export détaillé bloqué jusqu’au consentement explicite par ami.

En 0.26.0, `canShareDetailed` reste donc `false` dans tous les cas. Cela évite qu’une future intégration cloud réutilise accidentellement une préférence locale comme un consentement de diffusion.

## Persistance et sauvegarde

La phase conserve les décisions de F2 :

- Dexie métier : schéma v9 ;
- sauvegarde JSON : format v8 ;
- restauration des amis, demandes et préférences via les tables locales ;
- absence de synchronisation sociale réelle.

## Limite volontaire

Aucune activité, séance, poids, nutrition ou performance détaillée n’est partagée en F3. La page affiche explicitement le garde-fou actif pour préparer la recette et éviter toute ambiguïté produit.
