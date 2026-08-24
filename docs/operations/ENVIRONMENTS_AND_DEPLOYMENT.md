# Environnements et déploiement

Statut : **actuel** pour la configuration du dépôt. Les valeurs distantes
doivent être vérifiées dans Cloudflare avant une opération.

## Environnements

| Environnement | Usage |
| --- | --- |
| Local | Vite, IndexedDB locale, flags cloud désactivés par défaut |
| Preview | recette contrôlée d’une branche ; peut avoir des flags spécifiques |
| Production | `https://sportpilot-pages.pages.dev` et version approuvée |

`wrangler.jsonc` définit le projet Pages `sportpilot-pages`, la sortie `dist`,
la date de compatibilité et le binding D1 `SOCIAL_DIRECTORY_DB`.
`.env.example` documente les variables sans contenir de valeur secrète.

## Construction

```text
npm ci
npm run build
```

Le build exécute TypeScript puis Vite et génère le manifeste, les assets et le
service worker Workbox. Les Pages Functions sont livrées depuis `functions/`.

## Configuration

- Les flags `VITE_ENABLE_*` sont publics et prudents par défaut.
- `SOCIAL_DIRECTORY_DB` est un binding D1, pas une variable texte client.
- Les secrets IA sont configurés côté serveur.
- Les URLs, IDs de déploiement et variables Cloudflare doivent être relus
  directement avant toute publication ; ne pas recopier une valeur historique
  comme vérité courante.

## Autorisation

Une branche poussée ou une PR n’autorise aucun déploiement. Avant une Preview
ou production, obtenir une autorisation explicite précisant l’environnement.
Une production exige en plus une base Git, des checks verts, une version et un
plan de retour arrière validés.

## Gate manuel Dexie Cloud pour Goals

Toute future Preview qui modifie le journal ou le resolver Goals exige, avant
publication, le gate technique sur une base Dexie Cloud exclusivement dédiée
aux tests :

```text
SPORTPILOT_DEXIE_TEST_DB_URL=https://<base-test>.dexie.cloud
SPORTPILOT_DEXIE_TEST_CREDENTIAL_DIR=<dossier-local-credentials-test>
npm run test:integration-cloud:goals -- --repeat=5
npm run test:integration-cloud:goals -- --suite
npm run test:integration-cloud:goals -- --legacy-migration
```

Le premier run répète le conflit stale-offline contre branche déjà acceptée.
La suite couvre +1 h, +24 h, -24 h, miroir, les deux ordres de reconnexion de
branches offline, descendants stale, séquences normales, delete/restore,
reload, reprise après session, conservation des intentions, isolation et
absence de transport hors ligne. Le troisième gate crée une baseline legacy
dans `realGoals` sans head, la réconcilie explicitement avec le runtime v18 puis
rejoue le conflit. Le harness utilise deux vrais replicas et
un observateur REST indépendant. Les credentials restent locaux ; ils ne sont
ni committés, ni journalisés, ni transmis au navigateur.

Le harness refuse explicitement la base de production. La base de test doit
être remise à zéro uniquement pour ses comptes synthétiques. Ce gate dépend de
secrets et reste donc séparé de `npm run ci` ; son succès ne constitue aucune
autorisation de Preview, release ou production.

### Migration future du schéma cloud Goals

Cette opération est un gate séparé, à exécuter seulement avant une future
Preview explicitement autorisée. La base de production ne doit pas recevoir la
fixture de test ni de compte synthétique. La cible future est
`https://zhnyk8met.dexie.cloud` ; elle n’est ni lue ni modifiée par le harness.
Le changement attendu est additif :

```json
{
  "realGoalMutations": "id, accountUserId, entityId, parentMutationId, [accountUserId+entityId]",
  "realGoalMutationHeads": "id, accountUserId, entityId, mutationId, [entityId+mutationId], [accountUserId+entityId]"
}
```

Séquence requise : sauvegarder/inspecter le schéma courant, confirmer le SHA et
les gates de migration, ajouter uniquement cette table synchronisée, vérifier
le schéma et les CORS/whitelists, puis seulement autoriser une Preview composée
de deux nouveaux clients. Les tables `realGoals` et
`realGoalDeletionRecords` restent présentes pour le bootstrap historique ;
aucun backfill ne transforme les anciennes lignes en mutations utilisateur.

Un client v16 ignore les nouvelles tables et continue d’écrire les lignes
same-row. Un client v17 peut produire des mutations sans parent/head causal ;
v18 refuse d’en déduire un gagnant temporel. Les fenêtres mixtes v16/v18 et
v17/v18 sont explicitement non supportées pour des écritures concurrentes. Le
gate ancien/nouveau est limité à : état legacy immobile, connexion v18,
réconciliation explicite, puis mutations par des clients v18.

Le rollback du seul schéma est inutile et risqué : les tables additives peuvent
rester vides ou présentes. Un rollback applicatif vers v16 n’est sûr que si
aucune mutation causale n’a été créée. Après des mutations v18, il faut un correctif
en avant ou une matérialisation contrôlée du journal vers les tables legacy,
avec sauvegarde et vérification, avant tout retour d’ancien client.

## Vérifications après publication

- `/` et une route profonde : HTTP 200 ;
- `manifest.webmanifest` : type manifeste ;
- `sw.js` : JavaScript ;
- hashes distants identiques au build validé ;
- version attendue dans le bundle ;
- Pages Functions accessibles avec réponses JSON contrôlées ;
- références de rollback conservées.

Les checks Cloudflare automatiques attachés à une PR ne doivent pas être
présentés comme un déploiement autorisé ni relancés sans instruction.
