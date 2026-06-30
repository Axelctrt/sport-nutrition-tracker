# Phase C0 — environnement expérimental Dexie Cloud

- **Branche :** `experiment/dexie-cloud-weight-sync`
- **Snapshot d’entrée :** `f783f91`
- **Date de vérification :** 29 juin 2026
- **Portée :** préparation technique uniquement
- **Statut distant :** aucune base Dexie Cloud créée pendant C0

## 1. Objectif

C0 prépare un prototype de synchronisation sans connecter l’application réelle et sans rendre de nouvel écran accessible.

Le lot installe et verrouille `dexie-cloud-addon` en version `4.4.13`, puis ajoute une seconde base Dexie strictement isolée :

```text
Base réelle
sportpilot-local-database

Base expérimentale
sportpilot-sync-prototype-<identifiant Dexie Cloud>
```

Le suffixe distant est ajouté par Dexie Cloud grâce à `nameSuffix: true`. Un changement d’URL distante ne réutilise donc pas la même base IndexedDB expérimentale.

## 2. Frontière du prototype

La base expérimentale contient uniquement :

- `weights` ;
- `deletionRecords`.

Elle ne contient jamais :

- le profil réel ;
- la nutrition ;
- les activités ;
- les séances de musculation ;
- les paramètres utilisateur ou appareil ;
- les sauvegardes JSON ;
- les snapshots de corbeille.

Les identifiants restent fournis par SportPilot :

```text
weight:<date>
delection:weight:<identifiant>
```

Ils sont des chaînes globalement déterministes, conformément aux contraintes du prototype.

## 3. Activation explicite

Le prototype reste désactivé par défaut dans `.env.example` :

```dotenv
VITE_ENABLE_SYNC_PROTOTYPE=false
VITE_DEXIE_CLOUD_DATABASE_URL=
```

Aucun module de l’application n’instancie la base pendant C0.

L’activation ultérieure exigera un fichier local `.env.local` non suivi par Git :

```dotenv
VITE_ENABLE_SYNC_PROTOTYPE=true
VITE_DEXIE_CLOUD_DATABASE_URL=https://<identifiant>.dexie.cloud
```

La validation refuse :

- une URL HTTP ;
- un domaine autre que `*.dexie.cloud` ;
- un chemin, une requête ou un fragment ;
- des identifiants intégrés dans l’URL ;
- une activation sans URL ;
- une valeur d’activation autre que `true` ou `false`.

L’URL de base est publique. En revanche, aucun `client_id`, `client_secret` ou contenu de `dexie-cloud.key` ne doit être placé dans une variable `VITE_*`.

## 4. Authentification et synchronisation

La configuration expérimentale fixe :

- `requireAuth: true` ;
- authentification email OTP ;
- `socialAuth: false` ;
- `tryUseServiceWorker: false` ;
- `nameSuffix: true`.

Le prototype ne délègue donc pas la synchronisation au service worker SportPilot. Les échanges se feront uniquement lorsque la page expérimentale sera ouverte.

## 5. Sécurité du dépôt

Les fichiers CLI suivants sont explicitement ignorés et interdits dans l’audit du dépôt :

```text
dexie-cloud.json
dexie-cloud.key
```

`dexie-cloud.key` contient des identifiants de gestion et ne doit jamais être exposé au client ou à Git.

La CSP autorise uniquement les connexions HTTPS et WebSocket vers les sous-domaines hébergés `*.dexie.cloud`.

## 6. Création distante différée

La base distante ne doit être créée qu’après validation et commit de C0 :

```powershell
npx dexie-cloud@latest create
```

La commande demandera une adresse email et un code OTP, puis créera localement :

```text
dexie-cloud.json
dexie-cloud.key
```

Après création, l’URL publique de `dexie-cloud.json` sera copiée manuellement dans `.env.local`.

Les origines devront ensuite être autorisées séparément :

```powershell
npx dexie-cloud@latest whitelist http://localhost:5173
npx dexie-cloud@latest whitelist https://<tunnel-courant>.trycloudflare.com
```

Chaque nouvelle URL Cloudflare Tunnel devra être ajoutée, car l’origine change lorsque le tunnel est recréé.

## 7. Conditions avant C1

C1 ne pourra commencer qu’après confirmation des points suivants :

- [ ] C0 testé, linté, construit et commit ;
- [ ] base distante créée avec une adresse réservée au test ;
- [ ] fichiers CLI confirmés non suivis par Git ;
- [ ] `.env.local` créé sans secret ;
- [ ] origine locale autorisée ;
- [ ] origine du tunnel iPhone autorisée ;
- [ ] aucune donnée réelle utilisée ;
- [ ] procédure de retrait relue.

## 8. Hors périmètre C0

C0 n’ajoute pas :

- de route ;
- de page ;
- de bouton de connexion ;
- de repository de pesées synchronisées ;
- de création, suppression ou restauration distante ;
- de modification d’`AppDatabase` ;
- de migration Dexie ;
- de modification du backup JSON.
