# Checklist de validation - SportPilot 0.36.0

## Préparation Git

- [x] Branche `feat/friends-settings-strength-ux-0.36.0` créée depuis le commit validé 0.35.1.
- [x] Dépendance sur `d067cb2fd718e0cd71d597398e6e1d3f57f3e973` documentée.
- [x] Aucun travail utilisateur local écrasé ou placé dans un stash.
- [x] Aucun tag créé.
- [x] Aucun déploiement effectué.
- [x] Aucune migration D1 ou Dexie ajoutée.

## Contrôles ciblés

- [x] Navigation Amis, URL, Retour, badge et panneaux.
- [x] Permissions par ami, demandes et profil social.
- [x] Cinq catégories principales des Paramètres.
- [x] Diagnostic social dans les réglages avancés.
- [x] Anciennes routes de Paramètres conservées.
- [x] Accordéon Musculation à ouverture unique.
- [x] Validation et autosauvegarde des séries.
- [x] Préremplissage courant, historique puis objectif.

## Contrôles automatiques

- [ ] Suite Vitest complète.
- [ ] Ordre de tests mélangé.
- [ ] Lint et TypeScript.
- [ ] Build PWA.
- [ ] Audits du dépôt.
- [ ] Playwright Chromium desktop.
- [ ] Playwright Chromium mobile 360 px.
- [ ] Playwright WebKit iPhone 15.
- [ ] Scénarios ciblés 320 px et 412 px.
- [ ] Thèmes clair et sombre sans débordement.

## Recette mobile à réaliser

- [ ] Amis avec deux comptes réels.
- [ ] Demandes reçues, acceptation et refus.
- [ ] Partage Aucun, Résumé et Personnalisé.
- [ ] Navigation Retour entre les rubriques Amis.
- [ ] Paramètres à 320, 360 et 412 px avec texte agrandi.
- [ ] Séance issue d’un modèle et séance libre.
- [ ] Clavier affiché pendant la saisie d’une série.
- [ ] Reprise après mise en arrière-plan sans perte de valeur.
- [ ] Synchronisation multi-appareils.

## Publication

- [ ] Branche poussée sur `origin`.
- [ ] Pull request brouillon préparée.
- [ ] Validation utilisateur reçue avant toute fusion, création de tag ou publication.
