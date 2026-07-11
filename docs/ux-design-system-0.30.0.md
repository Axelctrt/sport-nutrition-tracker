# SportPilot 0.30.0 — Fondations UX et design system

## Périmètre U1

Cette phase formalise les fondations visuelles et interactives communes sans refondre les écrans métier.

Aucun calcul calorique, schéma Dexie, contrat D1, flux social, route ou comportement de synchronisation n’est modifié.

## Audit des primitives 0.29.0

Primitives présentes avant U1 :

- `Button` ;
- `Card` ;
- `FormField` ;
- `EmptyState` ;
- `InlineNotice` ;
- `CollapsibleSection` ;
- `StickyActionBar` ;
- `PageSkeleton` ;
- `ToastProvider` et `ToastViewport` ;
- `ConfirmationDialog`.

Constats principaux :

- la palette de marque et le mode sombre existaient déjà ;
- les espacements, rayons, hauteurs de contrôle, surfaces et ombres n’étaient pas exposés comme tokens communs ;
- la hiérarchie typographique était répétée directement dans les écrans ;
- les boutons n’exposaient pas d’état de chargement standard ;
- les cartes ne proposaient pas de variantes normalisées ;
- `FormField` affichait correctement les textes mais ne pouvait pas transmettre automatiquement les identifiants ARIA à son contrôle ;
- aucun composant partagé ne couvrait les grandes cartes de choix, les métriques, les actions uniquement iconiques, les segments, l’aide contextuelle, le panneau inférieur ou le sélecteur à roue natif ;
- `CollapsibleSection`, `PageSkeleton`, les toasts et la confirmation étaient déjà suffisamment structurés pour rester compatibles pendant U1.

## Tokens CSS

Les tokens sont définis dans `src/styles/index.css` avec le préfixe `--sp-`.

### Mise en page

- `--sp-page-inline` : marge intérieure horizontale responsive ;
- `--sp-page-block` : marge intérieure verticale responsive ;
- `--sp-content-max` : largeur maximale de contenu ;
- `--sp-touch-target` : cible tactile minimale de 44 px.

### Contrôles

- `--sp-control-height-sm` : 44 px ;
- `--sp-control-height-md` : 48 px ;
- `--sp-control-height-lg` : 52 px.

### Rayons

- `--sp-radius-control` ;
- `--sp-radius-card` ;
- `--sp-radius-panel` ;
- `--sp-radius-sheet`.

### Surfaces et textes

- `--sp-surface-page` ;
- `--sp-surface-card` ;
- `--sp-surface-muted` ;
- `--sp-border-subtle` ;
- `--sp-text-primary` ;
- `--sp-text-secondary` ;
- `--sp-text-muted`.

Les valeurs sont redéfinies sous `html.dark`. Les thèmes de récompense existants restent indépendants et compatibles.

## Primitives normalisées

### Button

Ajouts :

- hauteurs conformes aux cibles tactiles ;
- `loading` et `loadingLabel` ;
- `aria-busy` ;
- verrouillage pendant le traitement ;
- `fullWidth` ;
- types exportés.

### Card

Variantes :

- `default` ;
- `muted` ;
- `elevated` ;
- `interactive`.

Espacements :

- `none` ;
- `sm` ;
- `md` ;
- `lg`.

Le comportement historique reste inchangé par défaut : aucune marge intérieure n’est ajoutée sans demande explicite.

### FormField

Le composant accepte toujours un enfant React classique. Il accepte désormais aussi une fonction de rendu recevant :

- `id` ;
- `aria-describedby` ;
- `aria-invalid` ;
- `aria-required`.

Cette forme doit être utilisée progressivement lors des refontes de formulaires afin de relier descriptions et erreurs au contrôle sans dupliquer les identifiants.

### EmptyState

Ajouts :

- tons `brand`, `neutral` et `success` ;
- mode `compact` ;
- conservation des actions primaire et secondaire.

### InlineNotice

Ajout du ton `warning`. Le sens reste exprimé par une icône, un titre et un texte, pas uniquement par la couleur.

### StickyActionBar

Ajouts :

- décalage mobile configurable ;
- libellé ARIA configurable ;
- classe interne configurable ;
- conservation du décalage réservé aux toasts ;
- position desktop statique maintenue.

## Nouvelles primitives

### Typography

- `PageTitle` : titre de page ;
- `SectionTitle` : titre de section ;
- `BodyText` : texte principal ;
- `SecondaryText` : texte secondaire.

Les nombres clés restent volontairement traités dans `MetricCard` afin de pouvoir être plus grands que les quatre niveaux textuels généraux.

### ChoiceCard et ChoiceCardGroup

Cartes tactiles reposant sur des boutons radio natifs :

- navigation clavier native ;
- état sélectionné visible autrement que par la couleur ;
- grande zone tactile ;
- icône, description et badge facultatifs ;
- disposition responsive en une, deux ou trois colonnes.

### MetricCard

Carte pour calories, poids, durée, distance, pas et autres métriques :

- libellé ;
- valeur ;
- unité ;
- texte secondaire ;
- icône ou action ;
- emphase normale ou forte ;
- tons sémantiques.

### IconAction

Bouton iconique avec :

- libellé accessible obligatoire ;
- cible tactile minimale ;
- variantes standard, fantôme et danger ;
- infobulle native via `title`.

### SegmentedControl

Contrôle mono-sélection avec :

- sémantique `radiogroup` ;
- navigation avec les flèches ;
- touches Début et Fin ;
- états désactivés ;
- libellé accessible.

### BottomSheet

Panneau inférieur pour les choix et actions secondaires :

- portail dans `document.body` ;
- blocage du défilement de fond ;
- piège de focus ;
- restauration du focus ;
- fermeture avec Échap et fond lorsque l’action est autorisée ;
- en-tête, description, contenu déroulant et pied facultatif ;
- zone sûre iPhone ;
- animation neutralisée lorsque la réduction des animations est demandée.

Les formulaires longs et tâches structurantes doivent rester des pages complètes.

### ContextHelp

Aide repliable basée sur `details` et `summary`, utilisable pour « Pourquoi cette information ? » sans dépendre de JavaScript.

### WheelPicker

Le composant utilise un `select` natif agrandi, complété par des actions précédent/suivant :

- sur iOS, le système fournit le sélecteur à roue natif ;
- au clavier et avec un lecteur d’écran, le contrôle reste un champ standard ;
- aucune roue personnalisée fragile n’est imposée ;
- les boutons conservent une cible tactile de 44 px.

## Règles d’adoption pour les phases suivantes

- privilégier les nouvelles primitives au lieu de recopier des classes ;
- conserver les services et validations métier existants ;
- ne pas convertir massivement les écrans dans U1 ;
- utiliser `BottomSheet` uniquement pour une décision courte ;
- utiliser une page complète pour une tâche longue ;
- associer les contrôles aux erreurs via la forme fonctionnelle de `FormField` lors de leur refonte ;
- conserver une action visible équivalente à tout geste ;
- tester en priorité 320, 375, 390 et 430 px ;
- vérifier ensuite le desktop ;
- ne pas modifier les règles des toasts avant U10 ;
- ne pas modifier les formules caloriques avant U2A puis U2B validée.

## Éléments volontairement différés

- remplacement des classes dans tous les écrans métier ;
- architecture de navigation ;
- refonte de l’Accueil ;
- refonte des Paramètres ;
- machine à états de l’onboarding ;
- règle « une notification principale à la fois » ;
- états vides de chaque domaine ;
- comportements de suppression et d’annulation ;
- calculs caloriques et macros.

Ces éléments appartiennent aux phases U2, U2A/U2B, U9, U9A et U10.
