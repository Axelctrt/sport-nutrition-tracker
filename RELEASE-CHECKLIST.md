# Checklist de publication — SportPilot 0.29.0

## Préparation Git

- [ ] La branche `release/0.29.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.29.0`.
- [ ] Paramètres affiche `0.29.0`.
- [ ] Aucun ZIP, dossier `patch-files/`, rapport temporaire ou fichier généré n’est stagé.
- [ ] Aucun `.env`, secret Cloudflare, token Dexie Cloud ou clé IA n’est stagé.
- [ ] Les migrations D1 `0001` et `0002` sont déjà présentes ; `0002` ne sera pas rejouée.

## Contrôles automatiques

- [ ] `npm run audit:social-complete-acceptance` passe.
- [ ] `npm run audit:social-release-finalization` passe.
- [ ] `npm run audit:social-release` passe.
- [ ] `npm run audit:release` passe.
- [ ] `npm run audit:security` passe.
- [ ] `npm run audit:repository` passe.
- [ ] `npm run lint` passe sans erreur.
- [ ] `npm run test` passe.
- [ ] `npm run build` passe.
- [ ] `npm run check` passe.
- [ ] `npm run test:stability` passe.
- [ ] `npm audit` annonce zéro vulnérabilité.

## Recette fonctionnelle

- [ ] La recette A25 est clôturée avec les comptes A et B.
- [ ] Profil, handle exact, demande, acceptation, refus et annulation fonctionnent.
- [ ] L’amitié est visible dans les deux sens sans doublon.
- [ ] Les modes Aucun, Résumé et Personnalisé sont effectifs par ami.
- [ ] Les champs musculation et cardio respectent la sélection autorisée.
- [ ] Le fil se met à jour après modification, masquage ou suppression.
- [ ] Le détail est revérifié côté serveur à chaque ouverture.
- [ ] Le hors-ligne et la reconnexion ne créent aucun doublon.
- [ ] La suppression puis la recréation de l’amitié repart sans permission obsolète.
- [ ] Le changement de compte n’affiche aucune donnée de l’ancien compte.
- [ ] Les routes anonymes renvoient `401 Unauthorized`.
- [ ] Aucun email n’est affiché comme handle public.
- [ ] Aucun champ brut, note privée, stack ou détail SQL n’est exposé.
- [ ] La Preview est validée sur ordinateur et iPhone 15 sous iOS 26.

## Publication

- [ ] Commit `chore(release): finaliser SportPilot 0.29.0` créé sur `release/0.29.0`.
- [ ] `release/0.29.0` fusionnée manuellement dans `develop`.
- [ ] Contrôles critiques relancés sur `develop`.
- [ ] `develop` fusionnée manuellement dans `main`.
- [ ] `main` poussée avant le déploiement de production.
- [ ] Production Cloudflare Pages construite depuis `main`.
- [ ] Version, PWA et module social vérifiés en production.
- [ ] Tag annoté `v0.29.0` créé sur le commit publié.
- [ ] Tag `v0.29.0` poussé vers `origin`.
- [ ] `develop` resynchronisée avec `main`.
