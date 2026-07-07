# SportPilot 0.29.0 A11 — Activation contrôlée du cloud social

## Statut

A11 prépare l’activation distante de D1 et les essais réels à deux comptes. Cette phase n’applique aucune migration distante et ne déploie rien automatiquement.

## Objectifs

- vérifier que la session Dexie Cloud est valide ;
- vérifier que le binding `SOCIAL_DIRECTORY_DB` est disponible ;
- vérifier le socle amis nécessaire au fil ;
- vérifier la table et les index du snapshot social sans modifier D1 ;
- distinguer une migration manquante d’un socle amis incomplet ;
- afficher ce diagnostic dans la page **Amis et confidentialité** ;
- fournir un mode opératoire reproductible pour le déploiement de prévisualisation et les tests à deux comptes.

## Endpoint

```text
GET /api/social-activity-snapshots/readiness
```

L’appel exige le même jeton Dexie Cloud que le fil et le détail.

Réponses fonctionnelles :

- `ready` : authentification, binding D1, tables et index disponibles ;
- `migrationRequired` : socle amis présent, mais migration `0001_social_activity_snapshots_0_29_0.sql` incomplète ou absente ;
- `prerequisiteMissing` : une table nécessaire au socle amis est absente.

Le handler inspecte `sqlite_master`. Il ne crée ni table ni index et n’appelle pas `ensureSchema`.

## Interface

La page **Amis et confidentialité** affiche un panneau **Activation contrôlée** avant le fil réel.

Le panneau :

- fonctionne sur mobile et ordinateur ;
- possède une action tactile de 44 px minimum ;
- se réactualise au changement de session et au retour en ligne ;
- ne montre ni userId interne ni jeton ;
- indique le contrat serveur et le fichier de migration attendu ;
- différencie connexion manquante, mode hors ligne, migration absente et service prêt.

## Activation distante prévue

L’activation doit être effectuée après commit A11, fusion manuelle dans `develop` et validation complète de `develop`.

### 1. Vérifier les secrets Pages

```powershell
npx wrangler pages secret list --project-name sportpilot-pages
```

Le nom `DEXIE_CLOUD_DATABASE_URL` doit apparaître. Sa valeur ne doit jamais être copiée dans Git ou dans les sorties partagées.

Si la variable est absente :

```powershell
npx wrangler pages secret put DEXIE_CLOUD_DATABASE_URL --project-name sportpilot-pages
```

Wrangler demande la valeur de façon interactive.

### 2. Vérifier D1 avant migration

```powershell
npx wrangler d1 execute sportpilot-social-directory --remote `
  --command "SELECT type, name FROM sqlite_master WHERE name LIKE 'social_activity_%' OR name LIKE 'idx_social_activity_snapshot_%' ORDER BY type, name;"
```

### 3. Appliquer la migration versionnée

```powershell
npx wrangler d1 execute sportpilot-social-directory --remote `
  --file .\migrations\0001_social_activity_snapshots_0_29_0.sql
```

La migration est additive et idempotente grâce aux clauses `IF NOT EXISTS`.

### 4. Vérifier D1 après migration

```powershell
npx wrangler d1 execute sportpilot-social-directory --remote `
  --command "SELECT type, name FROM sqlite_master WHERE name = 'social_activity_snapshots' OR name LIKE 'idx_social_activity_snapshot_%' ORDER BY type, name;"
```

Les objets attendus sont :

- `social_activity_snapshots` ;
- `idx_social_activity_snapshot_source_recipient` ;
- `idx_social_activity_snapshot_feed` ;
- `idx_social_activity_snapshot_owner`.

### 5. Déployer une prévisualisation depuis `develop`

```powershell
Remove-Item .\dist -Recurse -Force -ErrorAction SilentlyContinue
npm run build

npx wrangler pages deploy .\dist `
  --project-name sportpilot-pages `
  --branch develop `
  --commit-dirty=true
```

Le déploiement `develop` reste une prévisualisation. La production `sportpilot-pages.pages.dev` n’est pas remplacée.

La branche dispose normalement de l’alias stable :

```text
https://develop.sportpilot-pages.pages.dev
```

Cette origine doit être autorisée dans Dexie Cloud avant les essais de connexion sur la prévisualisation.

## Validation à deux comptes

### Compte A — activité cardio

1. régler le partage global sur `Résumé` ;
2. créer une course ;
3. attendre la synchronisation ;
4. vérifier chez B que la carte apparaît sans détail ;
5. passer l’activité en `Détaillé` ;
6. vérifier chez B l’ouverture du détail autorisé ;
7. masquer les calories et la fréquence cardiaque ;
8. vérifier leur disparition après actualisation ;
9. rendre l’activité privée ;
10. vérifier sa disparition du fil.

### Compte A — musculation

1. terminer une séance ;
2. partager exercices, séries et répétitions ;
3. masquer les charges ;
4. vérifier chez B que les exercices et répétitions restent visibles ;
5. autoriser les charges ;
6. vérifier leur apparition ;
7. supprimer la séance ;
8. vérifier sa disparition.

### Révocation

1. supprimer l’amitié ;
2. actualiser le fil du compte B ;
3. vérifier que les cartes disparaissent ;
4. tenter d’ouvrir un ancien détail ;
5. vérifier une réponse d’accès refusé ou introuvable.

### Hors ligne

1. créer une activité chez A hors ligne ;
2. fermer la PWA ;
3. revenir en ligne ;
4. rouvrir l’application ;
5. vérifier que B reçoit une seule carte, sans doublon.

## Rollback

La migration est additive. Le rollback applicatif consiste à redéployer le dernier commit stable ; l’ancienne version ignore la nouvelle table.

Ne pas supprimer la table distante pendant les essais. En cas d’échec, conserver le schéma et désactiver le déploiement de prévisualisation. Les données de test peuvent être supprimées de manière ciblée après identification explicite des comptes concernés.
