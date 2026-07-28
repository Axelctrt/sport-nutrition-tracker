# SportPilot 0.34.0 - Audit Performance Glass, themes et analyses

## Point de depart

- Commit valide: `a82fd0834e53ae8ef85a2d4e7e5787c929e5d690`
- Version: `0.33.2`
- Branche de travail: `feat/design-themes-analytics-0.34.0`
- Etat initial: arbre propre, branche source synchronisee avec `origin`
- Regle de livraison: aucun deploiement et aucune fusion sans accord explicite

## Audit de l'existant

### Design system

- Les primitives principales sont dans `src/shared/ui`.
- Les couleurs et les surfaces sont encore largement exprimees par des classes
  Tailwind `slate`, `brand` et des variantes `dark`.
- `src/styles/index.css` contient les dimensions tactiles et quelques tokens de
  surfaces, mais pas de systeme de mouvement complet.
- `src/styles/unlockableThemes.css` contient environ 34 Ko de styles pour quinze
  themes. Les regles agissent a la fois sur le fond, les surfaces et de nombreux
  selecteurs descendants, ce qui rend les evolutions difficiles a isoler.

### Themes et preferences

- Le reglage d'apparence `system | light | dark` est gere par `ThemeProvider`.
- Le theme de recompense est une preference distincte, ce qui est une bonne
  base a conserver.
- Le stockage local prioritaire repose sur les tables Dexie
  `unlockedVisualThemes` et `visualThemePreferences`, avec un fallback
  `localStorage` pendant l'hydratation.
- Les preferences et deblocages sont inclus dans la sauvegarde, la restauration
  et la synchronisation du domaine `rewards-routines`.
- Le catalogue courant contient quinze identifiants. Les anciens identifiants
  seront normalises vers `core`; seules les tables liees aux themes pourront
  etre reinitialisees. Les autres donnees utilisateur ne seront pas modifiees.

### Recompenses

- `themeAchievementService` calcule actuellement les deblocages avec une seule
  metrique par theme.
- `RewardThemesPanel` calcule encore une partie de la presentation et de la
  progression.
- `RewardUnlockObserver` sait deja observer les tables Dexie et differer la
  presentation via un composant d'application.
- Le modele persiste `unlockedAt`, mais pas encore `revealSeenAt`.

### Progression et analyses

- `ProgressionHubPage` joue deja le role de synthese et de decision.
- `AnalyticsPage` contient directement une grande partie des adaptations de
  donnees et des graphiques. Les couleurs, tooltips et legendes sont disperses.
- Les services `analyticsService`, `progressInsightsService`,
  `progressionHubSummaryService` et `strengthAnalyticsService` fournissent une
  base metier testable.
- Les etats vides existent, mais les alternatives textuelles et tabulaires ne
  sont pas systematiques.

### Donnees disponibles pour les nouvelles regles

- Activites d'endurance terminees: table `activities`.
- Musculation terminee: `workoutSessions.status === 'completed'`.
- Check-in et check-out: tables `dailyCheckIns` et `dailyCheckOuts`.
- Journal nutritionnel renseigne: `foodEntries`, avec le statut journalier
  disponible en complement.
- Repos explicite: `dailyActivityDecisions.decision === 'rest'` avec
  `confirmedAt`. Ce modele permet de compter un repos confirme sans deduire un
  repos d'une simple absence de donnees.

## References et choix techniques

References examinees:

- Aceternity UI: catalogue, Glowing Effect, Stateful Button, Animated Tabs,
  Multi Step Loader, Moving Border et Sparkles.
- shadcn/ui Charts: composition, configuration de couleurs, tooltips, legendes
  et couche d'accessibilite.
- Recharts: API 3.8, `ResponsiveContainer`, dimensionnement, animation et
  `accessibilityLayer`.

Decision:

- Conserver Recharts `3.8.1`, deja present et compatible avec React 19.
- Creer des primitives SportPilot composees au-dessus de Recharts, sans enfermer
  les graphiques dans une abstraction qui masquerait l'API native.
- S'inspirer des intentions d'interaction d'Aceternity sans copier ses sources.
  Cela evite une dependance Motion supplementaire et garde la maitrise de la
  licence, du bundle et de l'accessibilite.
- Utiliser les animations CSS pour les interactions courtes. Les particules de
  deblocage seront bornees, non interactives et absentes en mouvement reduit.
- Ne pas ajouter ECharts, Nivo, Motion ou une bibliotheque de particules.

## Architecture cible

### Performance Glass

- Tokens visuels: surfaces, bordures, textes, accents, graphiques et profondeur.
- Tokens de mouvement: durees, courbes, echelle d'appui et intensite.
- Primitives: carte, bordure active, bouton stateful, onglets animes, nombre
  anime, progression, loader multi-etapes, effet de succes et reveal.
- Tous les composants gardent des dimensions stables et des cibles tactiles
  d'au moins 44 px.

### Moteur de themes

Les cinq identites sont:

1. `core` - standard, toujours disponible.
2. `neon-pulse` - rare.
3. `emerald-focus` - rare.
4. `aurora` - epique.
5. `zenith-gold` - legendaire.

Chaque definition fournit les palettes claire et sombre, le fond, les surfaces,
les boutons, les graphiques, le profil de mouvement et l'effet de recompense.
L'apparence reste controlee independamment par `ThemeProvider`.

### Moteur de deblocage

Le moteur est un service pur et testable. Il produit pour chaque theme:

- l'etat verrouille ou debloque;
- les criteres, valeurs courantes et objectifs;
- une progression globale;
- `unlockedAt` et `revealSeenAt` lorsqu'ils existent.

Les deblocages restent acquis. Une suppression de donnee peut reduire la
progression avant deblocage, mais ne reverrouille jamais un theme acquis.

### Graphiques

- `SportPilotChartCard`: question, valeur principale, graphique, legende et
  alternative textuelle ou tabulaire.
- `SportPilotChartTooltip`: tactile, clavier et contraste.
- Primitives de tendance, barres cible/reel, progression, volume d'activite,
  force, heatmap, radial et etat vide.
- Couleurs fournies par les tokens du theme, jamais par des constantes locales.
- Animations desactivees en mouvement reduit et hors de la zone visible.

### Information architecture

- Progression: `7 jours | 30 jours | 3 mois`, insights courts, signal principal
  deterministe, domaines, prevu/reel et actions.
- Analyses: `Vue d'ensemble | Corps | Nutrition | Activite | Musculation |
  Regularite`, avec navigation tactile horizontale et exploration detaillee.

## Risques controles

- Migration: une migration Dexie ciblee peut reinitialiser uniquement les
  anciens deblocages et la preference de theme. Aucun autre store ne sera vide.
- Synchronisation: les anciens identifiants cloud doivent etre filtres avant la
  validation de l'agregat, puis `core` devient le fallback.
- Performance: un seul systeme de graphiques, animations courtes, effets rares,
  rendu conditionnel et arret hors ecran.
- Accessibilite: focus visible, etats non portes par la couleur, tableaux ou
  resumes textuels, `accessibilityLayer`, mouvement reduit.
- Donnees: aucun jeu de donnees de demonstration ne sera ecrit dans la base
  utilisateur; les captures utiliseront uniquement des fixtures de test.

## Validation

- Tests unitaires des themes, migrations, deblocages, reveals, selecteurs et
  primitives.
- Suite Vitest complete, lint, build et audits existants.
- Playwright aux largeurs 320, 360, 393 et 412 px, plus iPhone 15.
- Captures controlees en Core et Aurora, clair et sombre.
- Comparaison du poids du build avec la 0.33.2.

## Ajouter un theme ulterieurement

1. Ajouter l'identifiant et la definition complete au catalogue.
2. Ajouter ses tokens clair/sombre et son profil de mouvement.
3. Ajouter une regle pure de deblocage et ses tests de limites.
4. Ajouter le contenu de preview et de reveal.
5. Verifier sauvegarde, restauration, synchronisation et fallback.
6. Valider contraste, mouvement reduit, mobile et graphiques.
