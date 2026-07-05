# Checklist de publication — SportPilot 0.27.0

## Préparation Git

- [ ] La branche `feature/activity-sharing-0.27.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.27.0`.
- [ ] Paramètres affiche `0.27.0`.
- [ ] Aucun fichier temporaire de patch, ZIP ou dossier `patch-files/` n’est stagé.
- [ ] Aucun fichier `.env`, `.env.local`, `.env.production` ou secret IA n’est stagé.

## Contrôles automatiques

- [ ] Tests ciblés sociaux F1 à F5 passent.
- [ ] `npm run audit:friends-privacy` passe.
- [ ] `npm run audit:social-identity` passe.
- [ ] `npm run audit:social-friend-requests` passe.
- [ ] `npm run audit:social-friend-permissions` passe.
- [ ] `npm run audit:social-activity-snapshots` passe.
- [ ] `npm run audit:social-activity-feed` passe.
- [ ] `npm run audit:social-release` passe.
- [ ] `npm run audit:release` passe.
- [ ] `npm run audit:repository` passe.
- [ ] `npm run build` passe.
- [ ] `npm run check` passe.
- [ ] `npm run test:stability` passe.

## Recette fonctionnelle

- [ ] La page Amis s’ouvre depuis la navigation.
- [ ] L’identifiant SportPilot public est visible, copiable et modifiable localement.
- [ ] Les handles invalides et réservés sont refusés.
- [ ] La recherche exacte retourne un état clair lorsque le service cloud est indisponible.
- [ ] Une demande vers un identifiant inexistant affiche l’état attendu.
- [ ] Une demande vers soi-même est bloquée.
- [ ] Une demande vers un ami existant est bloquée.
- [ ] Une demande déjà envoyée ou déjà reçue est gérée proprement.
- [ ] Chaque ami affiche une permission de partage.
- [ ] Le résumé reste le niveau par défaut.
- [ ] Le détail n’est activé qu’après consentement explicite.
- [ ] Les snapshots sociaux filtrés n’exposent aucune activité brute.
- [ ] Le fil d’activité amis affiche les états vides et les snapshots autorisés.
- [ ] Le fil ne contient aucun like, commentaire, message, groupe ou classement.
- [ ] Une sauvegarde JSON v9 contient l’identité, les amis, demandes, préférences et permissions.
- [ ] La restauration conserve les données sociales locales.
- [ ] Les parcours photo IA, Open Food Facts et scanner code-barres restent non régressifs.

## Publication

- [ ] Fusion manuelle dans `develop` avec `merge: intégrer SportPilot 0.27.0`.
- [ ] Contrôles release relancés sur `develop`.
- [ ] Fusion manuelle dans `main` avec `merge: publier SportPilot 0.27.0`.
- [ ] Le tag annoté `v0.27.0` est créé sur le commit publié.
- [ ] `develop` est resynchronisée avec `main`.


### SportPilot 0.28.0 F5 — Amitiés cloud et permissions synchronisées

- Prépare la création d’amitiés cloud stables à partir de demandes acceptées.
- Les relations restent basées sur `userId`, jamais sur le handle public.
- Synchronise les permissions par ami avec résumé par défaut et détail uniquement après consentement explicite.
- Ne publie encore aucun snapshot distant et ne crée aucun feed distant réel.


### 0.28.0 F6 — Snapshots sociaux distants filtrés

- Publication cloud de snapshots sociaux filtrés uniquement.
- Lecture des snapshots autorisés pour le feed amis réel.
- Runtime Dexie Cloud prototype v14.
- AppDatabase locale inchangée en v10 et sauvegarde JSON v9.
- Aucune activité brute, aucun export brut, aucun annuaire public, aucune suggestion.
