# Checklist de publication — SportPilot 0.22.0

## Préparation

- [ ] La branche `feature/full-account-continuity-0.22.0` est propre et synchronisée.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] Le centre affiche 9/9 rubriques à jour avant les scénarios de conflit.
- [ ] Aucun ZIP, journal, secret ou fichier de patch n’est suivi par Git.
- [ ] Paramètres affiche `0.22.0`.

## Contrôles automatiques

- [ ] `npm ci` réussit sur une installation propre.
- [ ] `npm run release:verify` réussit.
- [ ] `npm run test:e2e` réussit.
- [ ] `npm run audit:full-account-continuity-release` réussit.
- [ ] `git diff --check` ne retourne aucune erreur.

## Versions et configuration

- [ ] Le runtime Dexie Cloud est en v10.
- [ ] Le runtime local est `sportpilot-sync-runtime-0.20.0-v10`.
- [ ] La base métier reste en Dexie v8.
- [ ] La sauvegarde reste en JSON v7.
- [ ] Le registre des espaces reste en v1.
- [ ] Les neuf domaines sont activés dans le build public.
- [ ] Les diagnostics de laboratoire restent désactivés.
- [ ] Aucune migration de données n’est requise.

## Centre de synchronisation

- [ ] **Analyser tout** affiche le statut de chaque rubrique sans modifier les données.
- [ ] **Synchroniser tout** exige une confirmation explicite.
- [ ] Une erreur n’interrompt pas les rubriques suivantes.
- [ ] La relance ciblée ne rejoue que les échecs.
- [ ] Une seconde analyse après synchronisation affiche 9/9 et 0 différence.
- [ ] Les détails sont chargés un par un et se ferment vers Synchronisation des données.
- [ ] Le mode hors connexion désactive les actions cloud.
- [ ] Le retour du réseau permet une nouvelle analyse.
- [ ] Modifier un objectif ouvre l’éditeur sans page 404 et conserve la route `/goals`.

## Multiappareils et conflits

- [ ] Le profil et les réglages partageables convergent sur deux appareils.
- [ ] Les succès, thèmes visuels, missions et routines convergent sans perte.
- [ ] Les dates d’obtention les plus anciennes sont conservées.
- [ ] Les préférences les plus récentes gagnent.
- [ ] Le mode clair ou sombre reste local.
- [ ] Le compte A ne lit aucune donnée du compte B.
- [ ] L’espace invité reste séparé et récupérable.

## Restauration

- [ ] Une installation vierge détecte les données cloud.
- [ ] La restauration exige une confirmation.
- [ ] Les neuf rubriques sont restaurées.
- [ ] Les valeurs par défaut locales n’écrasent pas le cloud.
- [ ] Une vraie donnée locale bloque le remplacement global.
- [ ] Les données restaurées restent consultables hors connexion.

## iPhone 15 — iOS 26

- [ ] La PWA se met à jour vers 0.22.0.
- [ ] Le centre affiche 9/9 rubriques.
- [ ] Une synchronisation et une restauration vierge réussissent.
- [ ] Le mode hors connexion et la reprise réseau réussissent.
- [ ] Rappels, Corbeille et Paramètres n’ont jamais deux sélections simultanées.

## Publication Git

- [ ] E4 est committé sur la branche de fonctionnalité.
- [ ] La branche est fusionnée manuellement dans `main`.
- [ ] `npm run release:verify` réussit sur `main`.
- [ ] Le tag annoté `v0.22.0` est créé sur le commit publié.
- [ ] `main` est fusionnée dans `develop`.
- [ ] La branche de fonctionnalité est supprimée localement et à distance.
- [ ] Le déploiement public est vérifié sur ordinateur et iPhone.

## Roadmap 0.23.0 — F1 avant commit

- [ ] Le centre manuel utilise l’orchestrateur pour les neuf rubriques.
- [ ] Une analyse ne déclenche aucune écriture.
- [ ] Les domaines sont exécutés séquentiellement.
- [ ] Deux instances du même compte ne s’exécutent pas simultanément.
- [ ] Une erreur n’interrompt pas les domaines suivants.
- [ ] La relance rejoue uniquement les domaines en échec.
- [ ] Les demandes différées rapprochées sont regroupées par anti-rebond.
- [ ] Aucune synchronisation automatique n’est encore activée.
- [ ] `npm run audit:sync-orchestrator` réussit.
- [ ] Les versions cloud, métier et sauvegarde restent inchangées.

## Roadmap 0.23.0 — F2 avant commit

- [ ] L’automatisation reste liée explicitement au compte autorisé sur l’appareil.
- [ ] Le démarrage et le retour au premier plan déclenchent une analyse, jamais une écriture aveugle.
- [ ] Le retour du réseau, la connexion et la restauration déclenchent une analyse.
- [ ] Une modification locale avec base propre est synchronisée après anti-rebond.
- [ ] Sans base propre, la modification locale déclenche seulement une analyse.
- [ ] Le mode Wi-Fi uniquement bloque lorsque le type de connexion est inconnu.
- [ ] L’ancien automatisme des pesées est désactivé lors de l’activation globale.
- [ ] Le centre manuel reste utilisable à tout moment.
- [ ] Aucun traitement PWA en arrière-plan n’est requis.
- [ ] `npm run audit:automatic-sync` réussit.
- [ ] Les versions cloud v10, métier v8 et sauvegarde v7 restent inchangées.

## 0.23.0 F3 — transparence de synchronisation

- [ ] L’historique récent distingue les opérations manuelles et automatiques.
- [ ] La dernière réussite et le dernier échec sont visibles par compte.
- [ ] Une divergence propose d’examiner les détails avant toute fusion.
- [ ] Aucun choix directionnel local/cloud n’est simulé lorsqu’il n’est pas garanti par le domaine.
- [ ] Le journal local reste borné et facultatif.
