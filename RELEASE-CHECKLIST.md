# Checklist de publication — SportPilot 0.35.0

## Préparation Git

- [x] Branche `release/0.35.0` créée depuis `develop` validé.
- [ ] `package.json` et `package-lock.json` indiquent `0.35.0`.
- [ ] Paramètres affiche `0.35.0`.
- [x] Aucun secret, ZIP, résultat Playwright ou fichier généré n’est suivi.
- [x] Le chantier n’ajoute aucune migration D1 ou Dexie.

## Contrôles automatiques

- [x] Le candidat fonctionnel `e5cbeb5e64bfb9c1cd19e2c99404c5729a604061` est validé.
- [x] Les quatre jobs GitHub Actions passent sur un même SHA.
- [x] Lint, TypeScript, tests, build PWA, audits et budget JavaScript passent.
- [x] La suite passe avec ordre de tests mélangé.
- [x] 126 scénarios Playwright passent sur Chromium desktop, WebKit iPhone 15 et formats mobiles.
- [x] La mise à jour réelle du service worker conserve les données.
- [x] Le candidat fonctionnel est fusionné dans `develop` au commit `66cae975c1af2eabd05e585793c0d8112cee7056`.
- [ ] La CI de la branche de release passe entièrement sur un même SHA.

## Recette 0.35.0

- [x] Les parcours onboarding local et compte sont couverts.
- [x] OTP, reprise de brouillon et protection contre les doubles soumissions sont validés.
- [x] Les toasts d’action sont dédupliqués et contextualisés.
- [x] Import invité et restauration cloud utilisent des jalons réels.
- [x] Historique, Amis et Rappels sont couverts par les contrôles applicatifs.
- [x] Le comportement de recherche Nutrition est validé sous WebKit.
- [x] Aucun débordement horizontal critique n’est détecté sur mobile.
- [x] Clair, sombre, réduction de mouvement et iPhone 15 sont validés.

## Cloudflare

- [ ] Preview Cloudflare Pages validée sur le commit de publication.
- [ ] URL de Preview autorisée dans Dexie Cloud.
- [ ] Conservation des données vérifiée sur la Preview.
- [ ] Functions/D1 et parcours compte vérifiés sur la Preview.

## Publication Git

- [x] Branche `release/0.35.0` créée.
- [x] Notes de version finales enregistrées.
- [ ] PR `release/0.35.0` vers `main` ouverte.
- [ ] CI de la PR de publication entièrement verte.
- [ ] Fusion de la PR de publication.
- [ ] Tag annoté `v0.35.0` créé sur le commit publié.
- [ ] Tag `v0.35.0` poussé vers `origin`.
- [ ] `develop` resynchronisé avec `main`.
- [ ] Déploiement de production confirmé.
- [ ] Vérifications post-déploiement effectuées.
