# SportPilot 0.34.0

SportPilot 0.34.0 introduit la direction visuelle **Performance Glass**, cinq
thèmes distinctifs et une exploration plus professionnelle des données de
progression.

L’application reste mobile-first, locale-first, hors ligne et installable en
PWA. Aucun graphique ni déblocage ne repose sur des données de démonstration.

## Principales évolutions

### Design et mouvement

- tokens centralisés pour les surfaces, accents, graphiques et animations ;
- boutons stateful, onglets tactiles et loader multi-étapes accessible ;
- effets courts liés aux actions, avec réduction de mouvement obligatoire ;
- interactions souris facultatives et états tactiles explicites.

### Thèmes et récompenses

- Core, Neon Pulse, Emerald Focus, Aurora et Zenith Gold ;
- variantes claire et sombre indépendantes du thème choisi ;
- fallback sûr vers Core pour tout ancien identifiant ;
- déblocages fondés sur les activités, journées complètes, nutrition, semaines
  régulières et repos confirmé ;
- collection visuelle, previews, reveal unique et essai avant confirmation.

### Progression et Analyses

- hub Progression centré sur un signal principal factuel et le prévu/réalisé ;
- périodes 7 jours, 30 jours et 3 mois ;
- domaines Corps, Nutrition, Activité, Musculation et Régularité ;
- poids et moyenne mobile, calories/cible, macros, repas, endurance, 1RM estimé,
  volume, meilleure série, groupes musculaires, récupération et heatmap ;
- états vides actionnables et alternatives textuelles ou tabulaires.

## Stockage et versions techniques

- Application : `0.34.0`.
- AppDatabase locale : Dexie v11.
- Sauvegarde JSON : v10.
- Runtime Dexie Cloud prototype : v16.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 ajoutées par 0.34.0 : aucune.
- Migrations Dexie ajoutées par 0.34.0 : aucune.

## Contrôles de publication

```text
npm run lint
npx tsc -b --pretty false
npm run test
npm run build
npm run test:e2e
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

La recette mobile couvre 320, 360, 393 et 412 px, plus WebKit iPhone 15, en
clair, sombre et réduction de mouvement.

Tag attendu : `v0.34.0`.
