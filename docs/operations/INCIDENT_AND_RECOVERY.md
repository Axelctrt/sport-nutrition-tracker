# Incidents et restauration

Statut : **procédure validée**.

## Priorités

1. protéger les personnes et la confidentialité ;
2. arrêter l’aggravation sans détruire les preuves ;
3. préserver une copie récupérable des données ;
4. identifier version, espace, appareil, commit et environnement ;
5. corriger en avant lorsque le schéma a évolué.

## Triage

Collecter uniquement :

- heure, route, version et navigateur ;
- espace invité/local/cloud concerné ;
- action déclenchante et résultat visible ;
- statut réseau/synchronisation ;
- référence de build ou commit ;
- export ou journal uniquement avec consentement et minimisation.

Ne jamais demander une clé, un token, un fichier `.env.local` ou
`dexie-cloud.key`.

## Données locales

- Ne pas supprimer IndexedDB, cache ou service worker avant sauvegarde.
- Tenter l’export via les parcours existants.
- Utiliser les validateurs de sauvegarde et les restaurations sélectives.
- Vérifier le journal de migration et le diagnostic d’intégrité.
- Tester la récupération sur une base séparée avant la base réelle.

## Cloud et synchronisation

- Suspendre le domaine fautif plutôt que tous les domaines si possible.
- Préserver les tombstones et baselines.
- Vérifier l’identité et l’espace avant une restauration cloud.
- Une correction D1 passe par une migration ou commande explicitement revue,
  jamais par une manipulation improvisée en production.

## Rollback

Le rollback applicatif ne doit pas charger une version incapable de lire les
données courantes. Consulter `ROLLBACK.md`, les release notes et les migrations.
Si une migration irréversible existe, préférer un correctif en avant.

## Clôture

Documenter cause, impact, détection, récupération, contrôles ajoutés et dette
restante. Révoquer tout secret exposé et vérifier les environnements liés.
