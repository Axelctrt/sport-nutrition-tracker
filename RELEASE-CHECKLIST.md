# Checklist de validation stable — SportPilot 0.18.0

## Préparation

- [ ] La branche `feature/account-data-spaces-0.18.0` est propre et à jour.
- [ ] Une sauvegarde JSON v7 récente est conservée hors de l’application.
- [ ] `npm ci` termine sans erreur.
- [ ] `npm run release:verify` termine sans erreur.
- [ ] `npm run test:e2e` termine sans erreur.
- [ ] `npm run audit:account-isolation` réussit.
- [ ] Paramètres affiche `0.18.0`.
- [ ] Aucun secret ni fichier de patch temporaire n’est suivi par Git.

## Conservation et mode invité

- [ ] La mise à jour conserve le profil, la nutrition, les activités, les séances, les objectifs et les pesées historiques.
- [ ] La base historique apparaît comme `Espace local invité`.
- [ ] L’application reste utilisable sans compte et hors connexion.
- [ ] L’export JSON fonctionne depuis l’espace invité.

## Première connexion

- [ ] Aucun rattachement n’est effectué automatiquement.
- [ ] `Rattacher mes données` copie les données sans vider l’espace invité.
- [ ] `Commencer avec un espace vide` n’importe aucune donnée locale.
- [ ] Un espace déjà enregistré ne peut pas être recréé comme vide.
- [ ] Une copie compte-vers-compte est refusée par le service métier.

## Isolation compte A / compte B

- [ ] Le compte A affiche uniquement ses propres données.
- [ ] Pendant le passage au compte B, aucun écran métier de A n’est monté.
- [ ] Un compte B neuf démarre vide.
- [ ] Une donnée créée dans B n’apparaît pas dans A.
- [ ] Le retour à A restitue les données de A sans celles de B.
- [ ] Les mêmes identifiants ou dates peuvent exister dans A et B sans collision.

## Compte et appareils

- [ ] La page affiche le compte, l’état de synchronisation et l’appareil actuel.
- [ ] La déconnexion conserve les données locales et revient à l’espace invité.
- [ ] La désassociation conserve la base et exige une réassociation explicite.
- [ ] La suppression locale exige `SUPPRIMER` et une confirmation forte.
- [ ] La suppression locale ne touche ni le cloud, ni l’invité, ni les autres comptes.

## Synchronisation des pesées

- [ ] Une pesée créée sur PC apparaît sur iPhone pour le même compte.
- [ ] Une modification est propagée.
- [ ] Une suppression est propagée.
- [ ] Le fonctionnement hors connexion et la reprise réseau sont valides.
- [ ] Aucun autre domaine n’est présenté comme synchronisé.

## Publication

- [ ] La branche fonctionnelle est fusionnée dans `develop` avec un commit explicite.
- [ ] `develop` validé est fusionné dans `main`.
- [ ] Le tag annoté `v0.18.0` pointe sur le commit publié dans `main`.
- [ ] `main`, `develop` et `v0.18.0` sont poussés.
- [ ] Le déploiement Cloudflare est terminé.
- [ ] La recette finale est validée sur ordinateur et iPhone 15 sous iOS 26.
