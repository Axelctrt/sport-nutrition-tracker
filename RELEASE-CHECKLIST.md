# Checklist de validation de développement — SportPilot 0.22.0 E2

## Préparation

- [ ] La branche `feature/full-account-continuity-0.22.0` est propre après application du lot E2.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] Les analyses cloud du compte principal affichent `0 différence` avant les scénarios de conflit.
- [ ] `npm ci` termine sans erreur sur une installation propre.
- [ ] `npm run check` termine sans erreur.
- [ ] `npm run test:stability` termine sans erreur.
- [ ] `npm run audit:rewards-routines-sync` réussit.
- [ ] Paramètres affiche encore `0.21.1` jusqu’au lot E4.
- [ ] Aucun secret, ZIP, journal ou fichier de patch temporaire n’est suivi par Git.

## Versions et compatibilité

- [ ] Le runtime Dexie Cloud de la branche E2 est en v10.
- [ ] Le runtime local est `sportpilot-sync-runtime-0.20.0-v10`.
- [ ] La table `realAccountPreferences` d’E1 reste disponible.
- [ ] La table `realRewardsRoutines` d’E2 est disponible.
- [ ] Le schéma métier reste en Dexie v8.
- [ ] La sauvegarde reste en JSON v7.
- [ ] Le registre des espaces reste en v1.
- [ ] Aucune migration de la base métier ou de la sauvegarde n’est requise.
- [ ] La possible nouvelle authentification OTP liée au runtime v10 est testée.

## E1 — profil et réglages partageables

- [ ] Le profil et les réglages partageables convergent à zéro au second passage.
- [ ] Un appareil vierge télécharge le profil cloud au lieu d’envoyer ses valeurs par défaut.
- [ ] Le mode clair ou sombre, le stockage, le minuteur et les métadonnées de sauvegarde restent locaux.
- [ ] Une modification limitée aux rappels ne crée aucune différence E1.
- [ ] La restauration initiale inclut le profil et les réglages.
- [ ] Un compte ne lit jamais l’agrégat d’un autre propriétaire.
- [ ] `npm run audit:account-preferences-sync` réussit.

## E2 — récompenses, thèmes et routines

- [ ] Les succès obtenus sont présents sur le second appareil.
- [ ] Les thèmes visuels SportPilot débloqués sont présents sur le second appareil.
- [ ] Le thème visuel SportPilot actif le plus récent est restauré.
- [ ] Le mode clair, sombre ou système reste propre à chaque appareil.
- [ ] Les missions hebdomadaires terminées sont fusionnées sans perte.
- [ ] Les préférences de rappels les plus récentes sont restaurées.
- [ ] Les rappels accomplis ne réapparaissent pas sur un autre appareil.
- [ ] La fusion conserve la date d’obtention la plus ancienne pour les états cumulatifs.
- [ ] Un appareil moins à jour ne peut retirer aucun succès, thème, mission ou rappel accompli.
- [ ] Un appareil vierge télécharge le cloud au lieu d’envoyer les valeurs par défaut.
- [ ] Une seconde analyse sans modification affiche `0 différence`.
- [ ] Un compte ne lit jamais l’agrégat E2 d’un autre propriétaire.
- [ ] `npm run audit:rewards-routines-sync` réussit.

## D3 — restauration après nouvelle installation

- [ ] Une installation vierge détecte les données cloud du compte.
- [ ] Le résumé par domaine apparaît avant toute modification locale.
- [ ] La restauration exige une confirmation explicite.
- [ ] Le cloud reste strictement en lecture seule pendant l’opération.
- [ ] Les profils et réglages E1 sont restaurés.
- [ ] Les récompenses, thèmes, missions et routines E2 sont restaurés.
- [ ] Les analyses reviennent à `0 différence` après restauration.
- [ ] Commencer avec un espace vide ne modifie pas le cloud.
- [ ] Une vraie donnée locale bloque la restauration globale.
- [ ] Un aperçu du compte A ne peut pas être utilisé pour le compte B.
- [ ] `npm run audit:cloud-account-restore` réussit.

## Isolation, hors ligne et non-régression

- [ ] `npm run audit:account-isolation` réussit.
- [ ] Le compte A ne voit aucune donnée du compte B.
- [ ] L’espace invité reste séparé et récupérable après déconnexion.
- [ ] Les synchronisations sportives et nutritionnelles convergent toujours.
- [ ] Le journal nutritionnel reste à zéro après un passage par l’accueil.
- [ ] L’export et la restauration JSON v7 fonctionnent.
- [ ] Les états E1 et E2 restent consultables hors connexion après restauration.
- [ ] La reprise après retour du réseau fonctionne.

## iPhone 15 — iOS 26

- [ ] La PWA ouvre le runtime v10 et permet la connexion OTP si elle est demandée.
- [ ] Le profil et les réglages E1 sont récupérés.
- [ ] Les récompenses, thèmes visuels et routines E2 sont récupérés.
- [ ] Le mode clair ou sombre local n’est pas écrasé.
- [ ] Après suppression/réinstallation, le compte détecte et restaure les données cloud.
- [ ] Le mode hors ligne fonctionne après restauration.
- [ ] Le changement de compte reste isolé.

## Fin du lot E2

- [ ] Les tests manuels ordinateur et iPhone sont validés.
- [ ] `git diff --check` ne retourne aucune erreur.
- [ ] Seuls les fichiers attendus d’E2 sont modifiés.
- [ ] E2 est commit dans `feature/full-account-continuity-0.22.0`.
- [ ] La branche n’est pas fusionnée dans `develop` avant la fin des lots E3 et E4.
- [ ] Aucun tag `v0.22.0` n’est créé avant E4.

## E3 — centre de synchronisation unifié

- [ ] Le centre affiche les neuf rubriques actives du compte.
- [ ] **Analyser tout** ne modifie aucune donnée et affiche l’état de chaque rubrique.
- [ ] **Synchroniser tout** exige une confirmation explicite.
- [ ] Une erreur sur une rubrique ne bloque pas les domaines suivants.
- [ ] Le message d’erreur reste visible sur la rubrique concernée.
- [ ] **Relancer uniquement les rubriques en échec** ne rejoue pas les domaines réussis.
- [ ] La dernière analyse et la dernière synchronisation sont affichées après rechargement.
- [ ] Les métadonnées du centre sont isolées par empreinte de compte.
- [ ] Le retour hors ligne désactive les actions cloud sans bloquer l’application.
- [ ] Le retour du réseau permet une nouvelle analyse sans rechargement obligatoire.
- [ ] Chaque lien **Détail** rejoint le panneau unitaire correspondant.
- [ ] Une seconde analyse après synchronisation affiche zéro différence partout.
- [ ] Le raccourci Synchronisation des données positionne l’en-tête de la rubrique, pas le sous-bloc État par rubrique.
- [ ] Fermer un détail replace la vue sur Synchronisation des données.
- [ ] Rappels n’active pas simultanément Paramètres dans la navigation.
- [ ] Corbeille n’active pas simultanément Sauvegarde dans la navigation.
- [ ] `npm run audit:unified-sync-center` réussit.
- [ ] Le runtime cloud reste en v10, la base métier en v8 et la sauvegarde en v7.

## Fin du lot E3

- [ ] Les tests manuels ordinateur et iPhone sont validés.
- [ ] `npm run check` et `npm run test:stability` réussissent.
- [ ] `git diff --check` ne retourne aucune erreur.
- [ ] E3 est commit dans `feature/full-account-continuity-0.22.0`.
- [ ] La branche n’est pas fusionnée dans `develop` avant E4.
- [ ] Aucun tag `v0.22.0` n’est créé avant E4.
