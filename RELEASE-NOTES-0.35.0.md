# SportPilot 0.35.0 — feedback unifié et onboarding fluidifié

Branche de publication : `release/0.35.0`

Tag prévu : `v0.35.0`

SportPilot 0.35.0 améliore les parcours quotidiens sans modifier les thèmes validés, les formules du moteur calorique ni le périmètre de l’analyse IA.

## Onboarding et compte

- date de naissance proposée par défaut, avec l’âge disponible comme alternative ;
- validation OTP avec états de préparation et de soumission réels ;
- reprise du brouillon d’onboarding et protection contre les doubles soumissions ;
- passage direct au profil pour un compte neuf ;
- décision explicite lorsqu’un compte contient déjà des données ;
- identité sociale demandée seulement à la première utilisation d’Amis ;
- révélation finale « Tout est prêt » synchronisée avec la création effective du profil.

## Feedback et traitements longs

- feedback d’action unifié avec des toasts pressables, dédupliqués et contextualisés ;
- suppression des confirmations redondantes lorsque le résultat est déjà visible ;
- progression multi-étapes fondée sur les jalons réels de l’import invité et de la restauration cloud ;
- destinations cohérentes après import, restauration et actions terminées.

## Parcours secondaires

- nouvelle chronologie de l’Historique ;
- navigation interne d’Amis structurée entre Fil, Amis, Demandes, Mon profil et Diagnostic ;
- page Rappels plus compacte avec édition dépliable ;
- navigation commune entre Aliments, Recettes, Repas favoris, modèles et exercices ;
- parcours guidés pour les rapports et la restauration de sauvegarde.

## Stabilité et compatibilité

- contention IndexedDB supprimée de la matrice de recette ;
- comportement de saisie et de focus fiabilisé sous WebKit iPhone 15 ;
- 126 scénarios Playwright validés sur Chromium desktop, WebKit iPhone 15 et formats mobiles ;
- mise à jour réelle de la PWA validée avec conservation des données.

## Versions techniques

- application : `0.35.0` ;
- Dexie locale : v11 ;
- sauvegarde JSON : v10 ;
- runtime cloud prototype : v16 ;
- contrat social : `0.29.0-a3`.

Aucune migration Dexie ou D1 n’est ajoutée par cette version. Aucune donnée locale n’est supprimée pendant la mise à jour.
