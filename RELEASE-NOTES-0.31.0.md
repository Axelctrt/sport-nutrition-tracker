# Notes de release — SportPilot 0.31.0

## Résumé

SportPilot 0.31.0 consolide la refonte mobile engagée en 0.30.0. Cette version réduit la charge mentale sur les parcours quotidiens, rend Progression plus décisionnelle, hiérarchise les méthodes d’ajout Nutrition et simplifie la lecture du compte et de la synchronisation.

La release finalise également la maintenabilité du centre de synchronisation et remet les audits de publication en cohérence avec l’architecture actuelle. Elle ne modifie aucun schéma de données, contrat cloud ou calcul nutritionnel.

## Nouveautés principales

### Navigation et saisie

- retours mobiles fondés sur l’historique réel avec repli contextuel sûr ;
- restauration du contexte Nutrition lors des retours ;
- suppression des doubles retours mobiles ;
- conservation des notes et champs texte préremplis au focus ;
- remplacement rapide maintenu pour les valeurs numériques de séries et quantités ;
- restauration effective de la position de défilement.

### Accueil, menu et Sport

- Accueil allégé par défaut sans écraser les personnalisations existantes ;
- actions rapides recentrées sur les usages fréquents ;
- menu mobile secondaire regroupé par domaines et options avancées repliables ;
- hub Sport recentré sur une action principale ;
- distinction explicite entre musculation détaillée et activité de musculation simple.

### Progression

- synthèse hebdomadaire limitée à trois signaux utiles : activité, tendance de poids et objectif prioritaire ;
- états zéro donnée et données partielles explicites ;
- distinction entre Analyses, Rapports et Bilan hebdomadaire ;
- sections Analytics compactes lorsqu’aucune donnée n’est disponible.

### Nutrition

- trois méthodes d’ajout prioritaires visibles immédiatement ;
- méthodes avancées conservées dans une section secondaire ;
- mémorisation locale de la dernière méthode utilisée par repas ;
- répétition en un geste du dernier repas équivalent lorsqu’un repas est vide ;
- maintien du jour et du repas ciblés pendant tout le parcours.

### Compte et synchronisation

- vue standard centrée sur le compte actif, l’état global, la dernière réussite et l’action principale ;
- diagnostics, file, historique et états par domaine regroupés dans un volet avancé ;
- suppression d’une double initialisation potentielle du client de synchronisation ;
- découpage du centre et de la page compte en composants et modèles testables ;
- protocoles de synchronisation, isolation local/cloud et règles sociales inchangés.

### Qualité et publication

- audits historiques compatibles avec les versions stables à partir de leur version minimale ;
- garde-fous de navigation alignés sur la sélection réellement calculée ;
- budget JavaScript historique aligné sur le budget de production actuel de 3 200 Kio ;
- audit de suppression d’ami aligné sur la boîte de confirmation accessible ;
- audit Photo IA aligné sur le consentement actuel ;
- helper Playwright d’onboarding renforcé pour WebKit.

## Versions techniques

- Application : `0.31.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 requises : aucune nouvelle migration.
- Migration Dexie : aucune.
- Tag attendu : `v0.31.0`.

## Validation

- suite Vitest complète en lots déterministes ;
- tests Playwright Chromium desktop et WebKit iPhone 15 ;
- lint et TypeScript ;
- build Vite/PWA ;
- audits de synchronisation, Nutrition, Photo IA, social, sécurité, production, dépôt et UX mobile ;
- contrôle du budget JavaScript et CSS ;
- validation manuelle sur iPhone 15 sous iOS 26.

## Hors périmètre

- refonte du moteur calorique ;
- nouvelle migration D1 ou Dexie ;
- modification des contrats sociaux `0.29.0-a*` ;
- annuaire public ;
- likes ;
- commentaires ;
- messagerie ;
- export d’activité brute ;
- nouvelle fonctionnalité sociale majeure.
