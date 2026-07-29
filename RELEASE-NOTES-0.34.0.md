# SportPilot 0.34.0

## Performance Glass

- Introduit une direction visuelle premium, sobre et mobile-first.
- Centralise les surfaces, bordures, accents, graphiques et tokens de mouvement.
- Ajoute des boutons stateful, des onglets animés, un loader multi-étapes
  honnête et des effets de réussite compatibles avec la réduction de mouvement.
- Renforce les retours tactiles sur les boutons, cartes et actions principales.
- Ajoute un indicateur réellement glissant dans la navigation mobile, avec une
  durée stable entre les quatre rubriques.

## Thèmes et récompenses

- Remplace les anciens thèmes par Core, Neon Pulse, Emerald Focus, Aurora et
  Zenith Gold, chacun en apparence claire et sombre.
- Conserve Core comme fallback pour tout ancien identifiant inconnu.
- Calcule les déblocages sur les activités, semaines régulières, journées
  complètes, nutrition et repos confirmé réellement enregistrés.
- Recompose la collection Récompenses avec aperçus, raretés, progression,
  reveal unique et mode d’essai sans synchronisation avant confirmation.
- Supprime le toast vert intermédiaire lors du déblocage d’un badge et affiche
  directement une célébration renforcée avec halo, particules et pulsation.

## Accomplissement quotidien

- Ajoute une carte premium « Journée complétée » à la place du simple toast.
- Déclenche cette célébration uniquement lorsque le check-in, une activité
  sportive réellement effectuée, le suivi alimentaire complet et le premier
  check-out de la date sont tous présents.
- Ne traite pas une journée de repos comme une journée sportive complète.
- Mémorise l’affichage par date afin d’éviter toute répétition ou célébration
  rétroactive intempestive.

## Progression et Analyses

- Recentre Progression sur un signal principal déterministe, les domaines
  utiles et le prévu/réalisé de la semaine.
- Ajoute les périodes 7 jours, 30 jours et 3 mois au résumé.
- Transforme Analyses en espace détaillé par domaine : corps, nutrition,
  activité, musculation et régularité.
- Ajoute calories/cible quotidiennes, macros, repas, endurance, force estimée,
  volume, meilleure série, groupes musculaires, récupération, heatmap et
  progression vers les thèmes.
- Adapte les cartes et graphiques à la densité réelle : état vide sans donnée,
  repère compact pour une mesure, mini-tendance pour deux ou trois mesures,
  puis graphique complet.
- Clarifie la cible nutrition comme cible journalière moyenne et les valeurs de
  force comme 1RM estimé avec évolution stable ou chiffrée.
- Supprime le CTA de pesée redondant lorsque l’état poids est vide.
- Fournit des alternatives textuelles ou tabulaires aux graphiques.

## Données et compatibilité

- Le chantier de finition 0.34.0 n’ajoute aucun schéma Dexie, format de
  sauvegarde ou contrat de synchronisation.
- Aucune donnée locale n’est supprimée ou réinitialisée.
- Les données métier restent la seule source des graphiques et déblocages.
- Le thème initial est appliqué par un script externe compatible avec la CSP,
  puis réconcilié avec Dexie au démarrage sans flash vers Core.
- Les contrats sociaux existants restent inchangés : aucun annuaire public,
  likes, commentaires, messagerie ou export d’activité brute n’est ajouté.

## Validation finale

Le commit fonctionnel final `d12b997f0c623b7b82035bb525f66d4129b48d4c`
a passé les quatre jobs GitHub Actions :

- lint, TypeScript, tests, build PWA, audits et budget JavaScript ;
- stabilité de la suite avec ordre des tests mélangé ;
- Playwright sur Chromium desktop et WebKit iPhone 15 ;
- mise à jour réelle du service worker avec conservation des données.

Le code validé a ensuite été fusionné dans `develop` au commit
`4abf66fa594cc6594b4ece4a25dd822bfe21494e`.

## Publication

- Branche de publication : `release/0.34.0`.
- Cible : `main`.
- Tag prévu : `v0.34.0`, uniquement après validation de la PR de publication.
- Les déploiements Cloudflare automatiques associés à la PR de finition ont
  échoué hors du pipeline applicatif ; leur journal détaillé reste à contrôler
  dans le tableau de bord Cloudflare avant la mise en production.
