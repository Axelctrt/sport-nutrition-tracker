# Catalogue fonctionnel

Statut vérifié : production 0.36.0 ; fondations UX des Phases 0 à 3E et Phase 4
intégrées dans `develop`. La Phase 4 n’est pas encore déployée en production.

| Domaine | État actuel |
| --- | --- |
| Tableau de bord | suivi quotidien, agenda, raccourcis, widgets et assistant |
| Nutrition | journal, produits, recettes, favoris, objectifs et bilans |
| Activités | endurance, autres activités, modèles, historique et calories |
| Musculation | catalogue, modèles, groupes, séances, séries, progression et historique |
| Poids et pas | saisie locale, historique, tendances et intégration au quotidien |
| Planification | séances prévues, répétition de semaine et agenda |
| Progression | objectifs, rapports, statistiques, badges, missions et thèmes |
| Photos de progression | Phase 4 intégrée dans `develop` : ajout local, vues, galerie, comparateur tactile, archive séparée et suppression ; pas encore en production |
| Sauvegarde | export, partage, import, restauration sélective et sauvegarde de sécurité |
| Corbeille | archivage, restauration et purge contrôlée |
| Comptes et espaces | invité, profil local, OTP cloud, appareils et restauration |
| Synchronisation | domaines activables, centre unifié, baselines et suppressions durables |
| Amis | identité sociale, demandes, amitiés, permissions et fil filtré |
| PWA | installation, hors ligne, mise à jour explicite et conservation des données |
| Photo nutrition | estimation manuelle et proxy IA optionnel avec consentement |

## Limites actuelles

- Les flags de synchronisation réels sont prudents et désactivés par défaut.
- Les intégrations sociales distantes dépendent des bindings et variables
  d’environnement Cloudflare.
- L’estimation photo nutritionnelle exige une configuration serveur ; elle
  n’est pas un journal automatique.
- Les photos de progression de la Phase 4 restent locales : aucune image cloud,
  sociale ou analysée par IA. Leur archive est séparée de la sauvegarde JSON
  générale.
- Les documents versionnés décrivent parfois une étape historique révolue :
  l’état courant doit être vérifié dans le code et les documents canoniques.

## Planifié ou à étudier

Voir [`../roadmap/PLANNED_FEATURES.md`](../roadmap/PLANNED_FEATURES.md). La
présence d’une idée dans ce catalogue n’autorise pas son implémentation.
