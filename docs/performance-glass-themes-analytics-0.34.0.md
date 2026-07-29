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

## Implementation livree

### Tokens et primitives

- `src/styles/index.css` porte les tokens communs de surface, texte, bordure,
  accent, graphique, focus, profondeur et mouvement.
- `src/styles/unlockableThemes.css` ne contient plus que les cinq identites
  Performance Glass, chacune en clair et sombre.
- `SportPilotMotionCard`, `SportPilotActiveBorder`,
  `SportPilotAnimatedNumber`, `SportPilotProgressTransition` et
  `SportPilotSuccessEffect` couvrent les transitions de contenu.
- `SportPilotStatefulButton` couvre `idle`, `pressed`, `loading`, `success`,
  `error` et `disabled` avec une largeur stable.
- `SportPilotMultiStepLoader` n'affiche que des etapes connues ou des libelles
  honnetes, sans pourcentage artificiel.
- `SportPilotAnimatedTabs` conserve le focus, les fleches, Home et End.
- `SportPilotUnlockReveal` reserve les effets les plus visibles aux themes
  rares, epiques et legendaires.

Les effets souris sont places sous `hover: hover` et `pointer: fine`. Les
appareils tactiles disposent d'etats actifs ou selectionnes. Tous les mouvements
non indispensables sont neutralises par `prefers-reduced-motion`.

Le theme de demarrage est lu par `public/theme-boot.js`, charge comme script
externe pour respecter la CSP `script-src 'self'`. Apres hydratation de Dexie,
le runtime reapplique la preference partageable; une valeur inconnue retombe
sur Core. Le provider React ne remplace pas un theme deja pose par le bootstrap.

### Catalogue final

| Theme | Rarete | Mouvement | Identite |
| --- | --- | --- | --- |
| Core | standard | balanced | bleu/cyan net et officiel |
| Neon Pulse | rare | energetic | cyan/violet, impulsions courtes |
| Emerald Focus | rare | focused | vert/menthe, fondus calmes |
| Aurora | epic | smooth-premium | cyan/violet/rose froid, verre controle |
| Zenith Gold | legendary | prestige | or/ivoire, mouvement rare |

Chaque definition fournit deux palettes completes, les styles de fond, surface,
bouton et graphique, le profil de mouvement et l'effet de recompense.
L'apparence `system | light | dark` reste independante du theme. Les anciennes
valeurs inconnues sont normalisees vers `core`.

### Conditions de deblocage

- Core: disponible immediatement.
- Neon Pulse: 20 activites terminees et 3 semaines avec au moins 3 activites.
- Emerald Focus, fenetre glissante de 30 jours: 12 journees avec check-in et
  check-out, et 10 journees nutritionnelles renseignees.
- Aurora: 4 semaines equilibrees. Une semaine equilibree comporte au moins
  3 jours de suivi, 3 jours de nutrition et soit 2 activites, soit 1 activite
  avec 1 repos confirme.
- Zenith Gold: sur les 12 dernieres semaines, 8 semaines equilibrees, plus
  50 activites terminees et 40 journees completes.

Un theme acquis reste acquis. Une suppression peut diminuer une progression
avant deblocage, mais ne reverrouille jamais un theme. `unlockedAt` et
`revealSeenAt` sont sauvegardes et synchronises avec les preferences de
recompenses.

### Reveal et essai

Le reveal automatique n'est autorise que sur l'accueil ou Recompenses, sans
dialogue, formulaire actif ni saisie focalisee. Sinon, un toast propose
explicitement de l'ouvrir. L'apparition est unique et marque `revealSeenAt`.

`Essayer maintenant` applique une preference locale temporaire. La barre
d'essai permet ensuite de confirmer ou d'annuler. Aucune preference de theme
n'est synchronisee avant confirmation; un rechargement annule proprement
l'essai. `Conserver mon theme actuel` ferme le reveal sans modifier le theme.

### Architecture des analyses

`performanceAnalyticsService` lit les tables existantes et construit des
series pures pour:

- calories et cibles quotidiennes variables;
- macros et repartition calorique des repas;
- regularite, check-in/check-out et heatmap;
- activites planifiees, terminees et reliees au planning;
- endurance par discipline et unite;
- force estimee avec la formule Epley centralisee;
- volume, meilleure serie et records;
- series de travail par groupe musculaire;
- progression vers les themes.

Les composants React ne recalculent que le filtrage de presentation d'une
periode deja agregee. Ils n'ecrivent jamais dans les tables metier.

### Representations retenues

- Poids: points reels, moyenne mobile 7 jours et objectif sur une meme unite.
- Calories: barres quotidiennes et ligne de cible quotidienne.
- Macros: trois barres horizontales en grammes.
- Repas: donut, car les repas forment un total calorique.
- Volume sportif: barres empilees par sport, duree ou nombre de seances.
- Endurance: une discipline et une unite selectionnees a la fois.
- Musculation: vues separees 1RM estime, volume et meilleure serie.
- Groupes musculaires: heatmap de series de travail terminees.
- Prevu/realise: barres groupees, avec distinction des plans relies.
- Regularite: barres hebdomadaires et heatmap calendaire.
- Themes: barres de progression, jamais une collection d'anneaux.

Chaque graphique principal utilise `ResponsiveContainer`,
`accessibilityLayer`, une zone tactile de hauteur stable, un tooltip et une
alternative textuelle ou tabulaire. Les animations sont desactivees en
reduction de mouvement et lorsque l'onglet devient masque.

### Progression et Analyses

- Progression conserve son role de centre de decision: periodes 7 jours,
  30 jours et 3 mois, signal principal deterministe, trois ou quatre cartes
  utiles, six domaines compacts, semaine prevue/realisee, bilan et objectif.
- Analyses conserve les filtres dans l'URL et separe Vue d'ensemble, Corps,
  Nutrition, Activite, Musculation et Regularite.
- Le poids propose 30 jours, 3 mois, 6 mois, 1 an et Tout.
- Les etats vides ne tracent aucune valeur artificielle et proposent une action
  vers la source de donnees correspondante.

## Ajouter un graphique ulterieurement

1. Formuler la question metier et l'unite avant de choisir la representation.
2. Ajouter l'agregation pure dans un service ou selecteur, avec cas vide, nul,
   valeur extreme et ordre chronologique.
3. Choisir une primitive Recharts adaptee sans melanger les unites.
4. Utiliser les tokens `--sp-chart-*`, jamais une palette locale fixe.
5. Ajouter tooltip tactile, valeur principale et interpretation factuelle.
6. Fournir un tableau ou resume textuel et un etat vide actionnable.
7. Tester clavier, tactile, mouvement reduit, changement de periode et 320 px.
8. Comparer le poids gzip de la route et du bundle principal.

## Validation de reference

- Vitest: 522 fichiers et 2 060 tests, en ordre normal puis melange.
- Playwright: 114 scenarios applicables valides sur desktop, WebKit iPhone 15,
  320, 360 et 412 px; 12 exclusions intentionnelles liees aux projets.
- PWA: mise a jour de deux builds sous la meme origine sans perte IndexedDB.
- Production: 144 chunks JavaScript, 3 327 Kio, 147 Kio de CSS, plus gros
  chunk a 404 Kio et 147 entrees de precache.
- Captures: Progression, Analyses, Recompenses, collection verrouillee et
  debloquee, reveals, loader, graphiques, heatmap, clair, sombre, mouvement
  reduit, 320 px et iPhone 15 avec donnees controlees hors production.
