# SportPilot 0.17.0

## Présentation

SportPilot 0.17.0 consolide la fiabilité des données locales, enrichit le suivi
sportif et nutritionnel, développe les récompenses et introduit la première
synchronisation cloud sécurisée de l’application.

La synchronisation Dexie Cloud reste volontairement limitée aux pesées. Elle
est désactivée par défaut sur chaque appareil et nécessite une activation
explicite liée au compte connecté.

## Principales nouveautés

### Conservation et maîtrise des données

- migrations Dexie progressives jusqu’au schéma v8 ;
- format de sauvegarde JSON v7 ;
- conservation des données pendant les mises à jour PWA ;
- journal des migrations et contrôles d’intégrité ;
- sauvegardes de sécurité avant les opérations sensibles ;
- restauration sélective des catégories de données ;
- réinitialisation sélective des données de test ;
- corbeille étendue avec restauration et annulation immédiate.

### Synchronisation sécurisée des pesées

- connexion Dexie Cloud sans mot de passe par email et code à usage unique ;
- activation volontaire et distincte sur chaque appareil ;
- activation liée au compte Dexie Cloud autorisé ;
- blocage automatique de la synchronisation après un changement de compte ;
- reprise explicite nécessaire avant tout nouvel envoi ;
- synchronisation automatique bornée au démarrage, au retour en ligne et après
  les créations, modifications ou suppressions de pesées ;
- commande manuelle de synchronisation et état détaillé ;
- reprise après une période hors connexion ;
- marqueurs de suppression et résolution déterministe des conflits ;
- protection contre l’envoi automatique des données locales du compte A vers
  un compte B nouvellement connecté ;
- écran de gestion du compte accessible depuis les paramètres ;
- outils de diagnostic et données fictives masqués dans la version publique.

### Planification et suivi sportif

- planification unifiée des séances de musculation et d’endurance ;
- répétition d’une semaine d’entraînement ;
- agenda d’entraînement sur le tableau de bord ;
- suivi enrichi de la progression et des objectifs ;
- rapports de progression partageables et imprimables ;
- statistiques, tendances et recommandations hebdomadaires.

### Récompenses et personnalisation

- centre de récompenses ;
- missions hebdomadaires et historique des validations ;
- séries de régularité ;
- notifications de déblocage ;
- thèmes visuels obtenus grâce aux accomplissements ;
- widgets de récompenses et personnalisation du tableau de bord.

### Recherche et gestion quotidienne

- recherche globale ;
- centre de gestion des données ;
- exports CSV avancés ;
- rappels de sauvegarde ;
- rappels de routines ;
- amélioration des parcours mobiles et de la navigation PWA.

## Versions de données

- schéma Dexie principal : v8 ;
- format de sauvegarde JSON : v7.

Les migrations s’exécutent automatiquement. Une sauvegarde JSON récente reste
recommandée avant l’installation de la mise à jour officielle.

## Configuration de production

L’environnement de build Cloudflare fournit les variables Vite publiques suivantes :

```text
VITE_ENABLE_SYNC_PROTOTYPE=true
VITE_DEXIE_CLOUD_DATABASE_URL=https://zhnyk8met.dexie.cloud
VITE_ENABLE_REAL_WEIGHT_SYNC=true
VITE_ENABLE_SYNC_DIAGNOSTICS=false
```

L’origine officielle autorisée dans Dexie Cloud doit être :

```text
https://sport-nutrition-tracker.axel-cottrant.workers.dev
```

Les fichiers `dexie-cloud.json`, `dexie-cloud.key` et `.env.local` restent
strictement locaux et ne sont jamais inclus dans le dépôt ni dans le build.

## Limites connues

- seules les pesées sont synchronisées dans cette version ;
- les autres données restent exclusivement dans la base locale de l’appareil ;
- les données locales ne sont pas séparées par compte dans un même profil de
  navigateur ;
- après un changement de compte, les anciennes pesées locales restent visibles
  mais la synchronisation est bloquée jusqu’à une autorisation explicite ;
- l’activation sur un compte différent ne doit être effectuée que dans un
  contexte local correspondant à ce compte ;
- la suppression d’un compte Dexie Cloud et la synchronisation générale de
  toutes les catégories de données restent hors périmètre de cette version.

## Validation effectuée

- audits de sécurité et de dépôt ;
- lint et build PWA ;
- 264 fichiers de tests et 809 tests Vitest ;
- tests de stabilité ;
- validation manuelle sur ordinateur ;
- validation manuelle sur iPhone 15 sous iOS 26 ;
- création, modification et suppression bidirectionnelles ;
- fonctionnement hors connexion puis reprise ;
- changement compte A vers compte B sans fuite automatique de pesées ;
- conservation des données locales pendant les mises à jour.

## Vérification de release

```powershell
npm run release:verify
```
