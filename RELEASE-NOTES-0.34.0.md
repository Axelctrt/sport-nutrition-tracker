# SportPilot 0.34.0

## Performance Glass

- Introduit une direction visuelle premium, sobre et mobile-first.
- Centralise les surfaces, bordures, accents, graphiques et tokens de mouvement.
- Ajoute des boutons stateful, des onglets animés, un loader multi-étapes
  honnête et des effets de réussite compatibles avec la réduction de mouvement.

## Thèmes et récompenses

- Remplace les anciens thèmes par Core, Neon Pulse, Emerald Focus, Aurora et
  Zenith Gold, chacun en apparence claire et sombre.
- Conserve Core comme fallback pour tout ancien identifiant inconnu.
- Calcule les déblocages sur les activités, semaines régulières, journées
  complètes, nutrition et repos confirmé réellement enregistrés.
- Recompose la collection Récompenses avec aperçus, raretés, progression,
  reveal unique et mode d’essai sans synchronisation avant confirmation.

## Progression et Analyses

- Recentre Progression sur un signal principal déterministe, les domaines
  utiles et le prévu/réalisé de la semaine.
- Ajoute les périodes 7 jours, 30 jours et 3 mois au résumé.
- Transforme Analyses en espace détaillé par domaine : corps, nutrition,
  activité, musculation et régularité.
- Ajoute calories/cible quotidiennes, macros, repas, endurance, force estimée,
  volume, meilleure série, groupes musculaires, récupération, heatmap et
  progression vers les thèmes.
- Fournit des états vides actionnables et des alternatives textuelles ou
  tabulaires aux graphiques.

## Données et compatibilité

- Aucun schéma Dexie, format de sauvegarde ou contrat de synchronisation n’est
  modifié.
- Aucune donnée locale n’est supprimée ou réinitialisée.
- Les données métier restent la seule source des graphiques et déblocages.
- Le thème initial est appliqué par un script externe compatible avec la CSP,
  puis réconcilié avec Dexie au démarrage sans flash vers Core.
- Les contrats sociaux existants restent inchangés : aucun annuaire public,
  likes, commentaires, messagerie ou export d’activité brute n’est ajouté.

## Validation

- `npm run check` : 522 fichiers et 2 060 tests Vitest réussis, TypeScript,
  build PWA et tous les audits réussis.
- `npm run test:stability` : 2 060 tests réussis dans un ordre mélangé.
- Playwright : 114 scénarios applicables réussis sur Chromium desktop,
  WebKit iPhone 15, 320, 360, 412 px et paysage ; 12 exclusions prévues par
  projet.
- Mise à jour PWA : remplacement du service worker sous la même origine validé
  sans perte de données.
- Build : 144 chunks JavaScript, 3 327 Kio au total, 147 Kio de CSS, plus gros
  chunk à 404 Kio et 147 entrées précachées.
- Les captures de référence utilisent uniquement des données E2E contrôlées et
  restent hors du dépôt.

Branche : `feat/design-themes-analytics-0.34.0`.
Déploiement : aucun déploiement inclus sans autorisation explicite.
