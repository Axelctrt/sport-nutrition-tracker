# Checklist de publication — SportPilot 0.23.1

## Git et version

- [ ] La branche `feature/global-action-feedback-0.23.1` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.23.1`.
- [ ] Paramètres affiche `0.23.1`.
- [ ] Aucune archive, journal ou charge utile de patch n’est suivie par Git.

## Contrôles automatiques

- [ ] `npm run audit:action-feedback` réussit.
- [ ] `npm run check` réussit.
- [ ] `npm run test:stability` réussit.
- [ ] `git diff --check` ne signale aucune erreur.

## Recette des notifications

- [ ] Modifier un objectif affiche une confirmation unique.
- [ ] Modifier le profil et les paramètres affiche une confirmation.
- [ ] Ajouter ou modifier un poids, des pas, un aliment ou une recette affiche une confirmation.
- [ ] Créer, dupliquer, archiver ou réactiver un élément sportif affiche une confirmation.
- [ ] Une erreur d’écriture affiche le message métier utile.
- [ ] Deux déclenchements identiques rapprochés ne créent pas deux toasts identiques.
- [ ] Une déconnexion, un import invité ou une restauration cloud affiche sa confirmation après rechargement.
- [ ] Les autosauvegardes d’une séance active n’affichent pas un toast à chaque frappe.
- [ ] Les erreurs restent visibles plus longtemps que les succès.
- [ ] L’affichage ne dépasse pas quatre notifications simultanées.

## Recette des objectifs

- [ ] Modifier un objectif existant réaffiche son type, son nom, sa cible, sa date de départ et son échéance.
- [ ] Modifier un objectif de poids réaffiche le poids de départ historique de l’objectif.
- [ ] Créer un nouvel objectif de poids préremplit le poids de départ avec la dernière pesée disponible.
- [ ] Modifier un objectif de poids ne remplace pas le poids de départ par la dernière pesée actuelle.
- [ ] Créer un objectif de poids sans pesée disponible laisse le champ vide et exige une saisie manuelle.

## Mobile et accessibilité

- [ ] Les toasts ne débordent pas horizontalement sur iPhone 15 sous iOS 26.
- [ ] Les boutons restent accessibles au toucher.
- [ ] Les confirmations sont annoncées sans interrompre excessivement la navigation.
- [ ] Les erreurs sont annoncées comme alertes.

## Publication

- [ ] La PWA se met à jour vers `0.23.1`.
- [ ] `develop` est fusionnée manuellement dans `main`.
- [ ] Le tag annoté `v0.23.1` est créé sur le commit publié.
- [ ] `develop` est resynchronisée avec `main`.


---

# Recette 0.24.0 R1 — récompenses et thèmes

## Catalogue

- [ ] Le centre de récompenses affiche cinquante badges.
- [ ] Les badges historiques déjà gagnés restent reconnus.
- [ ] Les compteurs de progression restent cohérents après rechargement.
- [ ] Les catégories course, musculation, natation, pas, régularité, polyvalence et nutrition sont représentées.

## Thèmes

- [ ] Le catalogue affiche quinze thèmes.
- [ ] Les onze nouveaux thèmes sont visibles.
- [ ] Un thème verrouillé peut être prévisualisé.
- [ ] Un thème verrouillé ne peut pas être appliqué durablement.
- [ ] Quitter l’aperçu restaure le thème actif.
- [ ] Un rechargement ne conserve pas un aperçu comme thème débloqué.
- [ ] Nexus vivant reste lisible et respecte la réduction de mouvement.

## Contrôles

- [ ] `npm run audit:reward-theme-catalog` réussit.
- [ ] `npm run check` réussit.
- [ ] `npm run test:stability` réussit.
- [ ] Les thèmes ne débordent pas sur iPhone 15 sous iOS 26.


## SportPilot 0.24.0 R3 — Thèmes spectaculaires

Cette phase renforce la direction artistique des thèmes : Volcan affiche lave, fumée, cendres et braises ; Océan et Abysses affichent bulles, poissons et silhouettes marines ; Canopée affiche feuilles et lianes ; Cosmos affiche nébuleuses, planètes et orbites ; Forge affiche acier, feu et étincelles ; Nexus vivant devient le thème légendaire multicouche avec énergie animée. Les règles de déblocage définitives ne sont pas encore activées et l’aperçu ne débloque toujours rien durablement.
