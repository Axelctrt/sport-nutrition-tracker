# Design system Performance Glass

Statut : **actuel**. Sources principales :
`src/styles/index.css`, `src/styles/unlockableThemes.css`,
`src/shared/ui`, `src/shared/charts` et `src/shared/toast`.

## Fondations

- Interface mobile-first, claire ou sombre.
- Thème de base `core` et thèmes déverrouillables `neon-pulse`,
  `emerald-focus`, `aurora` et `zenith-gold`.
- Surfaces légèrement translucides, bordures lisibles et flou mesuré :
  l’effet verre ne doit jamais réduire le contraste ou la performance.
- Tailwind CSS structure les composants ; les variables `--sp-*` portent le
  contrat visuel partagé.

## Tokens

Familles actuelles :

- surfaces : `--sp-bg-*`, `--sp-surface-*` ;
- textes : `--sp-text-primary`, `--sp-text-secondary`, `--sp-text-muted` ;
- bordures : `--sp-border-subtle`, `--sp-border-strong` ;
- accents et états : `--sp-accent-*`, `--sp-success`, `--sp-warning`,
  `--sp-error`, `--sp-progress` ;
- graphiques : `--sp-chart-1` à `--sp-chart-5`, grille et cible ;
- formes : `--sp-radius-control`, `--sp-radius-card`, `--sp-radius-sheet` ;
- élévation : `--sp-shadow-card`, `--sp-shadow-panel` ;
- interaction : hauteurs de contrôles, `--sp-touch-target`,
  `--sp-focus-ring` ;
- mouvement : durées, courbes et échelle de pression `--sp-*`.

Ne pas coder une nouvelle palette locale lorsqu’un token sémantique existe.

## Typographie et espacement

- La pile système définie par les styles globaux est la référence.
- Les titres restent courts et hiérarchisés ; le corps courant vise une hauteur
  de ligne confortable.
- Les espacements suivent l’échelle Tailwind utilisée dans les composants.
- Les cartes denses réduisent les marges, jamais la cible tactile.

## Composants

- `Card`, `ChoiceCard` : surfaces et choix.
- `Button`, `IconAction`, `SportPilotStatefulButton` : actions et états.
- `BottomSheet`, `ConfirmationDialog` : tâches secondaires et confirmations.
- `ToastProvider`, `useActionToast`, `InlineNotice` : retours.
- `CollapsibleSection`, `SegmentedControl`, `SportPilotAnimatedTabs` :
  divulgation progressive et navigation locale.
- `StickyActionBar` : action principale mobile avec safe area.
- `PageSkeleton`, `EmptyState`, `RefreshStatus`, `SaveStatus` :
  chargement, absence et persistance.
- `SportPilotCharts` : conteneurs, légendes, tableaux de repli et couleurs.
- composants `SportPilot*Reveal` : célébrations exceptionnelles.

## Règles par famille

- **Cartes** : une responsabilité, résumé visible, bordure et rayon partagés.
- **Boutons** : une seule action primaire par zone ; danger réservé aux actions
  destructives.
- **BottomSheets** : poignée/fermeture, titre accessible, focus contenu,
  hauteur limitée et pied en safe area.
- **Modales** : confirmation courte, pas de formulaire long.
- **Toasts** : message autonome, ton sémantique, déduplication et durée adaptée.
- **Bannières** : état persistant nécessitant une action ou une explication.
- **Graphiques** : ne jamais dépendre seulement de la couleur ; fournir résumé
  ou tableau accessible.

## Accessibilité et mouvement réduit

- Focus visible, ARIA explicite et ordre clavier logique.
- Contraste vérifié dans chaque thème clair et sombre.
- `prefers-reduced-motion` est traité dans les feuilles, toasts, transitions,
  thèmes et célébrations.
- Les animations ne conditionnent jamais l’accès au contenu final.

## Validation visuelle

Tester au minimum 320, 360, 393 et 412 px, iPhone/WebKit, texte agrandi,
mode sombre, mouvement réduit, clavier ouvert et safe areas lorsque le
composant est concerné.
