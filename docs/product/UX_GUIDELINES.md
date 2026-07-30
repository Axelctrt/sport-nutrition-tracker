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

- Toast de succès pour une action terminée ayant un impact durable.
- Toast ou notice d’erreur avec prochaine action compréhensible.
- Confirmation avant suppression, abandon ou opération difficile à annuler.
- Les écritures fréquentes ne déclenchent pas une succession de toasts.
- Les clés de déduplication doivent représenter l’action métier.

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
