# Guide UX

Statut : **décisions validées** et pratiques actuelles.

## Mobile d’abord

- Concevoir d’abord pour 320 à 412 px, puis enrichir les grands écrans.
- Conserver une cible tactile minimale basée sur `--sp-touch-target`.
- Respecter `env(safe-area-inset-*)` pour navigation, feuilles et actions
  collantes.
- Éviter le débordement horizontal critique, y compris avec texte agrandi.
- Ne jamais dépendre uniquement du survol.

## Hiérarchie

- Une page possède un objectif principal et une action principale identifiable.
- Afficher d’abord les informations nécessaires à la décision.
- Placer les réglages rares dans un repli, un menu ou une feuille.
- Une liste longue utilise des résumés compacts et une ouverture progressive.
- Les libellés visibles peuvent être courts ; le nom accessible reste complet.

## États vides

`EmptyState` distingue quatre contextes sémantiques :

| Variante | Usage |
| --- | --- |
| `first-use` | Aucune donnée n’a encore été créée ; expliquer la valeur et proposer de commencer. |
| `filtered` | Des données existent mais la recherche ou le filtre ne retourne rien ; rassurer et proposer une réinitialisation. |
| `completed` | Le parcours est terminé et aucune action n’est requise ; usage ponctuel uniquement. |
| `unavailable` | Une fonction est temporairement indisponible sans erreur technique détaillée. |

- Un état filtré ne doit jamais laisser croire que les données ont disparu.
- Sur mobile, l’action contextuelle de l’état vide peut remplacer un CTA
  d’en-tête strictement identique ; le raccourci peut rester visible sur grand
  écran.
- Les erreurs techniques détaillées restent généralement des `InlineNotice`.
- Les graphiques vides conservent leurs composants dédiés.
- Ne pas remplacer artificiellement les cartes de progression, révélations ou
  célébrations par une variante `completed`.

## Formulaires

- Conserver les états de saisie intermédiaires (`''`, séparateur décimal,
  composition IME) sans les transformer prématurément.
- La validation finale est stricte et amène le focus sur le premier champ
  invalide.
- Les écritures automatiques affichent un statut discret ; les réussites
  importantes utilisent un toast.
- Ne pas vider une saisie après une erreur réseau.
- Utiliser les composants de `src/shared/forms` et `src/shared/ui`.

## Retours d’action

Choisir un feedback principal selon la continuité du parcours :

- **Action restant sur le même écran** : état du bouton ou notice locale. Le
  résultat doit rester lisible près de l’action.
- **Navigation après réussite** : bouton de chargement pendant l’opération,
  puis toast sur la page de destination.
- **Rechargement nécessaire** : conserver la confirmation avec
  `successAfterReload`.
- **Traitement réellement multi-étapes** : utiliser
  `SportPilotMultiStepLoader` comme progression principale ; ne pas lui ajouter
  un second indicateur de succès concurrent.
- **Erreur corrigeable sur place** : afficher l’erreur localement avec la
  prochaine action. Un toast supplémentaire n’est pas nécessaire si la notice
  reste visible.

Règles permanentes :

- Ne pas cumuler bouton de succès, texte vert et toast pour une même action.
- Toast de succès pour une action terminée ayant un impact durable lorsque le
  contexte local disparaît ou change.
- Toast ou notice d’erreur avec prochaine action compréhensible, jamais les
  deux avec le même message.
- Confirmation avant suppression, abandon ou opération difficile à annuler.
- Les écritures fréquentes ne déclenchent pas une succession de toasts.
- Les clés de déduplication doivent représenter l’action métier.

La demande de persistance du stockage est le pilote de référence pour une
opération locale restant sur la même carte : chargement dans le bouton, puis
une unique `InlineNotice` de succès, d’information ou d’erreur.

## Navigation et overlays

- Les routes restent rechargeables et compatibles avec Retour.
- `BottomSheet` sert aux tâches secondaires mobiles ; une page dédiée reste
  préférable pour un flux long ou profond.
- Les modales et feuilles restaurent le focus, bloquent correctement
  l’arrière-plan et offrent une fermeture explicite.
- Une action sticky ne masque ni le contenu ni la navigation mobile.

## Mouvement

- Le mouvement explique un changement d’état ; il ne retarde pas l’action.
- `prefers-reduced-motion: reduce` supprime les mouvements non essentiels.
- Les célébrations restent ponctuelles, interruptibles et sans perte
  d’information lorsqu’elles sont désactivées.
