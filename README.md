# SportPilot 0.31.0

SportPilot 0.31.0 consolide la refonte mobile de la version 0.30.0. La release réduit la charge mentale sur les parcours fréquents, hiérarchise les fonctions avancées et fiabilise les audits de publication sans modifier les données existantes.

L’application reste mobile-first, locale-first, compatible compte/cloud, hors ligne et installable en PWA.

## Principales évolutions

### Navigation et saisie

- retours mobiles fondés sur l’historique réel avec repli contextuel ;
- contexte Nutrition et position de défilement restaurés ;
- doubles retours supprimés sur mobile ;
- notes et textes préremplis conservés au focus ;
- remplacement rapide maintenu pour les valeurs numériques.

### Accueil, menu et Sport

- Accueil allégé par défaut sans écraser les personnalisations ;
- menu mobile secondaire regroupé et repliable ;
- hub Sport recentré sur une action principale ;
- distinction entre activité de musculation simple et séance détaillée.

### Progression et Nutrition

- synthèse Progression limitée à l’activité, la tendance de poids et l’objectif prioritaire ;
- états sans données plus explicites ;
- trois méthodes d’ajout Nutrition prioritaires ;
- méthodes avancées conservées ;
- dernière méthode mémorisée par repas ;
- répétition rapide du dernier repas équivalent.

### Compte et synchronisation

- vue standard centrée sur le compte, l’état global et la dernière réussite ;
- diagnostics, file, historique et domaines placés dans un volet avancé ;
- centre de synchronisation et page compte découpés en modules testables ;
- protocoles, conflits et isolation local/cloud inchangés.

### Qualité

- audits historiques compatibles avec les versions stables actuelles ;
- garde-fous de navigation alignés sur l’architecture réelle ;
- budget JavaScript consolidé à 3 200 Kio ;
- audits social et Photo IA alignés sur les confirmations et consentements actuels ;
- préparation Playwright WebKit renforcée.

## Stockage et versions techniques

- Application : `0.31.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 ajoutées par 0.31.0 : aucune.
- Migrations Dexie ajoutées par 0.31.0 : aucune.

## Contrôles de publication

```text
npm run lint
npx tsc -b --pretty false
npm run build
npm run test:e2e:acceptance
npm run audit:release-consolidation
npm run check
npm audit
```

La recette réelle sur iPhone 15 sous iOS 26 doit valider Accueil, Nutrition, Sport, Progression, compte, synchronisation, hors ligne, PWA et accessibilité.

Tag attendu : `v0.31.0`.
