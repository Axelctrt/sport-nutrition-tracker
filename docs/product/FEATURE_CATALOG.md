# Catalogue fonctionnel

## Sources de vérité

- production fonctionnelle 0.37.0 :
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a` ;
- tag annoté `v0.37.0` et release GitHub stable ;
- intégration constatée avant la Phase 0 V1 :
  `develop@eec97bf9ac776b519d051329551836853894fd82` ;
- intégration finale validée après le Lot 8 et #63 :
  `develop@3eff34a73cc40d98d3de2ab947ac8b45bfae5f01` ;
- candidate en préparation : `1.0.0-rc.1` via #139.

Toujours revérifier les HEAD et le SHA réellement déployé avant de citer cet
état.

Le tableau publié ci-dessous reste volontairement celui de `0.37.0`. Le delta
intégré de la candidate est synthétisé dans
[`../../RELEASE-NOTES-1.0.0-rc.1.md`](../../RELEASE-NOTES-1.0.0-rc.1.md).

## Périmètre fonctionnel publié

| Domaine | État publié en 0.37.0 |
| --- | --- |
| Tableau de bord | suivi quotidien, agenda, raccourcis, widgets et assistant |
| Nutrition | journal, produits, recettes, favoris, objectifs et bilans |
| Activités | endurance, autres activités, modèles, historique et calories |
| Musculation | catalogue, modèles, groupes, séances, séries, progression et historique |
| Poids et pas | saisie locale, historique, tendances et intégration au quotidien |
| Planification | séances prévues, répétition de semaine et agenda |
| Progression | objectifs, rapports, statistiques, badges, missions et thèmes |
| Photos de progression | ajout local, vues, galerie, comparateur tactile, archive séparée et suppression |
| Sauvegarde | export, partage, import, restauration sélective et sauvegarde de sécurité |
| Corbeille | archivage, restauration et purge contrôlée |
| Comptes et espaces | invité, profil local, OTP cloud, appareils et restauration |
| Synchronisation | domaines activables, centre unifié, baselines et suppressions durables |
| Amis | identité sociale, demandes, amitiés, permissions et fil filtré |
| PWA | installation, hors ligne, mise à jour explicite et conservation des données |
| Photo nutrition | estimation manuelle et proxy IA optionnel avec consentement |

## Évolutions intégrées à `develop`, non publiées

### Profil, compte et social

La PR #24 ajoute lecture seule prioritaire, édition dédiée, protection des
modifications, statut de l’identifiant public sous son champ et feedback
temporaire. L’isolation des espaces et le comportement cloud atomique restent
inchangés.

### Planning, Objectifs et liaison vers l’action

- PR #45 : Planning sportif centré sur la semaine et création dédiée ;
- PR #47 : Objectifs protégés, métrique immuable et anti-double comptage ;
- PR #49 : actions contextuelles déterministes sans création automatique.

### Menus d’actions

Les PR #51, #53, #54, #56, #57 et #59 ajoutent une primitive adaptative puis
migrent les usages Sport, Nutrition, assistant quotidien et Progression.

### OTP

La PR #62 fournit une saisie native partagée à huit cellules avec collage,
autofill, correction et vérification automatique. Le protocole Dexie Cloud et
les données restent inchangés.

## Limites actuelles

- Les flags de synchronisation réels sont prudents et désactivés par défaut.
- Les intégrations sociales distantes dépendent des bindings et variables
  d’environnement Cloudflare.
- L’estimation photo nutritionnelle exige une configuration serveur ; elle
  n’est pas un journal automatique.
- Les photos de progression restent locales : aucune image cloud, sociale ou
  analysée par IA. Leur archive est séparée de la sauvegarde JSON générale.
- La version 0.36.0 reste uniquement une référence historique de repli.
- Les documents versionnés et artefacts de préparation peuvent décrire une
  étape historique révolue.

## Orientation actuelle

Le prochain programme est la cohérence globale puis la readiness V1, pas
l’ajout de nouvelles fonctions.

L’issue #63 doit d’abord auditer en lecture seule :

- l’UX et les comportements ;
- les primitives et exceptions locales ;
- l’accessibilité et le responsive ;
- le hors ligne, la continuité et l’isolation des données.

Les lots de correction seront décidés uniquement après validation du rapport.
La séquence complète figure dans
[`../roadmap/V1_READINESS_PLAN.md`](../roadmap/V1_READINESS_PLAN.md).

Les nouvelles fonctions, le renvoi OTP, la synchronisation étendue, les
nouvelles métriques et les optimisations avancées sont post-V1 sauf nouvelle
décision explicite.
