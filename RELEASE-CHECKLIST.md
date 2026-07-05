# Checklist de publication — SportPilot 0.28.0

## Préparation Git

- [ ] La branche `feature/social-cloud-0.28.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.28.0`.
- [ ] Paramètres affiche `0.28.0`.
- [ ] Aucun fichier temporaire de patch, ZIP ou dossier `patch-files/` n’est stagé.
- [ ] Aucun fichier `.env`, `.env.local`, `.env.production` ou secret IA n’est stagé.

## Contrôles automatiques

- [ ] `npm run audit:social-cloud-contract` passe.
- [ ] `npm run audit:social-cloud-identity` passe.
- [ ] `npm run audit:social-cloud-lookup` passe.
- [ ] `npm run audit:social-cloud-friend-requests` passe.
- [ ] `npm run audit:social-cloud-friendships` passe.
- [ ] `npm run audit:social-cloud-activity-snapshots` passe.
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
- [ ] `npm run lint` passe.
- [ ] `npm run test` passe.
- [ ] `npm run check` passe.
- [ ] `npm run test:stability` passe.

## Recette fonctionnelle

- [ ] La page Amis s’ouvre depuis la navigation.
- [ ] Le bloc affiche `Cloud social 0.28.0 F6`.
- [ ] L’identité sociale affiche un `userId` privé et un handle public.
- [ ] La recherche exacte refuse les handles invalides et ne propose aucun annuaire.
- [ ] Une demande d’ami cloud passe par la recherche exacte.
- [ ] Une demande vers soi-même est bloquée.
- [ ] Un handle inexistant affiche `Identifiant inexistant`.
- [ ] Un backend indisponible affiche `Service cloud indisponible`.
- [ ] Une demande acceptée peut créer une amitié cloud stable par `userId`.
- [ ] Les permissions synchronisées restent sur résumé par défaut.
- [ ] Le détail nécessite un consentement explicite.
- [ ] Les snapshots sociaux cloud sont filtrés.
- [ ] Le feed amis lit uniquement les snapshots autorisés.
- [ ] Aucun export brut d’activité n’est visible.
- [ ] Aucune table ou option `socialRawActivities` n’est présente.
- [ ] Aucun like, commentaire, message, groupe, classement, suggestion ou annuaire public n’est visible.

## Publication

- [ ] Commit de finalisation sur `feature/social-cloud-0.28.0` avec `chore(release): finaliser SportPilot 0.28.0`.
- [ ] Fusion manuelle dans `develop` avec `merge: intégrer SportPilot 0.28.0`.
- [ ] Contrôles release relancés sur `develop`.
- [ ] Fusion manuelle dans `main` avec `merge: publier SportPilot 0.28.0`.
- [ ] Tag annoté `v0.28.0` créé sur le commit publié.
- [ ] `develop` resynchronisée avec `main`.
