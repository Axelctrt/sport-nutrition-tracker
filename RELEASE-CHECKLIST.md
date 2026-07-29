# Checklist de publication — SportPilot 0.34.0

## Préparation Git

- [x] La branche `release/0.34.0` est créée depuis le commit `develop` validé.
- [x] `package.json` et `package-lock.json` indiquent `0.34.0`.
- [x] Paramètres affiche `0.34.0`.
- [x] Aucun secret, ZIP, résultat Playwright ou fichier généré n’est suivi.
- [x] Le chantier final n’ajoute aucune migration D1 ou Dexie.
- [x] `develop` est en avance sur `main` sans être en retard.

## Contrôles automatiques

- [x] Lint, TypeScript, tests, build PWA, audits et budget JavaScript passent.
- [x] La suite passe avec ordre de tests mélangé.
- [x] Playwright passe sur Chromium desktop et WebKit iPhone 15.
- [x] La mise à jour réelle du service worker conserve les données.
- [x] Les contrôles ont été obtenus sur le commit fonctionnel final
  `d12b997f0c623b7b82035bb525f66d4129b48d4c`.
- [x] Ce code a été fusionné dans `develop` au commit
  `4abf66fa594cc6594b4ece4a25dd822bfe21494e`.

## Recette 0.34.0

- [x] Les cinq thèmes fonctionnent en clair et sombre.
- [x] Un ancien identifiant inconnu retombe sur Core sans perte de données.
- [x] L’analyse IA validée reste inchangée par le patch final.
- [x] Les conditions de déblocage reflètent les données réellement enregistrées.
- [x] Le reveal de badge s’affiche sans toast intermédiaire.
- [x] La célébration de journée complète exige check-in, sport réel,
  alimentation complète et premier check-out.
- [x] La célébration ne se répète pas pour une même date.
- [x] L’indicateur de navigation mobile glisse entre les quatre rubriques.
- [x] Progression adapte ses visuels à 0, 1, 2–3 ou davantage de mesures.
- [x] Les textes nutrition et force sont explicites.
- [x] Aucun débordement horizontal critique n’est détecté sur mobile.
- [x] Clair, sombre, réduction de mouvement et iPhone 15 sont validés.
- [x] Manifeste, service worker, routes profondes et console sont contrôlés.

## Cloudflare

- [ ] Lire le premier message d’erreur des builds automatiques Cloudflare ayant
  échoué sur la PR de finition.
- [ ] Corriger ou confirmer la configuration de build Cloudflare.
- [ ] Obtenir une Preview de recette sur le commit de publication.
- [ ] Vérifier la conservation des données et les fonctionnalités dépendantes
  des Functions/D1 sur cette Preview.

## Publication Git

- [x] Branche `release/0.34.0` créée.
- [x] Notes de version finales enregistrées.
- [ ] PR `release/0.34.0` vers `main` ouverte.
- [ ] CI de la PR de publication entièrement verte.
- [ ] Validation finale explicite avant fusion vers `main`.
- [ ] Fusion de la PR de publication.
- [ ] Tag annoté `v0.34.0` créé sur le commit publié.
- [ ] Tag `v0.34.0` poussé vers `origin`.
- [ ] Déploiement de production confirmé.
- [ ] Vérifications post-déploiement effectuées.
