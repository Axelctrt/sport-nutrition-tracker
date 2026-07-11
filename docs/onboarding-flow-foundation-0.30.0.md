# SportPilot 0.30.0 — U2 Fondations du parcours d’onboarding

## Périmètre

Cette phase installe le socle technique du futur onboarding mobile sans modifier les règles métier du profil, les formules énergétiques, les coefficients, les espaces de données ni l’authentification.

Le formulaire historique reste temporairement l’unique étape visible. Les phases U3 à U6 pourront le remplacer progressivement par les écrans dédiés sans reconstruire la gestion d’état, la reprise et la protection contre les doubles soumissions.

## Machine de parcours

`src/features/onboarding/flow/onboardingFlow.ts` fournit des fonctions pures pour :

- initialiser un parcours ordonné ;
- restaurer une étape connue ;
- avancer et revenir sans dépasser les bornes ;
- mémoriser les étapes visitées ;
- mémoriser les étapes terminées ;
- aller vers une étape précise pour les corrections du récapitulatif ;
- bloquer les transitions pendant une soumission ;
- calculer la progression accessible.

`src/features/onboarding/hooks/useOnboardingFlow.ts` ajoute :

- le recentrage du titre après un changement d’étape ;
- le respect de `prefers-reduced-motion` ;
- un verrou synchrone contre la double soumission ;
- les commandes `goBack`, `goNext` et `goTo` ;
- un point d’extension `onStepChange` pour la persistance des futures étapes.

## Brouillon local

Le brouillon est enregistré dans `localStorage` sous la clé versionnée `sportpilot:onboarding:draft:v1`.

L’enveloppe contient uniquement :

- la version du format ;
- l’identifiant de l’étape ;
- les réponses sérialisables ;
- la date de dernière mise à jour.

Un brouillon illisible ou provenant d’une version inconnue est supprimé. Une indisponibilité de `localStorage` n’empêche pas de terminer l’onboarding : l’interface avertit seulement que la reprise après fermeture ne sera pas disponible.

Les codes OTP, jetons, secrets et identifiants techniques ne devront jamais être ajoutés au brouillon lors des phases suivantes.

## Intégration actuelle

L’onboarding existant :

- restaure les valeurs du profil avant le premier rendu ;
- sauvegarde automatiquement les changements sans toast répétitif ;
- affiche un statut discret de sauvegarde ;
- affiche la progression ;
- efface le brouillon après création réussie du profil ;
- conserve la validation Zod, le recentrage du premier champ invalide et l’enregistrement IndexedDB existants.

## Non-objectifs de U2

Cette phase ne réalise pas encore :

- le choix entre mode local et compte ;
- l’email et le code OTP ;
- la résolution de l’espace de données ;
- l’identifiant social obligatoire ;
- le découpage final en une question par écran ;
- les sélecteurs de sexe, date, taille, poids, objectif, activité et pas ;
- le récapitulatif final ;
- une modification du moteur calorique ou des macros.

## Compatibilité et migrations

- aucune migration Dexie ;
- aucune migration D1 ;
- aucune modification de version ;
- aucune route modifiée ;
- aucun changement de format du profil métier ;
- aucun secret ajouté au dépôt.
