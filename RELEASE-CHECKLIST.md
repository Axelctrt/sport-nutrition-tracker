# Checklist de publication — SportPilot 0.26.0

## Préparation Git

- [ ] La branche `feature/friends-privacy-0.26.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.26.0`.
- [ ] Paramètres affiche `0.26.0`.
- [ ] Aucun fichier temporaire de patch, ZIP ou dossier `patch-files/` n’est stagé.
- [ ] Aucun fichier `.env`, `.env.local`, `.env.production` ou secret IA n’est stagé.

## Contrôles automatiques

- [ ] `npm run test -- src/domain/friends/friendship.test.ts src/application/friends/friendsPrivacyService.test.ts src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.test.ts src/features/friends/pages/FriendsPrivacyPage.test.tsx src/features/friends/pages/FriendsPrivacyPage.persistence.test.tsx src/infrastructure/backup/friendsPrivacyBackup.test.ts src/app/friendsPrivacyReleaseReadiness.test.ts src/app/syncDataReadiness.test.ts src/app/releaseReadiness.test.ts src/features/settings/components/DataManagementCenter.test.tsx` passe.
- [ ] `npm run audit:friends-privacy` passe.
- [ ] `npm run audit:release` passe.
- [ ] `npm run audit:repository` passe.
- [ ] `npm run build` passe.
- [ ] `npm run check` passe.
- [ ] `npm run test:stability` passe.

## Recette fonctionnelle

- [ ] La page Amis s’ouvre depuis la navigation.
- [ ] Une demande sortante peut être créée et reste persistée après rechargement.
- [ ] Une demande entrante peut être acceptée et transforme correctement le profil en ami.
- [ ] Une demande entrante peut être refusée sans créer d’ami.
- [ ] Les doublons de demandes sont bloqués.
- [ ] Les préférences de confidentialité sont persistées après rechargement.
- [ ] Le profil privé reste conservé après rechargement.
- [ ] Le mode “Détaillé après accord” peut être sélectionné comme préférence mais reste bloqué par le garde-fou social.
- [ ] Aucun export social détaillé n’est disponible en 0.26.0.
- [ ] Une sauvegarde JSON v8 contient `friendProfiles`, `friendRequests` et `friendsPrivacySettings`.
- [ ] La restauration conserve les amis, demandes et préférences.
- [ ] Les parcours photo IA, Open Food Facts et scanner code-barres restent non régressifs.

## Publication

- [ ] Fusion manuelle dans `develop` avec `merge: intégrer SportPilot 0.26.0`.
- [ ] Contrôles release relancés sur `develop`.
- [ ] Fusion manuelle dans `main` avec `merge: publier SportPilot 0.26.0`.
- [ ] Le tag annoté `v0.26.0` est créé sur le commit publié.
- [ ] `develop` est resynchronisée avec `main`.
