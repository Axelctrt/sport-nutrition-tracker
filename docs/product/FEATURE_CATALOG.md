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

## Intégré à `develop`, non publié

La PR #24 est fusionnée dans `develop` au commit
`f66efc2798117e861c7b59b66b50ab1cd88ba6bc`. Elle n’est pas encore présente
dans `main` ni en production.

Elle ajoute :

- un profil général consultable en lecture seule avant modification ;
- une surface d’édition dédiée avec confirmation d’abandon ;
- une carte `Profil social` initialement en lecture seule ;
- une action explicite `Modifier` pour le profil social ;
- le statut de disponibilité de l’identifiant public directement sous le
  champ ;
- un feedback de succès temporaire unique ;
- la conservation de l’isolation locale et du comportement cloud atomique des
  espaces compte.

## Limites actuelles

- Les flags de synchronisation réels sont prudents et désactivés par défaut.
- Les intégrations sociales distantes dépendent des bindings et variables
  d’environnement Cloudflare.
- L’estimation photo nutritionnelle exige une configuration serveur ; elle
  n’est pas un journal automatique.
- Les photos de progression restent locales : aucune image cloud, sociale ou
  analysée par IA. Leur archive est séparée de la sauvegarde JSON générale.
- Dans la production 0.37.0, le statut de disponibilité de l’identifiant public
  reste dans son ancien emplacement. La PR #24 corrige ce point dans `develop`,
  sans publication en production à ce stade.
- La version 0.36.0 reste uniquement une référence historique de repli.
- Les documents versionnés et artefacts de préparation décrivent parfois une
  étape historique révolue : l’état courant doit être vérifié dans le code et
  les documents canoniques.

## Planifié ou à étudier

Le prochain cadrage doit arbitrer entre `Planning hebdomadaire`, `Objectifs` ou
un audit transverse préalable de leur articulation et de la normalisation
globale de SportPilot.

Voir [`../roadmap/PLANNED_FEATURES.md`](../roadmap/PLANNED_FEATURES.md). La
présence d’une idée dans ce catalogue n’autorise pas son implémentation.
