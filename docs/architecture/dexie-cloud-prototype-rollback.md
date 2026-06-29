# Rollback du prototype Dexie Cloud

Cette procédure retire le prototype sans toucher à `sportpilot-local-database`.

## 1. Désactivation immédiate

Dans `.env.local` :

```dotenv
VITE_ENABLE_SYNC_PROTOTYPE=false
```

Puis arrêter et relancer Vite.

L’absence du fichier `.env.local` désactive également le prototype.

## 2. Suppression de la base IndexedDB expérimentale

Le nom physique est composé de :

```text
sportpilot-sync-prototype-<identifiant distant>
```

La suppression devra être déclenchée par l’outil de retrait prévu dans une phase ultérieure ou depuis les outils de développement du navigateur.

Ne jamais supprimer :

```text
sportpilot-local-database
```

## 3. Suppression de l’environnement local

```powershell
Remove-Item .\.env.local -ErrorAction SilentlyContinue
Remove-Item .\dexie-cloud.json -ErrorAction SilentlyContinue
Remove-Item .\dexie-cloud.key -ErrorAction SilentlyContinue
```

Ces fichiers sont locaux et ne doivent pas être restaurés depuis Git.

## 4. Retrait de la base distante

Uniquement si une base de test a été créée :

```powershell
npx dexie-cloud@latest delete
```

La suppression distante utilise une période de grâce gérée par Dexie Cloud. Vérifier ensuite l’état avec les commandes CLI ou le gestionnaire Dexie Cloud.

## 5. Retrait du code expérimental

Avant fusion dans `develop`, la méthode privilégiée est d’abandonner ou de supprimer la branche expérimentale.

Si C0 a déjà été commit sur cette branche, revenir au commit de départ :

```text
f783f91
```

Ne jamais appliquer un reset destructif sans vérifier que le working tree est propre et que les éventuels travaux utiles ont été sauvegardés.

## 6. Invariants à contrôler

Après retrait :

- `AppDatabase` utilise toujours `sportpilot-local-database` ;
- Dexie reste en version 8 pour la base réelle ;
- le backup JSON reste en version 7 ;
- les données réelles sont intactes ;
- aucun fichier `dexie-cloud.key` ou `dexie-cloud.json` n’est suivi par Git ;
- l’application locale fonctionne sans compte et sans réseau.
