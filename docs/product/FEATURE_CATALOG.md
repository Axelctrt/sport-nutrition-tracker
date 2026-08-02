# Catalogue fonctionnel

Statut vérifié : SportPilot 0.37.0 est publié en production depuis `main` au
commit `84fea3d49e68c7d190c00d505502a5c4aa2e672a`. Le tag annoté `v0.37.0` et la
release GitHub stable identifient le même état.

| Domaine | État actuel |
| --- | --- |
| Tableau de bord | suivi quotidien, agenda, raccourcis, widgets et assistant |
| Nutrition | journal, produits, recettes, favoris, objectifs et bilans |
| Activités | endurance, autres activités, modèles, historique et calories |
| Musculation | catalogue, modèles, groupes, séances, séries, progression et historique |
| Poids et pas | saisie locale, historique, tendances et intégration au quotidien |
| Planification | séances prévues, répétition de semaine et agenda |
| Progression | objectifs, rapports, statistiques, badges, missions et thèmes |
| Photos de progression | publié en 0.37.0 : ajout local, vues, galerie, comparateur tactile, archive séparée et suppression |
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
- Les photos de progression restent locales : aucune image cloud, sociale ou
  analysée par IA. Leur archive est séparée de la sauvegarde JSON générale.
- Le statut de disponibilité de l’identifiant public reste sous les actions ;
  son rapprochement avec le champ est une amélioration UX non bloquante.
- La version 0.36.0 reste uniquement une référence historique de repli.
- Les documents versionnés et artefacts de préparation décrivent parfois une
  étape historique révolue : l’état courant doit être vérifié dans le code et
  les documents canoniques.

## Planifié ou à étudier

L’audit global en lecture seule doit évaluer `Planning hebdomadaire`,
`Objectifs` et la normalisation transverse avant toute évolution fonctionnelle.

Voir [`../roadmap/PLANNED_FEATURES.md`](../roadmap/PLANNED_FEATURES.md). La
présence d’une idée dans ce catalogue n’autorise pas son implémentation.
