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
