# SportPilot 0.29.0 — A26 Finalisation de la release sociale

## Objectif

A26 clôt la roadmap sociale sans ajouter de fonctionnalité. La phase transforme l’état validé en A25 en une release stable, documentée, versionnée et publiable sur `main`.

## Contenu

- passage de l’application de `0.28.1` à `0.29.0` ;
- alignement de `package.json`, `package-lock.json`, du build et des tests de version ;
- mise à jour des documents racine de publication ;
- notes de release `RELEASE-NOTES-0.29.0.md` ;
- audit final A26 intégré à `check` et `ci` ;
- conservation des contrats cloud historiques compatibles ;
- rappel des procédures de fusion, déploiement, tag et resynchronisation.

## Périmètre fonctionnel gelé

La release comprend :

- identité canonique et handle exact ;
- demandes et amitiés bilatérales ;
- suppression et recréation d’une relation ;
- permissions Aucun, Résumé et Personnalisé par ami ;
- champs détaillés cardio et musculation ;
- fil social et fiche détaillée ;
- résilience hors ligne et multi-appareil ;
- authentification et autorisation strictes.

Aucun like, commentaire, message, groupe, classement, annuaire public ou export brut n’est ajouté en A26.

## Compatibilité des données

- AppDatabase locale : Dexie v10 inchangée ;
- sauvegarde JSON : v9 inchangée ;
- runtime Dexie Cloud prototype : v14 inchangé ;
- migrations D1 existantes : `0001` et `0002` ;
- nouvelle migration A26 : aucune.

La migration `0002_social_friend_permission_fields_0_29_0.sql` ne doit pas être rejouée sur la base déjà migrée.

## Flux de publication

1. finaliser et pousser `release/0.29.0` ;
2. fusionner manuellement dans `develop` ;
3. relancer les contrôles critiques et construire la Preview ;
4. fusionner manuellement `develop` dans `main` ;
5. construire puis déployer `main` sur Cloudflare Pages ;
6. valider la production ;
7. créer le tag annoté `v0.29.0` ;
8. resynchroniser `develop` avec `main`.

## Critères de clôture

A26 est clôturée lorsque :

- la version affichée est `0.29.0` ;
- les documents de release sont cohérents ;
- les audits A25 et A26 passent ;
- lint, tests, build et audit des dépendances passent ;
- la production est validée avec deux comptes ;
- les routes anonymes restent en `401` ;
- le tag `v0.29.0` pointe vers le commit publié sur `main`.
