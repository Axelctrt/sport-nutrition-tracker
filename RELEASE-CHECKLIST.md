# Checklist de validation stable — SportPilot 0.20.0

## Préparation

- [ ] La branche `feature/nutrition-sync-0.20.0` est propre et à jour.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] `npm ci` termine sans erreur.
- [ ] `npm run release:verify` termine sans erreur.
- [ ] `npm run test:e2e` termine sans erreur.
- [ ] `npm run audit:nutrition-sync-release` réussit.
- [ ] Paramètres affiche `0.20.0`.
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
- [ ] Le tag annoté `v0.20.0` pointe sur le commit publié dans `main`.
- [ ] `main`, `develop` et `v0.20.0` sont poussés.
- [ ] Le déploiement Cloudflare est terminé.
- [ ] La recette finale est validée sur ordinateur et iPhone 15 sous iOS 26.
