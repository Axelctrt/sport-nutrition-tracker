# Prototype Dexie Cloud — C3 robustesse et décision go/no-go

## Statut du lot

C3 reste un prototype isolé. Il ne synchronise que les tables expérimentales
`weights` et `deletionRecords` de la base `sportpilot-sync-prototype`.

La base réelle `sportpilot-local-database`, son schéma, ses migrations et les
sauvegardes JSON ne sont pas ouverts ni modifiés par ce lot.

## Objectifs

- rendre les conflits de modification observables et reproductibles ;
- réduire les écrasements inutiles entre deux appareils ;
- vérifier qu’une suppression reste dominante face à une ancienne copie hors
  ligne ;
- vérifier l’isolation entre comptes ;
- fournir un diagnostic copiable sans email, jeton ou donnée réelle ;
- formaliser les critères de décision avant toute migration de vraies pesées.

## Politique de conflit

### Propriétés différentes

La mise à jour d’une pesée existante utilise `Table.update()` avec uniquement
les propriétés réellement modifiées. Une modification du poids sur un appareil
et une modification de la note sur un autre appareil peuvent donc être fusionnées
sans que l’une écrase inutilement l’autre.

### Même propriété

Si deux appareils modifient hors ligne la même propriété du même objet, la
dernière opération acceptée par la synchronisation gagne. C3 ne prétend pas
fournir une fusion sémantique des nombres ou du texte.

### Suppression contre ancienne modification hors ligne

La suppression écrit d’abord un `deletionRecord` au statut `deleted`, puis retire
la pesée. Si une ancienne copie de la pesée réapparaît après la reconnexion d’un
appareil hors ligne, l’interface la masque tant que le marqueur reste `deleted`.

Une recréation volontaire de la même date produit un marqueur `restored`. Cette
action est considérée comme explicite et ne doit pas être confondue avec une
résurrection silencieuse.

## Diagnostic C3

Le panneau repliable affiche :

- une empreinte stable du compte, sans exposer son email ou son identifiant ;
- le nom et la version de la base expérimentale ;
- le nombre de pesées visibles et de marqueurs de suppression ;
- la dernière fin de synchronisation observée ;
- le dernier rafraîchissement local ;
- la date de mise à jour de la pesée visible la plus récente.

Le bouton **Copier le diagnostic** génère un JSON qui ne contient :

- aucun email ;
- aucun jeton ou secret ;
- aucune donnée de la base réelle ;
- aucune valeur de poids ou note.

## Matrice de validation manuelle

Utiliser exclusivement des valeurs et notes fictives.

| ID | Scénario | Procédure résumée | Résultat attendu |
| --- | --- | --- | --- |
| C3-01 | Même compte sur deux appareils | Se connecter sur PC et iPhone, puis comparer l’empreinte C3 | Empreinte identique |
| C3-02 | Deux comptes distincts | Créer une pesée avec le compte A, puis ouvrir le compte B | Empreintes différentes et aucune pesée de A visible dans B |
| C3-03 | Modification de propriétés différentes | PC hors ligne : modifier le poids. iPhone : modifier uniquement la note. Reconnecter et synchroniser | Le nouveau poids et la nouvelle note sont conservés |
| C3-04 | Modification concurrente du même poids | Modifier le poids différemment sur les deux appareils hors ligne, puis reconnecter successivement | Une seule valeur finale cohérente ; la dernière opération synchronisée gagne |
| C3-05 | Modification concurrente de la même note | Modifier la note différemment sur les deux appareils hors ligne | Une seule note finale cohérente ; la dernière opération synchronisée gagne |
| C3-06 | Suppression pendant appareil hors ligne | Garder l’iPhone hors ligne avec la pesée visible, supprimer sur PC, modifier sur iPhone, puis reconnecter | La pesée reste masquée et le marqueur de suppression reste visible |
| C3-07 | Restauration explicite | Après C3-06, recréer volontairement la même date depuis un appareil à jour | La pesée réapparaît et le marqueur passe à `restored` |
| C3-08 | Déconnexion / reconnexion | Se déconnecter, vérifier l’effacement des formulaires, puis se reconnecter | Session propre et données du même compte restaurées |
| C3-09 | Stockage navigateur vidé | Supprimer les données du site sur un appareil, rouvrir, se reconnecter | Nouvelle base locale reconstruite depuis le cloud |
| C3-10 | Rechargement hors ligne | Ouvrir une session déjà initialisée, couper le réseau et recharger | L’application reste utilisable avec les données locales déjà présentes |
| C3-11 | Diagnostic non sensible | Copier le diagnostic et inspecter le JSON | Aucun email, secret, poids, note ou nom de base réelle |
| C3-12 | Isolation de la base réelle | Créer/modifier/supprimer dans le prototype puis revenir aux écrans réels de poids | Aucune modification dans l’historique réel |

## Ordre recommandé pour les conflits

Pour rendre le résultat reproductible :

1. attendre que les deux appareils affichent la phase **À jour** ;
2. noter l’empreinte et l’heure du diagnostic ;
3. mettre l’appareil qui doit conserver une opération en mode avion ;
4. réaliser les modifications prévues ;
5. reconnecter d’abord l’appareil dont l’opération doit être la plus ancienne ;
6. attendre **À jour** ;
7. reconnecter ensuite le second appareil ;
8. synchroniser les deux appareils et comparer le diagnostic.

## Critères go

La décision peut être **go pour une phase de migration contrôlée des vraies
pesées** uniquement si :

- les douze scénarios C3 sont validés sur PC et iPhone ;
- aucun compte ne voit les données d’un autre compte ;
- aucune résurrection silencieuse n’est observée après une suppression ;
- les modifications de propriétés différentes sont conservées ;
- la règle « dernière opération gagnante » sur une même propriété est comprise
  et acceptée ;
- la reconstruction après effacement du stockage fonctionne ;
- le diagnostic ne contient aucune information sensible ;
- la base réelle reste inchangée ;
- les audits, tests, lint, build et tests end-to-end sont verts.

## Critères no-go

La décision est **no-go** si au moins un des événements suivants est observé :

- fuite de données entre comptes ;
- perte d’une modification portant sur une propriété différente ;
- pesée supprimée qui réapparaît sans restauration explicite ;
- impossibilité de reconstruire les données après effacement local ;
- écriture dans la base réelle ;
- secret, email ou donnée métier présent dans le diagnostic ;
- erreur de synchronisation non récupérable ;
- comportement divergent après plusieurs cycles hors ligne / en ligne.

## Décision après C3

C3 ne déclenche aucune migration. Le résultat des scénarios doit être consigné
avant de choisir entre :

- **go** : préparer un lot séparé de migration des vraies pesées avec sauvegarde,
  rollback et feature flag ;
- **go sous réserve** : corriger les anomalies non bloquantes puis rejouer C3 ;
- **no-go** : conserver le stockage local actuel et supprimer le prototype.
