# SportPilot 0.20.0

## Synchronisation nutritionnelle multiappareil

SportPilot synchronise désormais, pour le compte connecté :

- les repas et entrées alimentaires ;
- les objectifs nutritionnels quotidiens ;
- les statuts de complétion du journal ;
- les aliments créés manuellement ;
- les produits Open Food Facts réellement utilisés ;
- les recettes et leurs ingrédients ;
- les repas favoris ;
- les bilans nutritionnels hebdomadaires ;
- les ajustements caloriques acceptés.

Chaque domaine conserve une analyse sans écriture et une synchronisation manuelle depuis **Paramètres → Synchronisation des données**.

## Journal nutritionnel atomique

Les données d’une journée sont transférées comme un agrégat cohérent comprenant ses repas, ses entrées, son objectif quotidien et son statut. L’application transactionnelle empêche :

- une entrée sans repas parent ;
- une entrée rattachée à une autre date ou à un autre créneau ;
- l’application partielle d’une journée distante ;
- la résurrection d’un repas ou d’une entrée supprimés.

## Bibliothèque alimentaire cohérente

Les recettes sont synchronisées avec tous leurs ingrédients et les produits nécessaires. Les produits Open Food Facts uniquement mis en cache restent locaux, tandis que les produits utilisés, favoris ou modifiés sont transférés.

Lorsque deux appareils importent indépendamment le même code-barres, SportPilot sélectionne une fiche déterministe et remappe les références du journal, des recettes et des repas favoris sans modifier les valeurs nutritionnelles historiques.

## Bilans et ajustements

Un bilan hebdomadaire et son ajustement éventuel sont synchronisés ensemble. SportPilot refuse les ajustements orphelins, dupliqués ou associés à une décision non acceptée.

Lorsqu’un ajustement distant change le cumul applicable, les objectifs quotidiens déjà enregistrés sont recalculés à partir du profil, des paramètres, du poids, des pas et des activités, puis propagés par la synchronisation du journal.

## Cohérence et conflits

- résolution déterministe par `updatedAt`, puis par valeur stable lorsque les horodatages sont identiques ;
- métadonnées techniques Dexie Cloud exclues des comparaisons ;
- filtrage strict par propriétaire cloud ;
- suppressions propagées par marqueurs durables ;
- restauration possible lorsqu’une donnée modifiée est plus récente qu’un ancien marqueur ;
- absence de doublons après plusieurs synchronisations ;
- espaces locaux physiquement isolés par compte.

## Runtime Dexie Cloud

- base cloud en version 8 ;
- runtime IndexedDB local `sportpilot-sync-runtime-0.20.0-v8` ;
- synchronisation implicite Dexie Cloud désactivée au profit des contrôleurs SportPilot ;
- aucune nouvelle migration de runtime entre C3 et la release C4.

## Compatibilité

- schéma Dexie principal inchangé en v8 ;
- sauvegarde JSON inchangée en v7 ;
- registre des espaces locaux inchangé en v1 ;
- données invitées conservées dans leur espace séparé ;
- récompenses, thèmes, missions et rappels toujours locaux à leur espace.
