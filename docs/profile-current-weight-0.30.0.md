# SportPilot 0.30.0 — U7 Poids actuel

## Objectif

Afficher un poids actuel cohérent sans écraser le poids initial historique du profil.

## Règle fonctionnelle

Le poids actuel affiché est :

1. la pesée valide dont la date de mesure est la plus récente ;
2. à défaut, le poids initial enregistré dans le profil.

Une pesée antidatée enrichit l'historique mais ne remplace pas une pesée plus récente. Lorsque la dernière pesée est supprimée, la pesée précédente devient le poids actuel. Si l'historique devient vide, SportPilot revient au poids initial du profil.

Lorsque plusieurs valeurs existent exceptionnellement pour la même date, la valeur modifiée le plus récemment est retenue. Les valeurs dont la date ou le poids sont invalides sont ignorées.

## Réactivité

Le hook `useCurrentWeight` repose sur une requête Dexie réactive. Le résumé du profil est donc actualisé après :

- ajout ou modification d'une pesée ;
- suppression de la dernière pesée ;
- restauration de données ;
- réception d'une modification synchronisée dans la base active.

## Distinction entre les poids

- **Poids initial du profil** : valeur historique renseignée pendant l'onboarding. Elle reste le point de départ de la trajectoire et la valeur de secours des calculs datés existants.
- **Poids actuel** : dernière pesée connue selon la date de mesure. Il est utilisé pour les affichages qui décrivent la situation présente.
- **Poids de référence calorique** : moyenne de la semaine civile précédente lorsque celle-ci existe, sinon poids initial du profil. Cette règle métier n'est pas modifiée par U7.

## Périmètre technique

- service partagé : `src/application/weight/currentWeightService.ts` ;
- lecture réactive : `src/features/weight/hooks/useCurrentWeight.ts` ;
- résumé du profil : `src/features/profile/components/ProfileOverview.tsx` ;
- page Profil : `src/features/profile/pages/ProfilePage.tsx` ;
- résumé de la page Poids : `src/features/weight/components/WeightSummary.tsx` ;
- clarification du champ historique : `src/features/profile/components/ProfileForm.tsx`.

## Compatibilité

- aucune migration Dexie ;
- aucune migration D1 ;
- aucune réécriture des profils existants ;
- aucune modification de la trajectoire historique ;
- aucune modification des formules caloriques ou des macros ;
- aucune modification de version applicative.
