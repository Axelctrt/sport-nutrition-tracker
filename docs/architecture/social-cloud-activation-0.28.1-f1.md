# SportPilot 0.28.1 F1 — Activation contrôlée du cloud social réel

## Objectif

La phase 0.28.1 F1 ouvre la possibilité de piloter le cloud social réel par environnement de déploiement, sans l’activer par défaut dans le code source.

Le comportement attendu est le suivant :

- `syncPublicDeploymentConfig` conserve un défaut prudent : `VITE_ENABLE_REAL_SOCIAL_CLOUD=false`.
- Les variables `VITE_*` définies par l’hébergeur gardent la priorité en production.
- Cloudflare Preview peut activer `VITE_ENABLE_REAL_SOCIAL_CLOUD=true` pour une recette multi-comptes.
- Cloudflare Production peut rester à `false` tant que la recette réelle n’est pas validée.

## Variables Cloudflare recommandées

### Production prudente

```env
VITE_ENABLE_SYNC_PROTOTYPE=true
VITE_DEXIE_CLOUD_DATABASE_URL=https://zhnyk8met.dexie.cloud
VITE_ENABLE_REAL_SOCIAL_CLOUD=false
```

### Preview de validation sociale

```env
VITE_ENABLE_SYNC_PROTOTYPE=true
VITE_DEXIE_CLOUD_DATABASE_URL=https://zhnyk8met.dexie.cloud
VITE_ENABLE_REAL_SOCIAL_CLOUD=true
```

Les autres domaines synchronisés restent pilotés par leurs flags dédiés : poids, activités, objectifs, musculation, nutrition, préférences compte, récompenses et routines.

## Garde-fous conservés

L’activation du flag ne crée pas d’annuaire public et ne débloque pas de fonctionnalités hors périmètre. Les règles suivantes restent valables :

- recherche exacte uniquement ;
- aucune suggestion utilisateur ;
- aucune recherche partielle ;
- aucune relation basée sur handle ;
- permissions par `userId` ;
- résumé par défaut ;
- détail uniquement avec consentement explicite ;
- snapshots filtrés uniquement ;
- aucun export brut d’activité ;
- aucun like, commentaire, message, groupe ou classement.

## Recette minimale avant production

1. Déployer une Preview Cloudflare avec `VITE_ENABLE_REAL_SOCIAL_CLOUD=true`.
2. Créer deux comptes de test.
3. Réserver deux handles publics.
4. Chercher un handle exact existant.
5. Vérifier qu’un handle inexistant affiche `Identifiant inexistant`.
6. Envoyer une demande d’ami.
7. Accepter la demande depuis le deuxième compte.
8. Vérifier l’amitié cloud.
9. Vérifier que le niveau résumé est appliqué par défaut.
10. Activer le détail explicitement pour un ami.
11. Vérifier le feed avec snapshots filtrés.
12. Vérifier qu’un non-ami ne voit aucun snapshot.
13. Vérifier qu’aucun export brut n’apparaît.

## Hors périmètre

Cette phase ne publie pas encore `0.28.1`. Elle prépare uniquement l’activation contrôlée. Le passage en production et le bump de version restent à faire dans une phase finale dédiée.
