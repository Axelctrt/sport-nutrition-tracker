# Checklist de validation stable — SportPilot 0.19.0

## Préparation

- [ ] La branche `feature/sports-sync-0.19.0` est propre et à jour.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] `npm ci` termine sans erreur.
- [ ] `npm run release:verify` termine sans erreur.
- [ ] `npm run test:e2e` termine sans erreur.
- [ ] `npm run audit:sports-sync-release` réussit.
- [ ] Paramètres affiche `0.19.0`.
- [ ] Aucun secret ni fichier de patch temporaire n’est suivi par Git.

## Compte et runtime cloud

- [ ] Le compte connecté ouvre le bon espace local.
- [ ] Le runtime utilisé est `sportpilot-sync-runtime-0.20.0-v6`.
- [ ] Une reconnexion OTP éventuelle ne supprime aucune donnée métier.
- [ ] La synchronisation des pesées se termine sans délai d’expiration.
- [ ] Un changement de compte ne montre aucune donnée de l’espace précédent.

## Pesées, activités et objectifs

- [ ] Une création est transférée entre deux navigateurs.
- [ ] Une modification est transférée sans doublon.
- [ ] Une suppression est propagée sans résurrection.
- [ ] L’analyse revient à `0 différence` après synchronisation.
- [ ] Les métadonnées Dexie Cloud ne créent aucune fausse divergence.

## Musculation

- [ ] Un exercice personnalisé est transféré.
- [ ] Un modèle est récupéré avec tous ses exercices.
- [ ] Une séance est récupérée avec tous ses exercices et séries.
- [ ] Deux synchronisations successives ne créent aucun doublon.
- [ ] La suppression d’une série est propagée.
- [ ] La suppression d’un exercice de séance supprime ses séries.
- [ ] Aucune séance partielle ni série orpheline n’apparaît.
- [ ] Une modification distante converge vers `0 différence`.

## Non-régression

- [ ] Le mode invité reste fonctionnel.
- [ ] La nutrition reste intacte et locale à l’espace actif.
- [ ] Les récompenses, thèmes et rappels restent intacts.
- [ ] L’export et la restauration JSON v7 fonctionnent.
- [ ] Le schéma métier reste en Dexie v8.
- [ ] Le fonctionnement hors connexion reste disponible.

## Publication

- [ ] La branche fonctionnelle est fusionnée dans `develop`.
- [ ] `develop` validé est fusionné dans `main`.
- [ ] Le tag annoté `v0.19.0` pointe sur le commit publié dans `main`.
- [ ] `main`, `develop` et `v0.19.0` sont poussés.
- [ ] Le déploiement Cloudflare est terminé.
- [ ] La recette finale est validée sur ordinateur et iPhone 15 sous iOS 26.


## Prévalidation 0.20.0 C1 — journal nutritionnel

- [ ] Le panneau **Synchronisation du journal nutritionnel** est disponible.
- [ ] Une journée contenant repas, entrée, objectif et statut converge vers `0 différence`.
- [ ] Deux synchronisations successives ne créent aucun doublon.
- [ ] Une suppression d’entrée est propagée sans supprimer le repas.
- [ ] Une suppression de repas supprime aussi ses entrées sur l’autre appareil.
- [ ] Une journée distante incohérente est refusée sans écriture partielle.
- [ ] Les produits et recettes restent hors périmètre jusqu’à C2.
- [ ] Le runtime `sportpilot-sync-runtime-0.20.0-v6` peut demander une reconnexion OTP unique.
