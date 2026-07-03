# Checklist de publication — SportPilot 0.23.0

## Préparation

- [ ] La branche `feature/automatic-sync-resilience-0.23.0` est propre et synchronisée.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] Le centre affiche 9/9 rubriques à jour avant les scénarios de conflit.
- [ ] Aucun ZIP, journal, secret ou fichier de patch n’est suivi par Git.
- [ ] Paramètres affiche `0.23.0`.

## Contrôles automatiques

- [ ] `npm ci` réussit sur une installation propre.
- [ ] `npm run release:verify` réussit.
- [ ] `npm run test:e2e` réussit.
- [ ] `npm run audit:automatic-sync-release` réussit.
- [ ] `git diff --check` ne retourne aucune erreur.

## Versions et configuration

- [ ] Le runtime Dexie Cloud reste en v10.
- [ ] Le runtime local reste `sportpilot-sync-runtime-0.20.0-v10`.
- [ ] La base métier reste en Dexie v8.
- [ ] La sauvegarde reste en JSON v7.
- [ ] Le registre des espaces reste en v1.
- [ ] Les neuf domaines restent activés dans le build public.
- [ ] Les diagnostics de laboratoire restent désactivés.
- [ ] Aucune migration de données n’est requise.

## Automatisation et transparence

- [ ] L’activation reste liée explicitement au compte courant.
- [ ] Le démarrage et le premier plan déclenchent une analyse, jamais une écriture aveugle.
- [ ] Une modification locale propre est regroupée puis synchronisée.
- [ ] Sans base propre, une modification déclenche uniquement une analyse.
- [ ] L’historique distingue les actions manuelles et automatiques.
- [ ] Les tentatives hors ligne sont visibles.
- [ ] La dernière réussite et le dernier échec sont corrects.
- [ ] Une divergence demande un examen ou une fusion garantie non destructive.

## Robustesse multiappareils

- [ ] Deux opérations du même compte restent séquentielles.
- [ ] Deux comptes différents ne se bloquent pas mutuellement.
- [ ] Une perte réseau conserve les domaines déjà réussis.
- [ ] La relance ciblée ne rejoue que les échecs.
- [ ] Une fermeture n’entame pas de nouveau domaine.
- [ ] Une fin tardive de l’ancien compte n’altère pas le nouveau compte.
- [ ] Les modifications après déconnexion restent dans leur espace local.
- [ ] Le retour en ligne après plusieurs jours déclenche une analyse.
- [ ] Une modification immédiate après restauration est conservée.
- [ ] Les retours répétés au premier plan ne créent pas de rafale réseau.
- [ ] Les événements d’écriture pendant une synchronisation ne créent pas de boucle.

## iPhone 15 — iOS 26

- [ ] La PWA se met à jour vers 0.23.0.
- [ ] Une modification locale déclenche l’automatisation.
- [ ] Le retour au premier plan déclenche au maximum une analyse cohérente.
- [ ] Le mode avion et la reprise réseau réussissent.
- [ ] L’historique et les cartes restent lisibles sans débordement horizontal.
- [ ] Le mode Wi-Fi uniquement explique clairement le blocage lorsque le type est inconnu.

## Publication Git

- [ ] F4 est committé sur la branche de fonctionnalité.
- [ ] La branche est fusionnée manuellement dans `main`.
- [ ] `npm run release:verify` réussit sur `main`.
- [ ] Le tag annoté `v0.23.0` est créé sur le commit publié.
- [ ] `main` est fusionnée dans `develop`.
- [ ] La branche de fonctionnalité est supprimée localement et à distance.
- [ ] Le déploiement public est vérifié sur ordinateur et iPhone.
