# Checklist de validation stable — SportPilot 0.21.1

## Préparation

- [ ] La branche `fix/nutrition-journal-sync-loop-0.21.1` est propre et à jour.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] Les analyses cloud du compte principal affichent `0 différence`.
- [ ] `npm ci` termine sans erreur.
- [ ] `npm run release:verify` termine sans erreur.
- [ ] `npm run test:e2e` termine sans erreur.
- [ ] `npm run audit:data-continuity-release` réussit.
- [ ] Paramètres affiche `0.21.1`.
- [ ] Aucun secret, ZIP, journal ou fichier de patch temporaire n’est suivi par Git.

## Versions et compatibilité

- [ ] La base Dexie Cloud reste en v8.
- [ ] Le runtime reste `sportpilot-sync-runtime-0.20.0-v8`.
- [ ] Le schéma métier reste en Dexie v8.
- [ ] La sauvegarde reste en JSON v7.
- [ ] Le registre des espaces reste en v1.
- [ ] Aucune migration de données ni nouvelle authentification OTP n’est requise.

## Correctif 0.21.1 — journal nutritionnel

- [ ] Synchroniser le journal nutritionnel puis vérifier `0 différence`.
- [ ] Ouvrir l’accueil sans modifier aucune donnée.
- [ ] Revenir dans la synchronisation du journal et vérifier encore `0 différence`.
- [ ] Modifier réellement une donnée qui influence l’objectif du jour et vérifier qu’un écart légitime apparaît.
- [ ] Synchroniser cet écart puis vérifier une nouvelle convergence à zéro.
- [ ] Les autres domaines restent à `0 différence`.

## D1 — Gestion du compte

- [ ] Tous les accès de gestion ouvrent **Compte et appareils**.
- [ ] Le compte, le cloud et l’espace local actif sont clairement identifiés.
- [ ] La déconnexion ne supprime aucune donnée.
- [ ] Le changement de compte ne mélange aucun espace.
- [ ] La suppression locale reste distincte de la déconnexion et du cloud.
- [ ] `npm run audit:account-management` réussit.

## D2 — Import des données invitées

- [ ] Une analyse est obligatoire avant l’import.
- [ ] Les compteurs sont détaillés par domaine.
- [ ] La donnée la plus récente gagne en cas de collision fonctionnelle.
- [ ] Les doublons de date, créneau et code-barres sont traités.
- [ ] Les références nutritionnelles restent cohérentes.
- [ ] L’import est atomique et l’espace invité reste intact.
- [ ] Une seconde analyse sans modification affiche zéro opération.
- [ ] Un changement après analyse invalide l’aperçu.
- [ ] `npm run audit:guest-data-import` réussit.

## D3 — Restauration après nouvelle installation

- [ ] Une installation vierge détecte les données cloud du compte.
- [ ] Le résumé par domaine apparaît avant toute modification locale.
- [ ] La restauration exige une confirmation explicite.
- [ ] Le cloud reste strictement en lecture seule pendant l’opération.
- [ ] La préparation temporaire et l’écriture locale atomique sont validées.
- [ ] Les suppressions cloud sont respectées sans résurrection.
- [ ] Les analyses reviennent à `0 différence` après restauration.
- [ ] Commencer avec un espace vide ne modifie pas le cloud.
- [ ] La restauration différée reste disponible tant que l’espace n’est pas utilisé.
- [ ] Une vraie donnée locale bloque la restauration globale.
- [ ] Un aperçu du compte A ne peut pas être utilisé pour le compte B.
- [ ] `npm run audit:cloud-account-restore` réussit.

## Isolation, hors ligne et non-régression

- [ ] `npm run audit:account-isolation` réussit.
- [ ] Le compte A ne voit aucune donnée du compte B.
- [ ] L’espace invité reste séparé et récupérable après déconnexion.
- [ ] Les synchronisations sportives et nutritionnelles convergent toujours.
- [ ] L’export et la restauration JSON v7 fonctionnent.
- [ ] Les données restaurées restent consultables hors connexion.
- [ ] La reprise après retour du réseau fonctionne.
- [ ] Les récompenses, thèmes, missions et rappels locaux restent intacts.

## iPhone 15 — iOS 26

- [ ] La PWA se met à jour vers 0.21.1 sans perte de l’installation existante.
- [ ] Après suppression/réinstallation, le compte détecte ses données cloud.
- [ ] La restauration complète est validée sur l’iPhone.
- [ ] Le mode hors ligne fonctionne après restauration.
- [ ] Le changement de compte reste isolé.

## Publication

- [ ] La branche fonctionnelle est fusionnée manuellement dans `develop`.
- [ ] `develop` validé est fusionné manuellement dans `main`.
- [ ] Le tag annoté `v0.21.1` pointe sur le commit publié dans `main`.
- [ ] `develop`, `main` et `v0.21.1` sont poussés.
- [ ] Le déploiement de production est terminé.
- [ ] La recette finale est validée sur ordinateur et iPhone.
