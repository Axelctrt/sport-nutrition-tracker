# Prototype Dexie Cloud — C1 applicatif

## Objet

Le lot C1 ajoute une route technique permettant de valider l’authentification
email OTP et l’état de synchronisation Dexie Cloud sans connecter la base réelle
de SportPilot.

Route locale :

```text
#/settings/sync-prototype
```

La route est enregistrée uniquement lorsque les deux variables locales sont
valides :

```text
VITE_ENABLE_SYNC_PROTOTYPE=true
VITE_DEXIE_CLOUD_DATABASE_URL=https://<base>.dexie.cloud
```

Elle ne figure dans aucun menu.

## Isolation

La base réelle reste :

```text
sportpilot-local-database
```

Le prototype utilise exclusivement :

```text
sportpilot-sync-prototype
```

Seules les tables expérimentales `weights` et `deletionRecords` sont déclarées.
Le lot C1 n’écrit encore aucune pesée et ne lit aucun repository de production.

## Authentification

L’écran ouvre explicitement la base expérimentale afin de restaurer une session
locale déjà enregistrée. L’option `customLoginGui` désactive l’interface générique
Dexie Cloud et le parcours est rendu directement dans la page SportPilot :

1. saisie de l’adresse email ;
2. toast bref confirmant l’envoi à une adresse partiellement masquée ;
3. saisie du code OTP dans la même carte ;
4. affichage du compte connecté.

L’option `requireAuth` reste désactivée pour éviter qu’une ouverture de base déclenche
un flux d’authentification concurrent. Dexie Cloud conserve la responsabilité de
l’envoi du code, de sa validation, des jetons et de la persistance de session.

L’application ne reçoit dans son état d’interface qu’un instantané filtré :

- état connecté ou déconnecté ;
- email ou identifiant utilisateur ;
- nom d’affichage éventuel ;
- type et statut de licence ;
- état et phase de synchronisation.

Les jetons d’accès, jetons de rafraîchissement et clés cryptographiques ne sont
jamais exposés au composant React.

## État de synchronisation

L’écran affiche :

- statut de connexion ;
- phase de synchronisation ;
- progression éventuelle ;
- erreur éventuelle ;
- commande de synchronisation manuelle ;
- commande de déconnexion.

## Test manuel local

1. Démarrer Vite avec `npm run dev`.
2. Ouvrir impérativement `http://localhost:5173`.
3. Aller sur `#/settings/sync-prototype`.
4. Saisir l’adresse email directement dans la page SportPilot.
5. Cliquer sur « Recevoir mon code ».
6. Vérifier le toast avec l’adresse partiellement masquée.
7. Saisir le code OTP directement dans la même carte.
8. Vérifier que le compte est affiché comme connecté.
9. Lancer une synchronisation manuelle.
10. Rafraîchir la page et vérifier la restauration automatique de la session.
11. Se déconnecter.

## Hors périmètre

- création de pesées fictives ;
- synchronisation entre deux appareils ;
- conflits ;
- suppression et restauration ;
- import de données réelles ;
- ajout d’un lien dans la navigation ;
- généralisation à `AppDatabase`.
