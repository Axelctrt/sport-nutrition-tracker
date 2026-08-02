# SportPilot 0.37.0 - photos de progression et ajustements UX

Branche : `release/0.37.0`

Base de la candidate : `origin/develop` au commit `0d1d60592b6c150ca274e8fb5dca52416c02a90f`.

## Nouveautés

- photos de progression privées et locales, avec date, vue, poids et note facultatifs ;
- galerie et comparateur tactile avant/après ;
- export et restauration d’une archive photo séparée ;
- choix de photo simplifié via le sélecteur natif ;
- fermeture du sélecteur d’exercices ;
- disponibilité automatique de l’identifiant public et choix visuellement sélectionnés ;
- carte Sport journalière compacte ;
- calories et trois macronutriments sur l’Accueil ;
- fondations UX partagées et feedbacks asynchrones cohérents.

## Garanties

- aucune synchronisation cloud des photos ;
- aucune publication sociale des photos ;
- aucune analyse corporelle par IA ;
- aucune inclusion des photos dans la sauvegarde JSON générale ;
- aucune modification des formules caloriques ;
- migration locale additive de Dexie v11 vers v12 ;
- aucune migration D1 ajoutée ou requise ;
- compatibilité Chromium, WebKit et PWA, y compris hors ligne après un premier chargement ;
- isolation des données entre espace invité, profil local et compte cloud.

Le périmètre social n’ajoute aucun annuaire public, likes, commentaires, messagerie ou export d’activité brute.

## Stockage

Dexie v12 ajoute uniquement `progressPhotos` et `progressPhotoAssets`. L’écriture des métadonnées et actifs est atomique. Les actifs sont stockés sous forme d’`ArrayBuffer`, rematérialisés en `Blob` à la lecture, et les anciennes lignes contenant directement des `Blob` restent acceptées. La sauvegarde JSON générale reste en v10 et le runtime cloud en v16.

## Point non bloquant connu

Le statut de disponibilité de l’identifiant public reste affiché sous les actions. Il sera rapproché du champ de saisie lors d’une prochaine passe UX, sans bloquer cette candidate.

## Publication

Aucun tag ni déploiement de production n’est réalisé. La branche est proposée dans une pull request brouillon vers `develop`; le passage ultérieur de `develop` vers `main`, le tag, la release GitHub et la production nécessitent chacun une autorisation séparée.
