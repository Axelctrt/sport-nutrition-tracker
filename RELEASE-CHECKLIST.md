# Checklist de validation stable — SportPilot 0.20.1

## Préparation

- [ ] La branche `fix/nutrition-daily-target-uniqueness` est propre et à jour.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] `npm ci` termine sans erreur.
- [ ] `npm run release:verify` termine sans erreur.
- [ ] `npm run test:e2e` termine sans erreur.
- [ ] `npm run audit:nutrition-sync-release` réussit.
- [ ] Paramètres affiche `0.20.1`.
- [ ] Aucun secret ni fichier de patch temporaire n’est suivi par Git.

## Compte et runtime cloud

- [ ] Le compte connecté ouvre le bon espace local.
- [ ] Le runtime utilisé est `sportpilot-sync-runtime-0.20.0-v8`.
- [ ] Le passage de C3 à C4 ne demande pas de nouvelle reconnexion OTP.
- [ ] Une reconnexion éventuelle ne supprime aucune donnée métier.
- [ ] Un changement de compte ne montre aucune donnée de l’espace précédent.
- [ ] Les données de l’espace invité réapparaissent après déconnexion du compte.

## Synchronisation sportive

- [ ] Les pesées convergent vers `0 différence`.
- [ ] Les activités convergent sans doublon.
- [ ] Les objectifs convergent sans doublon.
- [ ] Les exercices, modèles, séances et séries de musculation restent complets.
- [ ] Les suppressions sportives ne provoquent aucune résurrection.

## Journal nutritionnel C1

- [ ] Une journée contenant repas, entrées, objectif et statut est transférée.
- [ ] Une entrée ne peut pas exister sans repas parent cohérent.
- [ ] Une suppression d’entrée est propagée sans supprimer les autres entrées.
- [ ] Une suppression de repas supprime aussi ses entrées.
- [ ] Deux synchronisations successives reviennent à `0 différence`.

## Bibliothèque nutritionnelle C2

- [ ] Un produit manuel est transféré.
- [ ] Un produit Open Food Facts utilisé est transféré.
- [ ] Un cache Open Food Facts inutilisé reste local.
- [ ] Une recette est récupérée avec tous ses ingrédients et produits.
- [ ] Un repas favori conserve toutes ses références.
- [ ] Deux produits portant le même code-barres convergent vers une seule fiche.
- [ ] Les références du journal sont remappées sans perte nutritionnelle.
- [ ] La suppression d’une recette ou d’un favori ne ressuscite pas.

## Suivi nutritionnel C3

- [ ] Un bilan hebdomadaire et son ajustement éventuel sont transférés ensemble.
- [ ] Un ajustement orphelin ou lié à une décision non acceptée est refusé.
- [ ] Un seul ajustement est associé à chaque bilan.
- [ ] Les objectifs quotidiens obsolètes sont recalculés.
- [ ] Les objectifs corrigés sont propagés via C1.
- [ ] Deux synchronisations successives reviennent à `0 différence`.

## Isolation et non-régression

- [ ] Le compte A ne voit aucune donnée du compte B.
- [ ] L’espace invité reste fonctionnel et séparé.
- [ ] Les récompenses, thèmes, missions et rappels restent intacts.
- [ ] L’export et la restauration JSON v7 fonctionnent.
- [ ] Le schéma métier reste en Dexie v8.
- [ ] Le fonctionnement hors connexion reste disponible.
- [ ] La reprise après retour du réseau fonctionne.

## Publication

- [ ] La branche fonctionnelle est fusionnée dans `develop`.
- [ ] `develop` validé est fusionné dans `main`.
- [ ] Le tag annoté `v0.20.1` pointe sur le commit publié dans `main`.
- [ ] `main`, `develop` et `v0.20.1` sont poussés.
- [ ] Le déploiement Cloudflare est terminé.
- [ ] La recette finale est validée sur ordinateur et iPhone 15 sous iOS 26.

## Phase 0.21.0 D1

- [ ] Les sept boutons de gestion du compte ouvrent `/settings/account-devices`.
- [ ] Le compte connecté, l’état cloud et l’espace actif sont visibles en production.
- [ ] La déconnexion conserve les données locales et cloud.
- [ ] Le changement de compte revient par l’écran de connexion sans mélange entre espaces.
- [ ] `npm run audit:account-management` réussit.

## Phase 0.21.0 D2

- [ ] Une analyse est obligatoire avant l’import.
- [ ] Le nombre d’ajouts, mises à jour et doublons est affiché par domaine.
- [ ] Un compte existant reçoit les données invitées sans écrasement arbitraire.
- [ ] La donnée la plus récente gagne en cas de collision fonctionnelle.
- [ ] Les produits Open Food Facts identiques sont dédupliqués par code-barres.
- [ ] Les entrées alimentaires restent rattachées au bon repas et au bon produit.
- [ ] Les ajustements caloriques restent rattachés à leur bilan hebdomadaire.
- [ ] Une modification après l’analyse force une nouvelle analyse.
- [ ] L’espace invité reste intégralement disponible après déconnexion.
- [ ] Une seconde importation ne crée aucun doublon.
- [ ] `npm run audit:guest-data-import` réussit.
