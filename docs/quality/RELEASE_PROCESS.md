# Processus de release

Statut : **décision validée**.

## Flux Git

1. actualiser `main`, `develop`, tags et commit de production ;
2. créer une branche dédiée depuis la base appropriée ;
3. livrer des commits cohérents ;
4. ouvrir une PR vers `develop` ;
5. obtenir checks verts et validation ;
6. fusionner uniquement avec autorisation explicite ;
7. préparer séparément la publication vers `main` ;
8. tag, release et déploiement uniquement avec autorisations explicites.

Le dépôt utilise historiquement des merge commits pour les PR d’intégration.
Ne pas changer de stratégie silencieusement.

## Validation

- lint, TypeScript/build, Vitest complet et stabilité ;
- audits métier et repository/release ;
- Playwright adapté au périmètre ;
- test PWA de mise à jour et conservation des données ;
- migrations, sauvegarde, synchronisation et rollback si concernés ;
- checklist manuelle ciblée.

## Version et données

Aligner `package.json`, bundle, README/release notes et audits. Ne jamais
augmenter une version de données pour un changement sans schéma. Ne jamais
modifier une migration publiée.

## Publication

Conserver le SHA du build validé. Après déploiement, vérifier HTTP, types MIME,
hashes, version, service worker, manifeste et Functions. Enregistrer URL
immuable et identifiant de déploiement sans supprimer les références
historiques.

## Retour arrière

Vérifier d’abord la compatibilité de lecture des données. Préférer un correctif
en avant si une ancienne application ne peut pas lire le schéma courant.
