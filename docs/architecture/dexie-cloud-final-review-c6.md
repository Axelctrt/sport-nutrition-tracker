# Revue finale Dexie Cloud — C6

## Décision au commit 3372ba1

La branche C0 à C5 n'était pas fusionnable telle quelle malgré la validation
fonctionnelle PC et iPhone. Deux risques de sécurité fonctionnelle restaient :

1. une activation appareil n'était pas liée à un compte précis ;
2. les outils de laboratoire restaient visibles dès que les flags de
   synchronisation étaient activés.

Le coordinateur ouvrait également la base cloud au démarrage avant que la
préférence appareil soit activée.

## Corrections C6

### Consentement avant initialisation cloud

Le coordinateur charge d'abord `deviceSettings`. Lorsque
`automaticWeightSyncEnabled` vaut `false`, il ne lance pas
`client.initialize()` et ne programme aucun échange automatique.

L'écran de gestion du compte peut naturellement ouvrir Dexie Cloud lorsqu'il
est consulté explicitement par l'utilisateur.

### Liaison de l'activation au compte

`deviceSettings` conserve désormais :

- `automaticWeightSyncEnabled` ;
- `automaticWeightSyncAccountFingerprint`.

L'empreinte est dérivée de l'identifiant du compte, ne contient ni email en
clair ni jeton, et reste locale à l'appareil.

Avant chaque synchronisation, le contrôleur vérifie que le compte connecté
correspond à l'empreinte autorisée. En cas de différence :

- la synchronisation est annulée avant l'accès aux pesées réelles ;
- l'activation est désactivée localement ;
- l'utilisateur doit autoriser explicitement le nouveau compte.

Les activations C5 existantes sans empreinte sont automatiquement désactivées
une seule fois après mise à jour et demandent une nouvelle confirmation.

### Séparation de l'écran utilisateur et du laboratoire

Le flag `VITE_ENABLE_SYNC_DIAGNOSTICS` contrôle désormais les outils réservés au
laboratoire :

- pesées fictives ;
- diagnostic C3 ;
- synchronisation C4 manuelle ;
- informations techniques et garde-fous expérimentaux.

Avec le flag à `false`, la route affiche uniquement la connexion au compte et
l'état général du service.

## Invariants conservés

- aucune migration de `sportpilot-local-database` ;
- base locale principale toujours en version 8 ;
- sauvegarde JSON toujours en version 7 ;
- aucune autre donnée que les pesées n'est synchronisée ;
- `.env.local`, `dexie-cloud.json` et `dexie-cloud.key` restent ignorés ;
- la désactivation ne supprime aucune donnée locale ou cloud ;
- le rollback par feature flag reste disponible.

## Critères de validation avant fusion

- mise à jour d'un appareil C5 : état « Compte à confirmer », puis réactivation
  explicite sous le compte attendu ;
- aucun appel à l'initialisation cloud lorsque la fonction est désactivée ;
- changement du compte A vers le compte B : désactivation automatique sans
  transfert vers B ;
- nouvelle activation explicite sous B avant reprise ;
- écran utilisateur sans contenu C3/C4 ni pesées fictives ;
- écran laboratoire encore disponible uniquement avec le flag diagnostic ;
- tests ciblés, suite globale, stabilité, lint, build et audits réussis ;
- validation PC et iPhone.

## Activation en production

La fusion dans `develop` ne vaut pas activation générale. Les flags restent à
`false` par défaut. Une activation destinée aux utilisateurs exige encore :

- une politique de confidentialité décrivant Dexie Cloud et les données
  synchronisées ;
- une procédure de suppression du compte et des données cloud ;
- une supervision du quota, des licences et des erreurs de service ;
- un déploiement progressif avec possibilité de rollback.

## C6.1 — démarrage résilient

Une configuration Dexie Cloud absente ou invalide ne doit jamais empêcher le
reste de SportPilot de démarrer. La lecture tolérante de la configuration :

- désactive la route de gestion du compte lorsque la configuration n'est pas
  exploitable ;
- laisse toutes les autres routes disponibles ;
- expose une notice locale dans les paramètres au lieu d'une page blanche ;
- conserve toutes les pesées dans la base locale sans lancer de connexion
  cloud.

La lecture stricte reste utilisée par les tests de validation et par la
création effective du client Dexie Cloud une fois la configuration validée.


## Correctif C6.2 — accès permanent à la gestion du compte

La route `/settings/sync-prototype` est désormais toujours enregistrée dans le
routeur. Elle ne dépend plus de la validité de la configuration au moment où le
routeur est construit.

En cas de configuration absente ou invalide :

- SportPilot reste utilisable ;
- la route affiche une notice locale explicite ;
- le panneau des paramètres conserve le lien « Gérer le compte de
  synchronisation » ;
- aucune connexion Dexie Cloud ni synchronisation de pesée n'est lancée.

Les outils de laboratoire restent conditionnés au flag séparé
`VITE_ENABLE_SYNC_DIAGNOSTICS`.
